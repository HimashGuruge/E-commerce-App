import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Seller from "../models/Seller.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import Notification from "../models/Notification.js";
import Feedback from "../models/Feedback.js";
import { emitToAdmins, emitToUser } from "../services/socketService.js";
import { notifyBrandStatsChanged } from "../services/sellerMessagingService.js";
import { notifyAdminsOfSellerEvent } from "./notificationController.js";
import logger from "../utils/logger.js";
import { ensureCODCollection } from "../services/payoutService.js";

// @desc    Apply to become a seller
// @route   POST /api/sellers/register
export const registerSeller = asyncHandler(async (req, res) => {
  const existing = await Seller.findOne({ user: req.user._id });
  if (existing) {
    res.status(400);
    throw new Error("You already have a seller account");
  }

  const { shopName, businessType, ownerName, ownerPhone, ...rest } = req.body;
  if (!shopName || !ownerName || !ownerPhone) {
    res.status(400);
    throw new Error("Shop name, owner name, and phone are required");
  }

  const seller = await Seller.create({
    user: req.user._id,
    shopName,
    businessType: businessType || "individual",
    ownerName,
    ownerPhone,
    ...rest,
  });

  await User.findByIdAndUpdate(req.user._id, { role: "seller" });

  // Real-time: refresh admin pending-seller badge without HTTP polling
  emitToAdmins("admin:stats-changed", { orderId: seller._id, type: "seller" });

  // Notify admins in their Notification center (pending-seller badge + feed)
  notifyAdminsOfSellerEvent(req.user, `New seller application: "${shopName}" (owner: ${ownerName}, ${ownerPhone})`);

  res.status(201).json({ success: true, seller });
});

// @desc    Get seller's own profile
// @route   GET /api/sellers/me
export const getMySellerProfile = asyncHandler(async (req, res) => {
  const seller = await Seller.findOne({ user: req.user._id });
  if (!seller) {
    res.status(404);
    throw new Error("Seller profile not found");
  }
  res.json({ success: true, seller });
});

// @desc    Update seller profile
// @route   PUT /api/sellers/me
export const updateSellerProfile = asyncHandler(async (req, res) => {
  const seller = await Seller.findOne({ user: req.user._id });
  if (!seller) {
    res.status(404);
    throw new Error("Seller profile not found");
  }

  const allowed = [
    "shopName", "shopDescription", "shopLogo", "shopBanner",
    "businessType", "registrationNumber", "ownerName", "ownerPhone",
    "ownerNic", "ownerAddress", "warehouseAddress", "returnAddress",
    "bankName", "bankAccountTitle", "bankAccountNo", "bankBranch", "bankChequeImage",
  ];

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) seller[field] = req.body[field];
  });

  const updated = await seller.save();

  // Real-time: refresh the admin seller list without HTTP polling
  emitToAdmins("admin:stats-changed", { orderId: seller._id, type: "seller" });

  res.json({ success: true, seller: updated });
});

