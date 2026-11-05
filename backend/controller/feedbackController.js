import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Feedback from "../models/Feedback.js";
import Product from "../models/Product.js";
import ReturnRequest from "../models/ReturnRequest.js";
import Order from "../models/Order.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import SiteConfig from "../models/SiteConfig.js";
import { recalcParentStock } from "./productVariantController.js";
import { emitToAdmins, emitToUser } from "../services/socketService.js";
import { notifyBrandStatsChanged, notifyReturnToSellers } from "../services/sellerMessagingService.js";
import { markRemindersSubmitted, hasFullyReturnedItem } from "../services/reviewReminderService.js";
import { createReversalForReturn } from "../services/payoutService.js";
// After restocking returned items, sync the owning parent products' totals
const resyncParentsForItems = async (items) => {
  const parentIds = new Set();
  for (const item of items) {
    if (item.variant) {
      const variant = await mongoose.model("Variant").findById(item.variant);
      if (variant?.parentProduct) parentIds.add(String(variant.parentProduct));
    }
  }
  for (const parentId of parentIds) {
    await recalcParentStock(parentId);
  }
};

// ========== HELPER: Sync Product Rating ==========

const updateProductRating = async (productId) => {
  const stats = await Feedback.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), status: "approved" } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await Product.findByIdAndUpdate(productId, {
    rating: stats[0]?.avg || 0,
    numReviews: stats[0]?.count || 0,
  });
};

// ========== RETURN REQUEST CONTROLLERS ==========

export const initiateReturn = asyncHandler(async (req, res) => {
  const { order, items } = req.body;

  if (!order || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "Order and items are required" });
  }

  // Verify order exists and belongs to user
  const orderDoc = await Order.findById(order);
  if (!orderDoc) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  if (orderDoc.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "Unauthorized to initiate return for this order" });
  }

  // Verify order status is delivered or processing
  if (!["delivered", "processing"].includes(orderDoc.orderStatus)) {
    return res.status(400).json({ success: false, message: "Order must be delivered or in processing status to request return" });
  }

  // Check if return already exists for this order
  const existingReturn = await ReturnRequest.findOne({ order: order, user: req.user._id });
  if (existingReturn) {
    return res.status(400).json({ success: false, message: "A return request already exists for this order" });
  }

  // Get shipping config
  const shippingConfig = await SiteConfig.findOne()?.shipping || { shippingCostPaidBy: "customer" };

  // Work out the refund amount from the order item prices (unit price x
  // returned quantity, matched by product + variant).
  const orderItemMap = new Map();
  for (const oi of orderDoc.items || []) {
    orderItemMap.set(`${oi.product || ""}|${oi.variant || ""}`, oi);
  }
  let refundAmount = 0;
  for (const ri of items) {
    const oi = orderItemMap.get(`${ri.product || ""}|${ri.variant || ""}`);
    if (oi) refundAmount += (Number(oi.price) || 0) * (Number(ri.quantity) || 0);
  }

  // Create return request
  const returnRequest = await ReturnRequest.create({
    order,
    user: req.user._id,
    items,
    status: "pending",
    shippingCostPaidBy: shippingConfig.shippingCostPaidBy || "customer",
    refundAmount,
  });

  // Notify admin
  try {
    const admins = await User.find({ role: "admin" });
    const messageText = `New return request #${returnRequest._id} for order #${orderDoc._id}`;
    for (const admin of admins) {
      await Message.create({
        sender: req.user._id,
        message: messageText,
        senderType: "user",
        isAdmin: false,
        adminRead: false,
        userRead: true,
      });
    }
  } catch (err) {
    console.error("Failed to notify admins of return request:", err);
  }

  // Real-time: refresh the admin returns panel + pending badge
  emitToAdmins("returns:new", { returnId: returnRequest._id, orderId: order });

  // Notify the seller(s) whose products are being returned (live inbox ping)
  await notifyReturnToSellers(returnRequest, {
    text: `New return request #${String(returnRequest._id).slice(-8)} for order #${String(orderDoc._id).slice(-8)} — check your Returns tab.`,
    senderId: req.user._id,
    senderType: "user",
  });

  res.status(201).json({ success: true, returnRequest });
});

