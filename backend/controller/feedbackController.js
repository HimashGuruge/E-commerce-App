import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Feedback from "../models/Feedback.js";
import Product from "../models/Product.js";
import ReturnRequest from "../models/ReturnRequest.js";
import Order from "../models/Order.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import SiteConfig from "../models/SiteConfig.js";

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

  // Create return request
  const returnRequest = await ReturnRequest.create({
    order,
    user: req.user._id,
    items,
    status: "pending",
    shippingCostPaidBy: shippingConfig.shippingCostPaidBy || "customer",
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
    .populate("items.product", "name images")
    .populate("items.variant", "sku price")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await ReturnRequest.countDocuments(query);

  res.json({
    success: true,
    returns,
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

  res.json({ success: true, returnRequest, message: "Return request rejected" });
});

export const processRefund = asyncHandler(async (req, res) => {
  const { refundAmount, restockingFee, returnLabelUrl } = req.body;

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

  // Deduct stock for returned items
  for (const item of returnRequest.items) {
    if (item.variant) {
      await mongoose.model("Variant").findByIdAndUpdate(item.variant, { $inc: { stock: item.quantity } });
    } else {
      await mongoose.model("Product").findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }
  }

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

  res.json({ success: true, returnRequest, message: "Return completed and refunded" });
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

  res.status(201).json({ success: true, feedback });
});

export const submitFeedback = asyncHandler(async (req, res) => {
  const { productId, rating, comment, images } = req.body;
  const feedback = await Feedback.create({
    user: req.user._id,
    product: productId,
    rating,
    comment,
    images,
    status: "pending",
  });

  await updateProductRating(productId);

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

  res.json({ success: true, message: "Feedback deleted" });
});

export const adminDeleteFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findByIdAndDelete(req.params.id);
  if (!feedback) {
    res.status(404);
    throw new Error("Feedback not found");
  }

  await updateProductRating(feedback.product);

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