// @desc    Get seller dashboard stats
// @route   GET /api/sellers/dashboard
export const getSellerDashboard = asyncHandler(async (req, res) => {
  const seller = await Seller.findOne({ user: req.user._id });
  if (!seller) {
    res.status(404);
    throw new Error("Seller profile not found");
  }

  const myProducts = await Product.find({ seller: req.user._id });
  const productIds = myProducts.map((p) => p._id);
  const totalProducts = myProducts.length;
  const activeProducts = myProducts.filter((p) => p.status === "active").length;
  const pendingApproval = myProducts.filter((p) => !p.approvedByAdmin).length;

  const myOrders = await Order.find({ "items.product": { $in: productIds } }).sort({ createdAt: -1 }).limit(20);
  const totalOrders = await Order.countDocuments({ "items.product": { $in: productIds } });
  // All of the seller's order ids (not just the 20 shown) — same scope rules
  // as getSellerMessages / the seller Messages page.
  const allSellerOrders = await Order.find({ "items.product": { $in: productIds } }).select("_id").lean();
  const orderIds = allSellerOrders.map((o) => o._id);

  // Real rating: average of approved Feedback records on this seller's products.
  // Same aggregation pattern as feedbackController.updateProductRating.
  // -> null (UI shows "N/A") when there are no approved reviews yet.
  const ratingStats = await Feedback.aggregate([
    { $match: { product: { $in: productIds }, status: "approved" } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const rating = ratingStats.length ? Math.round(ratingStats[0].avg * 10) / 10 : null;
  const numRatings = ratingStats.length ? ratingStats[0].count : 0;

  // Chat response rate: % of distinct buyers who messaged the seller on the
  // seller's orders (orderRef scope, same rules as getSellerMessages) that
  // received at least one reply from the seller.
  // -> null (UI shows "N/A") when the seller has received no buyer messages.
  const buyerBuyers = new Set();
  const repliedBuyers = new Set();
  if (orderIds.length) {
    const incoming = await Message.find({
      $and: [{ orderRef: { $in: orderIds } }, { senderType: "user" }, { sender: { $ne: req.user._id } }],
    }).select("sender");
    incoming.forEach((m) => m.sender && buyerBuyers.add(m.sender.toString()));
    const replies = await Message.find({
      sender: req.user._id,
      recipient: { $in: [...buyerBuyers] },
    }).select("recipient");
    replies.forEach((m) => m.recipient && repliedBuyers.add(m.recipient.toString()));
  }
  const chatResponseRate = buyerBuyers.size
    ? Math.round((repliedBuyers.size / buyerBuyers.size) * 100)
    : null;

  // Ship on time: N/A. The Order schema has no shippedAt / expected-deadline
  // fields, so a reliable "shipped within deadline" percentage cannot be
  // computed from current data (per requirement: show N/A, don't fabricate).
  const shipOnTime = null;
  const pendingOrders = myOrders.filter((o) => o.orderStatus === "pending" || o.orderStatus === "processing").length;

  let totalRevenue = 0;
  myOrders.forEach((o) => {
    if (o.paymentStatus === "paid") {
      o.items.forEach((item) => {
        if (productIds.some((pid) => pid.toString() === (item.product?.toString() || ""))) {
          totalRevenue += (item.price || 0) * (item.quantity || 0);
        }
      });
    }
  });

  res.json({
    success: true,
    stats: {
      totalProducts,
      activeProducts,
      pendingApproval,
      totalOrders,
      pendingOrders,
      totalRevenue,
      availableBalance: seller.availableBalance,
      totalEarnings: seller.totalEarnings,
      rating,
      numRatings,
      shipOnTime,
      chatResponseRate,
    },
    recentOrders: myOrders.slice(0, 5),
  });
});

// @desc    Get seller's products
// @route   GET /api/sellers/products
export const getSellerProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ seller: req.user._id }).populate("variants").sort({ createdAt: -1 });
  const formatted = products.map((p) => ({
    ...p.toObject(),
    productName: p.name,
    productId: p._id.toString(),
  }));
  res.json({ success: true, products: formatted });
});

// @desc    Get seller's orders
// @route   GET /api/sellers/orders
export const getSellerOrders = asyncHandler(async (req, res) => {
  const myProducts = await Product.find({ seller: req.user._id }).select("_id");
  const productIds = myProducts.map((p) => p._id);

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const status = req.query.status;

  const filter = { "items.product": { $in: productIds } };
  if (status && status !== "all") filter.orderStatus = status;

  const [orders, totalCount] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("user", "name email phone profileImage"),
    Order.countDocuments(filter),
  ]);

  // Filter to only show seller's items in each order
  const filtered = orders.map((order) => {
    const orderObj = order.toObject();
    orderObj.items = orderObj.items.filter((item) =>
      productIds.some((pid) => pid.toString() === (item.product?.toString() || ""))
    );
    return orderObj;
  });

  res.json({ success: true, orders: filtered, page, totalPages: Math.ceil(totalCount / limit) || 1, totalCount });
});

