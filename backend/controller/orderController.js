import asyncHandler from "express-async-handler";
import { emitToUser, emitToAdmins } from "../services/socketService.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Variant from "../models/Variant.js";
import Message from "../models/Message.js";
import logger from "../utils/logger.js";
import SiteConfig from "../models/SiteConfig.js";
import { generateReviewReminders } from "../services/reviewReminderService.js";
import { notifyBrandStatsChanged } from "../services/sellerMessagingService.js";

// Distinct product brands covered by an order's items (for seller-stats pings)
const orderBrands = async (order) => {
  const ids = (order.items || [])
    .map((i) => (i.product ? String(i.product) : null))
    .filter(Boolean);
  if (!ids.length) return [];
  const products = await Product.find({ _id: { $in: ids } }).select("brand").lean();
  return [...new Set(products.map((p) => p.brand).filter(Boolean))];
};

// Legacy orders may lack item.name/image (never saved at creation).
// Fall back to the live Product/Variant so images and names always render.
async function ensureItemMetadata(order) {
  for (const item of order.items || []) {
    if (item.image && item.name) continue;
    const product = await Product.findById(item.product);
    const variant = item.variant ? await Variant.findById(item.variant) : null;
    if (!product && !variant) continue;
    if (!item.image) item.image = variant?.images?.[0] || product?.images?.[0] || "";
    if (!item.name) item.name = variant?.sku ? `${product?.name || ""} - ${variant.sku}` : product?.name || "";
  }
}

export const getOrdersByUser = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const status = req.query.status;

  const filter = { user: req.user._id };
  if (status && status !== "all") filter.orderStatus = status;

  const [orders, totalCount] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  for (const order of orders) {
    await ensureItemMetadata(order);
    if (order.orderStatus !== "shipped" && order.orderStatus !== "delivered") {
      delete order.trackingNumber;
    }
  }

  res.json({
    success: true,
    orders,
    page,
    totalPages: Math.ceil(totalCount / limit) || 1,
    totalCount,
  });
});

export const getUserOrderStatusSummary = asyncHandler(async (req, res) => {
  const orders = await Order.find(
    { user: req.user._id },
    { _id: 1, orderStatus: 1, updatedAt: 1 }
  ).sort({ updatedAt: -1 });

  res.json({ success: true, orders });
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized");
  }
  await ensureItemMetadata(order);
  if (
    req.user.role !== "admin" &&
    order.orderStatus !== "shipped" &&
    order.orderStatus !== "delivered"
  ) {
    delete order.trackingNumber;
  }
  res.json({ success: true, order });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  // Only the order owner or an admin may cancel
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to cancel this order");
  }
  order.orderStatus = "cancelled";
  order.cancelledBy = req.user._id;
  order.cancellationReason = req.body.reason || "Cancelled by user";
  await order.save();
  // Real-time: notify the buyer's open orders page instantly
  emitToUser(order.user?._id || order.user, "order:update", {
    orderId: order._id,
    orderStatus: order.orderStatus,
  });
  // Real-time: refresh product pages' Seller Information block
  notifyBrandStatsChanged(await orderBrands(order));
  res.json({ success: true, order });
});

export const markOrdersAsSeen = asyncHandler(async (req, res) => {
  const filter = req.user?.role === "admin" ? {} : { user: req.user._id };
  await Order.updateMany(filter, { $set: { seenByAdmin: true } });
  res.json({ success: true });
});

export const getDashboardStats = asyncHandler(async (req, res) => {
  const totalOrders = await Order.countDocuments();
  const totalRevenue = await Order.aggregate([
    { $match: { orderStatus: { $ne: "cancelled" } } },
    { $group: { _id: null, total: { $sum: "$totalPrice" } } },
  ]);
  res.json({
    success: true,
    stats: {
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
    },
  });
});

export const getQuote = asyncHandler(async (req, res) => {
  const { items } = req.body;
  let subtotal = 0;
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) {
      res.status(404);
      throw new Error(`Product ${item.productId} not found`);
    }
    subtotal += product.price * item.quantity;
  }

  // Fetch dynamic shipping rates from SiteConfig
  const siteConfig = await SiteConfig.findOne();
  const shippingCost = siteConfig?.shipping?.standardCost || (subtotal > 100 ? 0 : 10);

  res.json({
    success: true,
    quote: { subtotal, shipping: shippingCost, total: subtotal + shippingCost },
  });
});