export const getReturnRequests = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;
  let query = {};

  if (status && ["pending", "approved", "rejected", "processing", "shipped", "completed", "refunded"].includes(status)) {
    query.status = status;
  }

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const returns = await ReturnRequest.find(query)
    .populate("order", "orderStatus paymentStatus totalPrice items")
    .populate("user", "name email phone")
    .populate("items.product", "name images seller")
    .populate("items.product.seller", "name email")
    .populate("items.variant", "sku price")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await ReturnRequest.countDocuments(query);

  // Collect the unique seller(s) per return so the admin panel can show who
  // is involved and let them send a message to a specific seller.
  const rows = (returns || []).map((r) => {
    // Convert the Mongoose document to a plain object first. Spreading a
    // document directly would only expose its internal keys ($__, _doc, ...)
    // and drop the real fields (_id, items, user, ...).
    const doc = r.toObject({ virtuals: false });
    const sellerMap = new Map();
    for (const item of doc.items || []) {
      const s = item?.product?.seller;
      if (s?._id && !sellerMap.has(String(s._id))) sellerMap.set(String(s._id), s);
    }
    const sellers = [...sellerMap.values()].map((s) => ({
      id: String(s._id),
      name: s.name,
      email: s.email,
    }));
    return { ...doc, sellers };
  });

  res.json({
    success: true,
    returns: rows,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  });
});

export const getReturnRequestById = asyncHandler(async (req, res) => {
  const returnRequest = await ReturnRequest.findById(req.params.id)
    .populate("order", "orderStatus paymentStatus totalPrice shippingAddress")
    .populate("user", "name email phone")
    .populate("items.product", "name images")
    .populate("items.variant", "sku price");

  if (!returnRequest) {
    res.status(404);
    throw new Error("Return request not found");
  }

  res.json({ success: true, returnRequest });
});

export const approveReturn = asyncHandler(async (req, res) => {
  const { notes } = req.body;

  const returnRequest = await ReturnRequest.findOneAndUpdate(
    { _id: req.params.id },
    { status: "approved", notes, approvedAt: new Date() },
    { new: true }
  );

  if (!returnRequest) {
    res.status(404);
    throw new Error("Return request not found");
  }

  // Notify user
  try {
    const messageText = `Your return request #${returnRequest._id} has been approved`;
    await Message.create({
      sender: req.user._id,
      message: messageText,
      senderType: "user",
      isAdmin: false,
      adminRead: false,
      userRead: true,
    });
  } catch (err) {
    console.error("Failed to notify user of approval:", err);
  }

  // Real-time: refresh admin panel + customer + seller surfaces
  emitToAdmins("returns:updated", { returnId: returnRequest._id, status: returnRequest.status });
  emitToUser(returnRequest.user, "return:updated", { returnId: returnRequest._id, status: returnRequest.status });

  // Notify the seller(s) so they can prepare the items for return
  await notifyReturnToSellers(returnRequest, {
    text: `Your return request #${String(returnRequest._id).slice(-8)} has been APPROVED — prepare to receive the returned item(s).`,
    senderId: req.user._id,
    senderType: "admin",
  });

  res.json({ success: true, returnRequest, message: "Return request approved" });
});

export const rejectReturn = asyncHandler(async (req, res) => {
  const { rejectionReason } = req.body;

  if (!rejectionReason || rejectionReason.trim() === "") {
    return res.status(400).json({ success: false, message: "Rejection reason is required" });
  }

  const returnRequest = await ReturnRequest.findOneAndUpdate(
    { _id: req.params.id },
    { status: "rejected", rejectionReason, rejectedAt: new Date(), notes: `Return rejected: ${rejectionReason}` },
    { new: true }
  );

  if (!returnRequest) {
    res.status(404);
    throw new Error("Return request not found");
  }

  // Notify user
  try {
    const messageText = `Your return request #${returnRequest._id} has been rejected: ${rejectionReason}`;
    await Message.create({
      sender: req.user._id,
      message: messageText,
      senderType: "user",
      isAdmin: false,
      adminRead: false,
      userRead: true,
    });
  } catch (err) {
    console.error("Failed to notify user of rejection:", err);
  }

  // Real-time: refresh admin panel + customer + seller surfaces
  emitToAdmins("returns:updated", { returnId: returnRequest._id, status: returnRequest.status });
  emitToUser(returnRequest.user, "return:updated", { returnId: returnRequest._id, status: returnRequest.status });

  // Notify the seller(s)
  await notifyReturnToSellers(returnRequest, {
    text: `Return request #${String(returnRequest._id).slice(-8)} was REJECTED — reason: ${rejectionReason}`,
    senderId: req.user._id,
    senderType: "admin",
  });

  res.json({ success: true, returnRequest, message: "Return request rejected" });
});