// @desc    Get seller earnings
// @route   GET /api/sellers/earnings
export const getSellerEarnings = asyncHandler(async (req, res) => {
  const seller = await Seller.findOne({ user: req.user._id });
  if (!seller) {
    res.status(404);
    throw new Error("Seller profile not found");
  }

  const myProducts = await Product.find({ seller: req.user._id }).select("_id");
  const productIds = myProducts.map((p) => p._id);

  const period = req.query.period || "month";
  const now = new Date();
  let startDate;
  if (period === "week") startDate = new Date(now.setDate(now.getDate() - 7));
  else if (period === "month") startDate = new Date(now.setMonth(now.getMonth() - 1));
  else if (period === "year") startDate = new Date(now.setFullYear(now.getFullYear() - 1));
  else startDate = new Date(now.setMonth(now.getMonth() - 1));

  const paidOrders = await Order.find({
    "items.product": { $in: productIds },
    paymentStatus: "paid",
    createdAt: { $gte: startDate },
  }).sort({ createdAt: 1 });

  let totalRevenue = 0;
  const earningsByDay = {};
  paidOrders.forEach((order) => {
    const day = order.createdAt.toISOString().split("T")[0];
    if (!earningsByDay[day]) earningsByDay[day] = 0;
    order.items.forEach((item) => {
      if (productIds.some((pid) => pid.toString() === (item.product?.toString() || ""))) {
        const itemTotal = (item.price || 0) * (item.quantity || 0);
        totalRevenue += itemTotal;
        earningsByDay[day] += itemTotal;
      }
    });
  });

  const commissionDeduction = totalRevenue * (seller.commissionRate / 100);

  res.json({
    success: true,
    earnings: {
      totalRevenue,
      commissionRate: seller.commissionRate,
      commissionMode: seller.commissionMode || "deduct",
      commissionDeduction,
      netEarnings: totalRevenue - commissionDeduction,
      availableBalance: seller.availableBalance,
      totalEarnings: seller.totalEarnings,
      dailyBreakdown: Object.entries(earningsByDay).map(([date, amount]) => ({ date, amount })),
    },
  });
});

// @desc    Get seller messages
// @route   GET /api/sellers/messages
export const getSellerMessages = asyncHandler(async (req, res) => {
  // Conversation = messages the seller sent, plus buyer messages tied to the
  // seller's orders. Order-related messages are linked via `orderRef`; the
  // `items.product` match handles legacy rows stored as a plain id.
  const myProducts = await Product.find({ seller: req.user._id }).select("_id");
  const productIds = myProducts.map((p) => p._id);
  const myOrders = await Order.find({ "items.product": { $in: productIds } }).select("_id");
  const myOrderIds = myOrders.map((o) => o._id);

  const messages = await Message.find({
    $or: [
      { sender: req.user._id },
      { $and: [{ orderRef: { $in: myOrderIds } }, { senderType: "user" }] },
      // Direct buyer<->seller chats from the product page ("Chat Now")
      { $and: [{ recipient: req.user._id }, { threadKey: { $ne: null } }, { senderType: "user" }] },
      // Replies from admins (e.g. replies to seller alerts / seller inquiries)
      { $and: [{ recipient: req.user._id }, { senderType: "admin" }] },
    ],
  })
    .populate("sender", "name profileImage role")
    .populate("recipient", "name profileImage")
    .sort({ createdAt: -1 })
    .limit(100);

  const sellerId = req.user._id.toString();
  const conversation = (m) => {
    const mine = m.sender?._id?.toString() === sellerId;
    const partnerId = mine ? m.recipient?._id?.toString() || "" : m.sender?._id?.toString() || "";
    const partnerUser = mine ? m.recipient : m.sender;
    return {
      key: partnerId || "no-buyer",
      partnerName: partnerUser?.name || "Customer",
      partnerImage: partnerUser?.profileImage || null,
      mine,
      message: m.message,
      orderRef: m.orderRef ? m.orderRef.toString() : null,
      text: m.message, // legacy alias
      id: m._id.toString(),
      read: m.sellerRead === true, // seller-read status (incoming messages only)
      createdAt: m.createdAt,
    };
  };
  res.json({ success: true, messages: messages.map(conversation) });
});

// @desc    Seller unread-message count (for the sidebar badge)
// @route   GET /api/sellers/messages/unread
export const getSellerUnreadCount = asyncHandler(async (req, res) => {
  const scope = await sellerMessageScope(req.user._id);
  const orderLinked = await Message.countDocuments({
    sellerRead: false,
    sender: { $ne: req.user._id },
    $and: [
      { orderRef: { $in: scope.orderIds } },
      { senderType: "user" },
    ],
  });
  // Direct buyer<->seller chats (threadKey rows) are separate from order-linked scope
  const directChats = await Message.countDocuments({
    sellerRead: false,
    sender: { $ne: req.user._id },
    recipient: req.user._id,
    threadKey: { $ne: null },
    senderType: "user",
  });
  // Admin replies (e.g. to seller alert replies / inquiries)
  const adminInbox = await Message.countDocuments({
    sellerRead: false,
    sender: { $ne: req.user._id },
    recipient: req.user._id,
    senderType: "admin",
  });
  res.json({ success: true, unreadCount: orderLinked + directChats + adminInbox });
});