export const adminGetAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find().populate("user", "name email").sort({ createdAt: -1 });
  res.json({ success: true, orders });
});

export const adminUpdateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  const oldStatus = order.orderStatus;
  order.orderStatus = req.body.status;
  if (req.body.trackingNumber) order.trackingNumber = req.body.trackingNumber;
  if (req.body.status === "pending" || req.body.status === "processing") {
    order.trackingNumber = undefined;
  }
  if (req.body.courier) order.courier = req.body.courier;
  await order.save();

  // Real-time: refresh admin pending-orders badge without HTTP polling
  emitToAdmins("admin:stats-changed", { orderId: order._id });

  // Real-time: refresh product pages' Seller Information block
  notifyBrandStatsChanged(await orderBrands(order));

  // Notify user of status change
  try {
    const statusEmoji = {
      processing: "🔄",
      shipped: "🚚",
      delivered: "✅",
      cancelled: "❌",
    };
    const emoji = statusEmoji[req.body.status] || "📦";
    const trackingInfo = order.trackingNumber ? `\nTracking: ${order.trackingNumber} (${order.courier || "N/A"})` : "";
    const statusMsg = await Message.create({
      sender: req.user._id,
      recipient: order.user?._id || order.user,
      orderRef: order._id,
      message: `${emoji} Order #${order._id} status updated: ${oldStatus} → ${req.body.status}${trackingInfo}`,
      senderType: "bot",
      isAdmin: true,
      adminRead: true,
      userRead: false,
    });
    // Real-time: push the bot status note to the buyer's open chat instantly
    emitToUser(order.user?._id || order.user, "chat:new-message", statusMsg);
    // Ping admins so their chat centre refreshes without waiting for polling
    emitToAdmins("chat:unseen-user", {
      userId: order.user?._id || order.user,
      userName: order.user?.name || "A user",
    });
  } catch (err) {
    logger.error("Failed to send order status notification:", err);
  }

  // Real-time: push the status change to the buyer immediately
  emitToUser(order.user?._id || order.user, "order:update", {
    orderId: order._id,
    orderStatus: order.orderStatus,
  });
  // Review reminders: fire when the order first reaches "delivered"
  if (oldStatus !== "delivered" && order.orderStatus === "delivered") {
    try {
      await generateReviewReminders(order);
    } catch (err) {
      logger.error("Failed to generate review reminders:", err.message);
    }
  }

  res.json({ success: true, order });
});

export const syncDomexStatus = asyncHandler(async (req, res) => {
  const { processShippedOrders } = await import("../services/trackingService.js");
  await processShippedOrders();
  res.json({ success: true, message: "Tracking check complete" });
});

export const verifyStockBeforeCheckout = asyncHandler(async (req, res) => {
  const { items } = req.body;
  const stockIssues = [];
  
  for (const item of items) {
    let availableStock;
    
    if (item.variantId) {
      const variant = await Variant.findById(item.variantId);
      if (!variant) {
        stockIssues.push({ variantId: item.variantId, error: "Variant not found" });
        continue;
      }
      availableStock = variant.stock - (variant.reservedStock || 0);
    } else {
      const product = await Product.findById(item.productId);
      if (!product) {
        stockIssues.push({ productId: item.productId, error: "Product not found" });
        continue;
      }
      availableStock = product.stock - (product.reservedStock || 0);
    }
    
    if (availableStock < item.quantity) {
      stockIssues.push({
        ...item,
        available: availableStock,
        requested: item.quantity,
        shortBy: item.quantity - availableStock,
      });
    }
  }
  
  res.json({
    success: stockIssues.length === 0,
    stockIssues,
  });
});

export const adminDeleteFailedOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.orderStatus !== "failed" && order.orderStatus !== "cancelled") {
    res.status(400);
    throw new Error("Can only delete failed or cancelled orders");
  }
  await order.deleteOne();
  res.json({ success: true, message: "Failed order deleted" });
});

