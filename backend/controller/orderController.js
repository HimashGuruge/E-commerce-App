import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { emitToUser, emitToAdmins } from "../services/socketService.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Variant from "../models/Variant.js";
import Notification from "../models/Notification.js";
import logger from "../utils/logger.js";
import SiteConfig from "../models/SiteConfig.js";
import { generateReviewReminders } from "../services/reviewReminderService.js";
import { notifyBrandStatsChanged } from "../services/sellerMessagingService.js";
import { resolveCoupon } from "../utils/couponService.js";
import { ensureCODCollection, failPendingCollectionsForOrder } from "../services/payoutService.js";

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

  // COD: pending (unverified) ledger rows for this order become failed.
  // Verified rows are untouched — already-received money needs an explicit reversal.
  if (order.paymentMethod === "cod") {
    try {
      await failPendingCollectionsForOrder(order._id);
    } catch (codErr) {
      logger.error(`[Payout] COD cancel hook failed for order ${order._id}:`, codErr.message);
    }
  }
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
  // Accept both buyer-cart shape ({ orderedItems: [{ productId, qty }] }) and
  // admin-checkout shape ({ items: [{ productId | variantId, quantity }] }).
  const rawItems = Array.isArray(req.body?.orderedItems)
    ? req.body.orderedItems
    : Array.isArray(req.body?.items)
      ? req.body.items
      : null;
  if (!rawItems || rawItems.length === 0) {
    res.status(400);
    throw new Error("Cart is empty");
  }

  const couponCode = String(req.body?.couponCode || "").trim().toUpperCase();

  let subtotal = 0; // sum of selling (charged) prices
  let labeledTotal = 0; // sum of list (strikethrough) prices
  const orderedItems = [];

  for (const item of rawItems) {
    const quantity = Number(item.quantity ?? item.qty) || 0;
    if (quantity < 1) {
      res.status(400);
      throw new Error("Each item needs a positive quantity");
    }

    let product, price, listPrice, name, image, stockAvailable, variant = null;
    if (item.variantId && mongoose.isValidObjectId(item.variantId)) {
      variant = await Variant.findById(item.variantId);
      if (variant) {
        product = await Product.findById(variant.parentProduct);
      }
      if (!variant || !product) {
        res.status(404);
        throw new Error(`Variant ${item.variantId} not found`);
      }
      price = variant.price ?? product.price;
      listPrice = product.originalPrice ?? product.price;
      name = product.name;
      image = variant.images?.[0] || product.images?.[0] || "";
      stockAvailable = Math.max(0, (variant.stock || 0) - (variant.reservedStock || 0));
    } else {
      product = await Product.findById(item.productId);
      if (!product) {
        res.status(404);
        throw new Error(`Product ${item.productId} not found`);
      }
      price = product.price;
      listPrice = product.originalPrice ?? product.price;
      name = product.name;
      image = product.images?.[0] || "";
      stockAvailable = Math.max(0, (product.stock || 0) - (product.reservedStock || 0));
    }

    subtotal += price * quantity;
    labeledTotal += listPrice * quantity;
    orderedItems.push({
      productId: product._id,
      variantId: variant?._id || null,
      qty: quantity,
      quantity,
      productName: name,
      price: listPrice,
      sellingPrice: price,
      discount: Math.round((listPrice - price) * 100) / 100,
      stock: stockAvailable,
      images: variant?.images?.length ? variant.images : product.images || [""],
    });
  }

  // Dynamic shipping rates from SiteConfig (same source as checkout).
  // The free-shipping threshold is checked against the post-discount subtotal.
  const siteConfig = await SiteConfig.findOne();
  const shippingConfig = siteConfig?.shipping || { standardCost: 330, freeThreshold: 10000 };

  // Optional coupon — validated server-side; an invalid code still returns
  // a valid quote plus couponError so the cart UI can explain the failure.
  const couponResult = await resolveCoupon(couponCode, subtotal, shippingConfig.standardCost);
  const couponDiscount = couponResult.ok ? couponResult.discount : 0;
  const freeShippingCoupon = couponResult.ok && couponResult.coupon?.discountType === "freeshipping";

  const payableSubtotal = Math.max(0, subtotal - couponDiscount);
  const shipping =
    freeShippingCoupon || payableSubtotal >= shippingConfig.freeThreshold ? 0 : shippingConfig.standardCost;

  res.json({
    success: true,
    orderedItems,
    itemsSubtotal: subtotal,
    total: payableSubtotal,
    labeledTotal,
    discount: Math.round((labeledTotal - subtotal) * 100) / 100,
    shipping,
    coupon: couponResult.ok
      ? {
          code: couponResult.coupon.code,
          discountType: couponResult.coupon.discountType,
          discountValue: couponResult.coupon.discountValue,
          discountAmount: couponDiscount + (couponResult.shippingDiscount || 0),
        }
      : null,
    couponError: couponResult.ok ? null : couponResult.message || null,
    message: "",
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

  // COD settlement hooks: delivery creates a pending ledger row (idempotent);
  // cancellation before verification fails any pending rows. Delivery alone
  // never means money was received.
  if (order.paymentMethod === "cod") {
    try {
      if (order.orderStatus === "delivered") await ensureCODCollection(order);
      else if (order.orderStatus === "cancelled" && oldStatus !== "cancelled")
        await failPendingCollectionsForOrder(order._id);
    } catch (codErr) {
      logger.error(`[Payout] COD ledger hook failed for order ${order._id}:`, codErr.message);
    }
  }

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
    // Order status changes are transactional events: deliver them through the
    // buyer's notification feed (not the support chat).
    const statusNotice = await Notification.create({
      user: order.user?._id || order.user,
      type: "ORDER_STATUS",
      order: order._id,
      title: "Order status updated",
      message: `${emoji} Order #${order._id} status updated: ${oldStatus} → ${req.body.status}${trackingInfo}`,
    });
    // Real-time: bump the buyer's notification badge if they're online
    emitToUser(order.user?._id || order.user, "notification:new", {
      id: statusNotice._id,
      type: statusNotice.type,
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
  // Accept both buyer-cart shape ({ orderedItems: [{ productId, qty }] }) and
  // admin-checkout shape ({ items: [{ productId | variantId, quantity }] }).
  const rawItems = Array.isArray(req.body?.orderedItems)
    ? req.body.orderedItems
    : Array.isArray(req.body?.items)
      ? req.body.items
      : null;
  if (!rawItems || rawItems.length === 0) {
    res.status(400);
    throw new Error("No items to verify");
  }

  const stockIssues = [];

  for (const item of rawItems) {
    const quantity = Number(item.quantity ?? item.qty) || 0;
    let availableStock;

    if (item.variantId) {
      const variant = await Variant.findById(item.variantId);
      if (!variant) {
        stockIssues.push({ ...item, quantity, error: "Variant not found" });
        continue;
      }
      availableStock = (variant.stock || 0) - (variant.reservedStock || 0);
    } else {
      const product = await Product.findById(item.productId);
      if (!product) {
        stockIssues.push({ ...item, quantity, error: "Product not found" });
        continue;
      }
      availableStock = (product.stock || 0) - (product.reservedStock || 0);
    }

    if (quantity > availableStock) {
      stockIssues.push({
        ...item,
        quantity,
        available: availableStock,
        requested: quantity,
        shortBy: quantity - availableStock,
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