// @desc    Mark messages as read by the seller (called when a conversation opens)
// @route   PATCH /api/sellers/messages/read
export const markSellerMessagesRead = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body?.messageIds) ? req.body.messageIds : [];
  if (!ids.length) return res.json({ success: true, updatedCount: 0 });

  const parsed = ids.map(String).filter((id) => mongoose.isValidObjectId(id)).slice(0, 500);
  if (!parsed.length) return res.json({ success: true, updatedCount: 0 });

  const scope = await sellerMessageScope(req.user._id);
  const result = await Message.updateMany(
    {
      _id: { $in: parsed },
      sender: { $ne: req.user._id },
      sellerRead: false,
      $or: [
        {
          $and: [
            { orderRef: { $in: scope.orderIds } },
            { senderType: "user" },
          ],
        },
        // Direct buyer<->seller chats addressed to this seller
        { recipient: req.user._id, threadKey: { $ne: null }, senderType: "user" },
        // Admin replies addressed to this seller
        { recipient: req.user._id, senderType: "admin" },
      ],
    },
    { $set: { sellerRead: true } }
  );
  res.json({ success: true, updatedCount: result.modifiedCount });
});

// Shared query scope: the seller's own orders. Messages from buyers tied to
// these orders (via orderRef) are what show up in the seller's Messages page.
const sellerMessageScope = async (sellerId) => {
  const myProducts = await Product.find({ seller: sellerId }).select("_id").lean();
  const productIds = myProducts.map((p) => p._id);
  const myOrders = await Order.find({ "items.product": { $in: productIds } }).select("_id").lean();
  return { orderIds: myOrders.map((o) => o._id) };
};

// @desc    Seller updates status of orders containing their products
// @route   PUT /api/sellers/orders/:orderId/status
export const sellerUpdateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Sellers can only update orders that include at least one of their products
  const myProducts = await Product.find({ seller: req.user._id }).select("_id");
  const productIds = myProducts.map((p) => p._id.toString());
  const ownsOrder = (order.items || []).some((item) =>
    item.product && productIds.includes(item.product.toString())
  );
  if (!ownsOrder) {
    res.status(403);
    throw new Error("This order does not include your products");
  }

  const oldStatus = order.orderStatus;
  const allowed = { pending: ["processing"], processing: ["shipped"], shipped: ["delivered"] };
  if (!allowed[oldStatus] || !allowed[oldStatus].includes(req.body.status)) {
    res.status(400);
    throw new Error(`You cannot move this order from "${oldStatus}" to "${req.body.status}"`);
  }

  order.orderStatus = req.body.status;
  if (req.body.trackingNumber) order.trackingNumber = String(req.body.trackingNumber).trim();
  if (req.body.courier) order.courier = String(req.body.courier).trim();
  await order.save();

  // COD delivery → pending ledger row (idempotent; delivery ≠ money received)
  if (order.paymentMethod === "cod" && order.orderStatus === "delivered") {
    try {
      await ensureCODCollection(order);
    } catch (codErr) {
      logger.error(`[Payout] COD ledger hook failed for order ${order._id}:`, codErr.message);
    }
  }

  // Real-time: refresh admin pending-orders badge without HTTP polling
  emitToAdmins("admin:stats-changed", { orderId: order._id });

  // Real-time: refresh product pages' Seller Information block
  const orderBrandProducts = await Product.find({ _id: { $in: order.items.map((i) => i.product).filter(Boolean) } }).select("brand").lean();
  notifyBrandStatsChanged([...new Set(orderBrandProducts.map((p) => p.brand).filter(Boolean))]);

  // Notify admins in their Notification center about the seller's order update
  notifyAdminsOfSellerEvent(req.user, `Order #${order._id.toString().slice(-8)} status updated by seller: ${oldStatus} → ${order.orderStatus}`);

  // Notify buyer through their notification feed (order status changes are
  // transactional events, not support chat)
  try {
    const statusEmoji = { processing: "🔄", shipped: "🚚", delivered: "✅" };
    const emoji = statusEmoji[req.body.status] || "📦";
    const trackingInfo = order.trackingNumber
      ? `\nTracking: ${order.trackingNumber} (${order.courier || "N/A"})`
      : "";
    const statusNotice = await Notification.create({
      user: order.user?._id || order.user,
      type: "ORDER_STATUS",
      order: order._id,
      title: "Order status updated",
      message: `${emoji} Order #${order._id.toString().slice(-8)} status updated: ${oldStatus} → ${order.orderStatus}${trackingInfo}`,
    });
    // Real-time: bump the buyer's notification badge if they're online
    emitToUser(order.user?._id || order.user, "notification:new", {
      id: statusNotice._id,
      type: statusNotice.type,
    });
  } catch (err) {
    logger.error("Failed to notify buyer of seller order status update:", err);
  }

  // Real-time: push the status change to the buyer immediately
  emitToUser(order.user?._id || order.user, "order:update", {
    orderId: order._id,
    orderStatus: order.orderStatus,
  });

  res.json({ success: true, order });
});