export const processRefund = asyncHandler(async (req, res) => {
  let { refundAmount, restockingFee, returnLabelUrl } = req.body;

  // Load the return first so we can fall back to the order's item prices
  // when the request has no stored refundAmount (older returns).
  const existing = await ReturnRequest.findById(req.params.id);
  if (!existing) {
    res.status(404);
    throw new Error("Return request not found");
  }

  if (!refundAmount || refundAmount <= 0) {
    if (existing.refundAmount > 0) {
      refundAmount = existing.refundAmount;
    } else if (existing.order) {
      // Prefer the order's own item prices (a snapshot of what was paid).
      const orderDoc = await Order.findById(existing.order);
      const orderItemMap = new Map();
      for (const oi of orderDoc?.items || []) {
        orderItemMap.set(`${oi.product || ""}|${oi.variant || ""}`, oi);
      }
      for (const ri of existing.items || []) {
        const oi = orderItemMap.get(`${ri.product || ""}|${ri.variant || ""}`);
        if (oi) refundAmount = (refundAmount || 0) + (Number(oi.price) || 0) * (Number(ri.quantity) || 0);
      }
    }
    // Last resort: use the current product/variant price (e.g. returns whose
    // order no longer exists).
    if (!refundAmount || refundAmount <= 0) {
      const productIds = [...new Set((existing.items || []).map((i) => i.product).filter(Boolean))];
      const variantIds = [...new Set((existing.items || []).map((i) => i.variant).filter(Boolean))];
      const products = await Product.find({ _id: { $in: productIds } }).select("price");
      const variants = variantIds.length
        ? await mongoose.model("Variant").find({ _id: { $in: variantIds } }).select("price")
        : [];
      const pMap = new Map(products.map((p) => [String(p._id), p.price]));
      const vMap = new Map(variants.map((v) => [String(v._id), v.price]));
      for (const ri of existing.items || []) {
        const price = ri.variant ? (vMap.get(String(ri.variant)) ?? 0) : (pMap.get(String(ri.product)) ?? 0);
        refundAmount = (refundAmount || 0) + Number(price || 0) * (Number(ri.quantity) || 0);
      }
    }
  }

  if (!refundAmount || refundAmount <= 0) {
    return res.status(400).json({ success: false, message: "Valid refund amount is required" });
  }

  const returnRequest = await ReturnRequest.findOneAndUpdate(
    { _id: req.params.id },
    {
      status: "processing",
      refundAmount,
      restockingFee: restockingFee || 0,
      returnLabelUrl,
      processedAt: new Date(),
    },
    { new: true }
  );

  if (!returnRequest) {
    res.status(404);
    throw new Error("Return request not found");
  }

  // Restock returned items
  for (const item of returnRequest.items) {
    if (item.variant) {
      await mongoose.model("Variant").findByIdAndUpdate(item.variant, { $inc: { stock: item.quantity } });
    } else {
      await mongoose.model("Product").findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }
  }

  await resyncParentsForItems(returnRequest.items);

  // Real-time: refresh admin panel + customer + seller surfaces
  emitToAdmins("returns:updated", { returnId: returnRequest._id, status: returnRequest.status });
  emitToUser(returnRequest.user, "return:updated", { returnId: returnRequest._id, status: returnRequest.status });

  // Notify the seller(s)
  await notifyReturnToSellers(returnRequest, {
    text: `Return #${String(returnRequest._id).slice(-8)} is now in REFUND PROCESSING (Rs. ${refundAmount.toLocaleString()}). Stock for the returned items has been restored.`,
    senderId: req.user._id,
    senderType: "admin",
  });

  res.json({ success: true, returnRequest, message: "Refund processing initiated" });
});