// @desc    Send message as seller
// @route   POST /api/sellers/messages
export const sendSellerMessage = asyncHandler(async (req, res) => {
  const { receiverId, text, orderId } = req.body;
  if (!receiverId || !text || !String(text).trim()) {
    res.status(400);
    throw new Error("Receiver and message text are required");
  }
  if (!mongoose.isValidObjectId(receiverId)) {
    res.status(400);
    throw new Error("Invalid receiver id");
  }

  const receiver = await User.findById(receiverId);
  if (!receiver) {
    res.status(404);
    throw new Error("Receiver not found");
  }

  // Optional order link: must be one of this seller's orders for this buyer
  let orderRef;
  if (orderId) {
    const order = await Order.findById(orderId);
    if (!order || String(order.user) !== receiver._id.toString()) {
      res.status(400);
      throw new Error("Order does not match the receiver");
    }
    orderRef = order._id;
  }

  // Direct product-page chats carry the pair's threadKey (buyer|seller) so the
  // reply stays in the same conversation; order-linked messages keep threadKey null.
  //
  // A buyer DM without an order link requires a purchase relationship: the
  // receiver must have ordered at least one of this seller's products. This
  // stops sellers from using the endpoint to cold-DM arbitrary users.
  let threadKey;
  if (!orderRef && receiver.role !== "admin") {
    const myProductIds = await Product.find({ seller: req.user._id }).distinct("_id");
    const purchaseOrder =
      myProductIds.length > 0
        ? await Order.findOne({
            user: receiver._id,
            "items.product": { $in: myProductIds },
          }).lean()
        : null;
    if (!purchaseOrder) {
      res.status(403);
      throw new Error("You can only message buyers who purchased one of your products");
    }
    threadKey = `${receiver._id}|${req.user._id}`;
  }

  // Seller → admin support messages are stored with the @admin prefix so they
  // show up in the admin Notification center (filtered by /@admin/i).
  const trimmedText = String(text).trim();
  const isToAdmin = receiver.role === "admin";
  const finalText = isToAdmin && !/^@admin/i.test(trimmedText) ? `@admin ${trimmedText}` : trimmedText;

  const message = await Message.create({
    sender: req.user._id,
    recipient: receiver._id,
    message: finalText,
    orderRef,
    threadKey,
    senderType: "user",
    isAdmin: false,
    adminRead: false,
    // DM replies aren't part of the AI support badge; buyer reads them in the thread panel.
    userRead: threadKey ? true : false,
    sellerRead: true,
  });

  // Real-time: push to the buyer's open chat (order-linked replies keep the
  // existing event; direct-thread replies push the thread event so they don't
  // land in the AI support chat widget).
  if (threadKey) {
    emitToUser(receiver._id, "seller-chat:new-message", message);
  } else if (receiver.role === "admin") {
    // Seller → admin support message: ping every connected admin and make sure
    // the text carries the @admin marker so the admin Notification center
    // lists it (it filters with /@admin/i).
    emitToAdmins("chat:unseen-user", { userId: req.user._id, userName: req.user.name });
  } else {
    emitToUser(receiver._id, "chat:new-message", message);
  }

  // Real-time: order-linked replies affect the brand's chat response stats
  if (orderRef) {
    const linkedOrder = await Order.findById(orderRef).select("items").lean();
    const linkedProducts = await Product.find({ _id: { $in: (linkedOrder?.items || []).map((i) => i.product).filter(Boolean) } }).select("brand").lean();
    notifyBrandStatsChanged([...new Set((linkedProducts || []).map((p) => p.brand).filter(Boolean))]);
  }

  res.status(201).json({ success: true, message });
});

// @desc    Get the admin support contact for the seller's Messages page
// @route   GET /api/sellers/messages/support
export const getSupportAdmin = asyncHandler(async (req, res) => {
  const admin = await User.findOne({ role: "admin" }).select("name profileImage").lean();
  if (!admin) {
    res.status(404);
    throw new Error("No admin available");
  }
  res.json({ success: true, admin: { id: admin._id, name: admin.name, image: admin.profileImage || null } });
});

// ---- Admin endpoints ----

// @desc    Get all sellers (admin)
// @route   GET /api/sellers/admin/all
export const adminGetAllSellers = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const [sellers, total] = await Promise.all([
    Seller.find(filter).populate("user", "name email profileImage").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit)),
    Seller.countDocuments(filter),
  ]);

  res.json({ success: true, sellers, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
});

// @desc    Approve seller (admin)
// @route   PUT /api/sellers/admin/:id/approve
export const adminApproveSeller = asyncHandler(async (req, res) => {
  const seller = await Seller.findById(req.params.id);
  if (!seller) {
    res.status(404);
    throw new Error("Seller not found");
  }

  seller.status = "approved";
  seller.approvedAt = new Date();
  seller.approvedBy = req.user._id;
  seller.onboardingCompleted = true;
  await seller.save();

  await User.findByIdAndUpdate(seller.user, { role: "seller" });

  // Real-time: refresh the admin seller list without HTTP polling
  emitToAdmins("admin:stats-changed", { orderId: seller._id, type: "seller" });

  res.json({ success: true, seller });
});

// @desc    Reject seller (admin)
// @route   PUT /api/sellers/admin/:id/reject
export const adminRejectSeller = asyncHandler(async (req, res) => {
  const seller = await Seller.findById(req.params.id);
  if (!seller) {
    res.status(404);
    throw new Error("Seller not found");
  }

  seller.status = "rejected";
  seller.rejectionReason = req.body.reason || "";
  await seller.save();

  // A rejected seller must not keep the "seller" role — otherwise they can
  // still access seller-only routes (sellerOnly checks the user role).
  await User.findByIdAndUpdate(seller.user, { role: "customer" });

  // Real-time: refresh the admin seller list without HTTP polling
  emitToAdmins("admin:stats-changed", { orderId: seller._id, type: "seller" });

  res.json({ success: true, seller });
});

// @desc    Suspend seller (admin)
// @route   PUT /api/sellers/admin/:id/suspend
export const adminSuspendSeller = asyncHandler(async (req, res) => {
  const seller = await Seller.findById(req.params.id);
  if (!seller) {
    res.status(404);
    throw new Error("Seller not found");
  }

  seller.status = "suspended";
  await seller.save();

  await User.findByIdAndUpdate(seller.user, { role: "customer" });

  // Real-time: refresh the admin seller list without HTTP polling
  emitToAdmins("admin:stats-changed", { orderId: seller._id, type: "seller" });

  res.json({ success: true, seller });
});

// @desc    Update seller commission (admin)
// @route   PUT /api/sellers/admin/:id/commission
export const adminSetCommission = asyncHandler(async (req, res) => {
  const seller = await Seller.findById(req.params.id);
  if (!seller) {
    res.status(404);
    throw new Error("Seller not found");
  }

  const rate = Number(req.body.commissionRate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    res.status(400);
    throw new Error("commissionRate must be a number between 0 and 100");
  }

  seller.commissionRate = rate;
  await seller.save();

  // Real-time: refresh the admin seller list without HTTP polling
  emitToAdmins("admin:stats-changed", { orderId: seller._id, type: "seller" });

  res.json({ success: true, seller });
});

// @desc    Get seller platform stats (admin)
// @route   GET /api/sellers/admin/stats
export const adminGetSellerStats = asyncHandler(async (req, res) => {
  const [totalSellers, pendingSellers, approvedSellers, suspendedSellers] = await Promise.all([
    Seller.countDocuments(),
    Seller.countDocuments({ status: "pending" }),
    Seller.countDocuments({ status: "approved" }),
    Seller.countDocuments({ status: "suspended" }),
  ]);

  const sellersWithProducts = await Product.distinct("seller");
  const totalSellerProducts = await Product.countDocuments({ seller: { $ne: null } });
  const pendingApprovalProducts = await Product.countDocuments({ approvedByAdmin: false, seller: { $ne: null } });

  res.json({
    success: true,
    stats: {
      totalSellers,
      pendingSellers,
      approvedSellers,
      suspendedSellers,
      sellersWithProducts: sellersWithProducts.length,
      totalSellerProducts,
      pendingApprovalProducts,
    },
  });
});