export const completeReturn = asyncHandler(async (req, res) => {
  const { refundMethod } = req.body; // 'stripe', 'manual'

  const returnRequest = await ReturnRequest.findOneAndUpdate(
    { _id: req.params.id },
    {
      status: "refunded",
      refundedAt: new Date(),
      refundMethod,
    },
    { new: true }
  );

  if (!returnRequest) {
    res.status(404);
    throw new Error("Return request not found");
  }

  // If Stripe refund, call Stripe API (placeholder for now)
  if (refundMethod === "stripe" && returnRequest.refundAmount > 0) {
    try {
      // TODO: Implement actual Stripe refund here
      console.log(`Processing Stripe refund of ${returnRequest.refundAmount} for return #${returnRequest._id}`);
    } catch (err) {
      console.error("Failed to process Stripe refund:", err);
      // Still mark as refunded even if Stripe fails temporarily
    }
  }

  // COD ledger: record an idempotent, verifiable reversal linked to the
  // original collection (one row per return request, guarded by a unique
  // index). Paid payouts are never touched — the reversal is picked up by
  // the admin in a future batch.
  try {
    const codOrder = await Order.findById(returnRequest.order).select("paymentMethod");
    if (codOrder?.paymentMethod === "cod") {
      await createReversalForReturn(returnRequest._id, returnRequest.refundAmount, req.user._id);
    }
  } catch (revErr) {
    console.error(`[Payout] COD reversal failed for return ${returnRequest._id}:`, revErr.message);
  }

  // Real-time: refresh admin panel + customer + seller surfaces
  emitToAdmins("returns:updated", { returnId: returnRequest._id, status: returnRequest.status });
  emitToUser(returnRequest.user, "return:updated", { returnId: returnRequest._id, status: returnRequest.status });

  // Notify the seller(s) — return flow complete
  await notifyReturnToSellers(returnRequest, {
    text: `Return #${String(returnRequest._id).slice(-8)} is COMPLETE — refund of Rs. ${(returnRequest.refundAmount || 0).toLocaleString()} has been processed to the customer.`,
    senderId: req.user._id,
    senderType: "admin",
  });

  res.json({ success: true, returnRequest, message: "Return completed and refunded" });
});

// @desc    Admin sends a message to the seller(s) about a return request
// @route   POST /api/feedback/returns/:id/message  { sellerId?, message }
// If sellerId is given the message goes to that seller only; otherwise it
// goes to every seller whose products are in the return.
export const messageSellerAboutReturn = asyncHandler(async (req, res) => {
  const { message, sellerId } = req.body;
  if (!message || !String(message).trim()) {
    return res.status(400).json({ success: false, message: "Message is required" });
  }

  const returnRequest = await ReturnRequest.findById(req.params.id);
  if (!returnRequest) {
    res.status(404);
    throw new Error("Return request not found");
  }

  const productIds = (returnRequest.items || [])
    .map((i) => (i.product ? String(i.product) : null))
    .filter(Boolean);
  let sellerIds = [];
  if (productIds.length) {
    const sellers = await Product.find({ _id: { $in: productIds } }).select("seller").lean();
    sellerIds = [...new Set(sellers.map((s) => s.seller && String(s.seller)).filter(Boolean))];
  }
  if (sellerId) sellerIds = sellerIds.filter((id) => id === String(sellerId));
  if (!sellerIds.length) {
    return res.status(400).json({ success: false, message: "No seller found for this return" });
  }

  let sent = 0;
  for (const sid of sellerIds) {
    await Message.create({
      sender: req.user._id,
      recipient: sid,
      message: String(message).trim(),
      senderType: "admin",
      isAdmin: true,
      orderRef: returnRequest.order,
      returnRef: returnRequest._id,
      sellerRead: false,
      adminRead: true,
    });
    emitToUser(sid, "seller:new-message", { id: returnRequest._id, returnRef: String(returnRequest._id) });
    sent += 1;
  }

  res.json({ success: true, message: `Message sent to ${sent} seller(s)`, sent });
});

// @desc    Customer's own return requests (for the order-detail status card)
// @route   GET /api/feedback/returns/my
export const getMyReturns = asyncHandler(async (req, res) => {
  const { orderId } = req.query;
  const query = { user: req.user._id };
  if (orderId && mongoose.isValidObjectId(orderId)) query.order = orderId;

  const returns = await ReturnRequest.find(query)
    .sort({ createdAt: -1 })
    .limit(20);

  res.json({ success: true, returns });
});