// @desc    Get individual seller detail for admin
// @route   GET /api/sellers/admin/:id/detail
export const adminGetSellerDetail = asyncHandler(async (req, res) => {
  const seller = await Seller.findById(req.params.id).populate("user", "name email profileImage role");
  if (!seller) {
    res.status(404);
    throw new Error("Seller not found");
  }

  const sellerProducts = await Product.find({ seller: seller.user._id })
    .sort({ createdAt: -1 })
    .select("name price stock status approvedByAdmin images createdAt");

  const productIds = sellerProducts.map((p) => p._id);

  // Feedback stats for seller's products
  const feedbackStats = await Feedback.aggregate([
    { $match: { product: { $in: productIds } } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  // Order stats for seller's products
  const sellerOrders = await Order.find({ "items.product": { $in: productIds } }).sort({ createdAt: -1 }).limit(50).select("orderStatus totalPrice createdAt items");

  const totalOrders = sellerOrders.length;
  const deliveredOrders = sellerOrders.filter((o) => o.orderStatus === "delivered").length;
  const pendingOrders = sellerOrders.filter((o) => o.orderStatus === "pending" || o.orderStatus === "processing").length;

  res.json({
    success: true,
    seller: {
      _id: seller._id,
      shopName: seller.shopName,
      shopLogo: seller.shopLogo,
      shopBanner: seller.shopBanner,
      shopDescription: seller.shopDescription,
      status: seller.status,
      rejectionReason: seller.rejectionReason,
      commissionRate: seller.commissionRate,
      businessType: seller.businessType,
      ownerName: seller.ownerName,
      ownerPhone: seller.ownerPhone,
      createdAt: seller.createdAt,
      approvedAt: seller.approvedAt,
      user: seller.user,
    },
    products: sellerProducts,
    feedbackStats,
    orderStats: { totalOrders, deliveredOrders, pendingOrders },
    recentOrders: sellerOrders.slice(0, 10),
  });
});

// @desc    Get public store page by shop name
// @route   GET /api/sellers/store/:shopName
export const getPublicStore = asyncHandler(async (req, res) => {
  // A shop name may map to several records (e.g. if a user was deleted while
  // their Seller doc remained). findOne returns the first match, which can be a
  // stale doc whose `user` no longer exists — reading `seller.user._id` on it
  // crashes the request. So fetch all matches and pick one whose user resolved.
  const escaped = req.params.shopName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const candidates = await Seller.find({
    shopName: { $regex: new RegExp(`^${escaped}$`, "i") },
  })
    .populate("user", "name")
    .select("shopName shopLogo shopBanner shopDescription rating numRatings shipOnTime chatResponseRate createdAt user status");

  const seller =
    candidates.find((c) => c.status === "approved" && c.user) ||
    candidates.find((c) => c.status === "approved");

  if (!seller || seller.status !== "approved" || !seller.user) {
    res.status(404);
    throw new Error("Store not found");
  }

  const { page = 1, limit = 12 } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  const [products, totalProducts] = await Promise.all([
    Product.find({ seller: seller.user._id, approvedByAdmin: true, status: { $in: ["active", "ready"] } })
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .select("name price sellingPrice images stock createdAt"),
    Product.countDocuments({ seller: seller.user._id, approvedByAdmin: true, status: { $in: ["active", "ready"] } }),
  ]);

  const formattedProducts = products.map((p) => ({
    ...p.toObject(),
    productName: p.name,
    productId: p._id.toString(),
  }));

  res.json({
    success: true,
    store: {
      shopName: seller.shopName,
      shopLogo: seller.shopLogo,
      shopBanner: seller.shopBanner,
      shopDescription: seller.shopDescription,
      rating: seller.rating,
      numRatings: seller.numRatings,
      shipOnTime: seller.shipOnTime,
      chatResponseRate: seller.chatResponseRate,
      memberSince: seller.createdAt,
      owner: seller.user?.name || "",
    },
    products: formattedProducts,
    totalProducts,
    page: pageNum,
    totalPages: Math.ceil(totalProducts / limitNum),
  });
});