// ========== END RETURN CONTROLLERS ==========


export const createFeedback = asyncHandler(async (req, res) => {
  const { product, order, rating, comment, images } = req.body;
  const feedback = await Feedback.create({
    user: req.user._id,
    product,
    order,
    rating,
    comment,
    images,
     status: "pending",
   });

   // Real-time: refresh admin pending-feedback badge without HTTP polling
   emitToAdmins("admin:stats-changed", { orderId: feedback._id, type: "feedback" });

   // Real-time: refresh the product page's Seller Information block
   const fbProduct = await Product.findById(feedback.product).select("brand").lean();
   notifyBrandStatsChanged([fbProduct?.brand]);

   res.status(201).json({ success: true, feedback });
});

export const submitFeedback = asyncHandler(async (req, res) => {
  const { productId, rating, comment, images } = req.body;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400);
    throw new Error("Valid productId is required");
  }
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    res.status(400);
    throw new Error("Rating must be an integer from 1 to 5");
  }
  if (!comment || !String(comment).trim()) {
    res.status(400);
    throw new Error("Comment is required");
  }

  // Verified purchase: a qualifying DELIVERED order containing the product.
  // The frontend is never trusted for verification.
  const qualifyingOrder = await Order.findOne({
    user: req.user._id,
    orderStatus: "delivered",
    "items.product": productId,
  });
  if (!qualifyingOrder) {
    res.status(403);
    throw new Error("You can only review products you have purchased and received");
  }

  // A fully returned/refunded item does not qualify for a review.
  const orderItem = qualifyingOrder.items.find(
    (i) => String(i.product) === String(productId)
  );
  if (orderItem && (await hasFullyReturnedItem(qualifyingOrder, orderItem))) {
    res.status(403);
    throw new Error("This item was returned, so it cannot be reviewed");
  }

  // One review per customer per product (policy), enforced server-side.
  const existing = await Feedback.findOne({
    user: req.user._id,
    product: productId,
  }).sort({ createdAt: 1 });
  if (existing) {
    res.status(409);
    throw new Error("You have already reviewed this product");
  }

  let feedback;
  try {
    feedback = await Feedback.create({
      user: req.user._id,
      product: productId,
      order: qualifyingOrder._id,
      rating: r,
      comment,
      images: Array.isArray(images) ? images : [],
      status: "approved",
      isVerifiedPurchase: true,
    });
  } catch (err) {
    // Lost a concurrent insert race: the unique (user, product) index
    // rejected it. Same outcome as the 409 pre-check above.
    if (err?.code === 11000) {
      res.status(409);
      throw new Error("You have already reviewed this product");
    }
    throw err;
  }

  await updateProductRating(productId);
  // Completing the review closes its reminder (reading ≠ completing).
  await markRemindersSubmitted(qualifyingOrder._id);

  // Real-time: refresh the admin feedback page without HTTP polling
  emitToAdmins("admin:stats-changed", { orderId: feedback._id, type: "feedback" });

  res.status(201).json({ success: true, feedback });
});

export const editFeedback = asyncHandler(async (req, res) => {
  const { rating, comment, images } = req.body;
  const feedback = await Feedback.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { rating, comment, images, status: "pending" },
    { new: true }
  );
  if (!feedback) {
    res.status(404);
    throw new Error("Feedback not found");
  }

  await updateProductRating(feedback.product);

  // Real-time: refresh the product page's Seller Information block
  const editedProduct = await Product.findById(feedback.product).select("brand").lean();
  notifyBrandStatsChanged([editedProduct?.brand]);

  res.json({ success: true, feedback, message: "Your review has been submitted for re-approval" });
});

export const getFeedback = asyncHandler(async (req, res) => {
  const { productId, status, userId, sortBy, sortOrder, page, limit } = req.query;
  let query = {};
  if (productId && mongoose.Types.ObjectId.isValid(productId)) query.product = productId;
  if (status === "active") query.status = "approved";
  else if (status) query.status = status;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) query.user = userId;

  const sortOptions = {};
  if (sortBy === "helpful") sortOptions.helpful = sortOrder === "asc" ? 1 : -1;
  else sortOptions.createdAt = sortOrder === "asc" ? 1 : -1;

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const feedback = await Feedback.find(query)
    .populate("user", "name profileImage")
    .populate("product", "name images")
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum);

  const total = await Feedback.countDocuments(query);
  res.json({ success: true, feedback, total, page: pageNum, pages: Math.ceil(total / limitNum) });
});

export const getFeedbackById = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id).populate("user", "name profileImage");
  if (!feedback) {
    res.status(404);
    throw new Error("Feedback not found");
  }
  res.json({ success: true, feedback });
});

export const updateFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true }
  );
  if (!feedback) {
    res.status(404);
    throw new Error("Feedback not found");
  }

  // Real-time: refresh the admin feedback page without HTTP polling
  emitToAdmins("admin:stats-changed", { orderId: feedback._id, type: "feedback" });

  res.json({ success: true, feedback });
});

export const deleteFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!feedback) {
    res.status(404);
    throw new Error("Feedback not found");
  }

  await updateProductRating(feedback.product);

  // Real-time: refresh the product page's Seller Information block
  const deletedProduct = await Product.findById(feedback.product).select("brand").lean();
  notifyBrandStatsChanged([deletedProduct?.brand]);

  res.json({ success: true, message: "Feedback deleted" });
});

export const adminDeleteFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findByIdAndDelete(req.params.id);
  if (!feedback) {
    res.status(404);
    throw new Error("Feedback not found");
  }

  await updateProductRating(feedback.product);

  // Real-time: refresh the product page's Seller Information block
  const adminDeletedProduct = await Product.findById(feedback.product).select("brand").lean();
  notifyBrandStatsChanged([adminDeletedProduct?.brand]);

  // Real-time: refresh the admin feedback page without HTTP polling
  emitToAdmins("admin:stats-changed", { orderId: feedback._id, type: "feedback" });

  res.json({ success: true, message: "Feedback deleted" });
});

export const adminApproveFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findByIdAndUpdate(
    req.params.id,
    { status: "approved" },
    { new: true }
  );
  if (!feedback) {
    res.status(404);
    throw new Error("Feedback not found");
  }

  await updateProductRating(feedback.product);

  // Real-time: refresh the product page's Seller Information block
  const approvedProduct = await Product.findById(feedback.product).select("brand").lean();
  notifyBrandStatsChanged([approvedProduct?.brand]);

  // Real-time: refresh the admin feedback page without HTTP polling
  emitToAdmins("admin:stats-changed", { orderId: feedback._id, type: "feedback" });

  res.json({ success: true, feedback });
});

export const markHelpful = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) {
    res.status(404);
    throw new Error("Feedback not found");
  }
  if (!feedback.helpful.includes(req.user._id)) {
    feedback.helpful.push(req.user._id);
    await feedback.save();
  }
  res.json({ success: true, feedback });
});

export const unmarkHelpful = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) {
    res.status(404);
    throw new Error("Feedback not found");
  }
  feedback.helpful = feedback.helpful.filter(
    (id) => id.toString() !== req.user._id.toString()
  );
  await feedback.save();
  res.json({ success: true, feedback });
});

export const getProductRating = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.productId)) {
    return res.json({ success: true, rating: 0, count: 0 });
  }
  const stats = await Feedback.aggregate([
    { $match: { product: req.params.productId, status: "approved" } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  res.json({
    success: true,
    rating: stats[0]?.avg || 0,
    count: stats[0]?.count || 0,
  });
});

export const getProductRatingDistribution = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.productId)) {
    return res.json({ success: true, data: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  }
  const distribution = await Feedback.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(req.params.productId), status: "approved" } },
    { $group: { _id: "$rating", count: { $sum: 1 } } },
  ]);
  const result = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distribution.forEach((d) => { result[d._id] = d.count; });
  res.json({ success: true, data: result });
});

export const getFeedbackStats = asyncHandler(async (req, res) => {
  const stats = await Feedback.aggregate([
    { $match: { status: "approved" } },
    { $group: { _id: "$rating", count: { $sum: 1 } } },
  ]);
  res.json({ success: true, stats });
});
