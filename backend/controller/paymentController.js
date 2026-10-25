import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Stripe from "stripe";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Variant from "../models/Variant.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import SiteConfig from "../models/SiteConfig.js";
import { recalcParentStock } from "./productVariantController.js";
import { emitToAdmins } from "../services/socketService.js";
import { notifyOrderSellers, notifyOrderSellersOfNewOrder, notifyBrandStatsChanged } from "../services/sellerMessagingService.js";
import { resolveCoupon, recordCouponUse } from "../utils/couponService.js";
import { computeCommissionSnapshot } from "../services/payoutService.js";

// Distinct product brands covered by an order's items (for seller-stats pings)
const orderBrands = async (order) => {
  const ids = (order.items || [])
    .map((i) => (i.product ? String(i.product) : null))
    .filter(Boolean);
  if (!ids.length) return [];
  const products = await Product.find({ _id: { $in: ids } }).select("brand").lean();
  return [...new Set(products.map((p) => p.brand).filter(Boolean))];
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Reduce real stock for a finalized order and re-sync parent totals (idempotent)
export const finalizeStockForOrder = async (order) => {
  if (!order || order.stockFinalized) return;
  const parentIds = new Set();
  for (const item of order.items) {
    if (item.variant) {
      await Variant.findByIdAndUpdate(item.variant, {
        $inc: { stock: -item.quantity },
        $set: { reservedStock: 0 },
      });
      const variant = await Variant.findById(item.variant);
      if (variant?.parentProduct) parentIds.add(String(variant.parentProduct));
    } else if (item.product) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
        $set: { reservedStock: 0 },
      });
    }
  }
  for (const parentId of parentIds) {
    await recalcParentStock(parentId);
  }
  order.stockFinalized = true;
  await order.save();
};

// Shared input validation for checkout endpoints (Stripe + COD)
const validateCheckoutBody = (req, res) => {
  const { items, shippingAddress } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error("Cart is empty — nothing to checkout");
  }
  for (const item of items) {
    const hasRef = (item.variantId || item.productId) && mongoose.isValidObjectId(item.variantId || item.productId);
    if (!hasRef || !Number.isInteger(item.quantity) || item.quantity < 1) {
      res.status(400);
      throw new Error("Each item needs a valid product id and a positive integer quantity");
    }
  }
  if (!shippingAddress?.address || !shippingAddress?.phone || !shippingAddress?.city) {
    res.status(400);
    throw new Error("Shipping address must include address, city, and phone");
  }
};

const getShippingConfig = async () => {
  const config = await SiteConfig.findOne();
  return config?.shipping || {
    standardCost: 330,
    freeThreshold: 10000,
  };
};

// Verify stock before checkout
const verifyStockBeforeCheckout = async (items) => {
  for (const item of items) {
    let product, variant;
    
    if (item.variantId) {
      variant = await Variant.findById(item.variantId);
      product = await Product.findById(variant.parentProduct);
      // Check variant stock minus reserved stock
      const availableStock = variant.stock - (variant.reservedStock || 0);
      if (availableStock < item.quantity) {
        throw new Error(`Insufficient stock for variant ${item.variantId}: requested ${item.quantity}, available ${availableStock}`);
      }
    } else {
      product = await Product.findById(item.productId);
      // Check product stock minus reserved stock
      const availableStock = product.stock - (product.reservedStock || 0);
      if (availableStock < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.productId}: requested ${item.quantity}, available ${availableStock}`);
      }
    }
  }
};

// Reserve stock temporarily before checkout
const reserveStock = async (items) => {
  const reservations = [];
  
  for (const item of items) {
    let reservation;
    
    if (item.variantId) {
      // For variants, reduce available stock and track reserved amount
      const variant = await Variant.findById(item.variantId);
      if (variant) {
        reservation = await Variant.findByIdAndUpdate(
          item.variantId,
          { 
            $inc: { reservedStock: item.quantity }
          },
          { new: true }
        );
      }
    } else {
      // For products, reduce available stock and track reserved amount
      const product = await Product.findById(item.productId);
      if (product) {
        reservation = await Product.findByIdAndUpdate(
          item.productId,
          { 
            $inc: { reservedStock: item.quantity }
          },
          { new: true }
        );
      }
    }
    
    reservations.push(reservation);
  }
  
  return reservations;
};

// Shared coupon handling for the checkout endpoints. The client's coupon is
// ALWAYS re-validated server-side here — never trusted blindly. Throws 400
// when the code no longer applies.
const applyOrderCoupon = async (req, res, subtotal, shippingConfig) => {
  const raw = req.body?.couponCode;
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return { coupon: null, couponDiscount: 0, shippingWaived: 0 };
  }
  const result = await resolveCoupon(String(raw).trim(), subtotal, shippingConfig.standardCost);
  if (!result.ok) {
    res.status(400);
    throw new Error("Coupon no longer valid — please remove it and try again");
  }
  return { coupon: result.coupon, couponDiscount: result.discount };
};

// Subtract a whole-Rs coupon discount from Stripe line items so the session
// total charges exactly (subtotal - discount). Works in rupees: an affected
// item of price p × qty is replaced by (qty-k) units at p plus k units at
// (k*p - d), which is always exact and non-negative.
const applyCouponToLineItems = (lineItems, discountRs) => {
  let remaining = Math.max(0, Math.round(discountRs));
  for (let i = lineItems.length - 1; i >= 0 && remaining > 0; i--) {
    const li = lineItems[i];
    const qty = li.quantity || 1;
    const priceRs = Math.round(li.price_data.unit_amount / 100);
    const lineTotal = priceRs * qty;
    const d = Math.min(remaining, lineTotal);
    if (d <= 0) continue;
    remaining -= d;
    const k = Math.ceil(d / Math.max(priceRs, 1)); // units whose price is adjusted
    const remainderRs = k * priceRs - d; // 0 <= remainder < priceRs
    if (qty - k > 0) {
      li.quantity = qty - k; // keep original price for the untouched part
    }
    const splitItem = {
      price_data: { ...li.price_data, unit_amount: remainderRs * 100 },
      quantity: k,
    };
    if (li.quantity < 1) {
      li.quantity = splitItem.quantity;
      li.price_data = splitItem.price_data;
    } else {
      lineItems.splice(i + 1, 0, splitItem);
    }
  }
  return lineItems;
};

// Release reserved stock if checkout fails
const releaseStock = async (reservations) => {
  for (const reservation of reservations) {
    if (reservation) {
      const model = mongoose.model(reservation.constructor.modelName);
      await model.findByIdAndUpdate(
        reservation._id,
        { $inc: { reservedStock: -reservation.reservedStock } },
        { new: true }
      );
    }
  }
};

export const createStripeSession = asyncHandler(async (req, res) => {
  validateCheckoutBody(req, res);
  const { items, shippingAddress } = req.body;
  
  // Verify stock before creating order
  await verifyStockBeforeCheckout(items);

  let subtotal = 0;
  const lineItems = [];
  const orderItems = [];

  for (const item of items) {
    let product, price, name, image;
    if (item.variantId) {
      const variant = await Variant.findById(item.variantId);
      product = await Product.findById(variant.parentProduct);
      price = variant.price || product.price;
      name = `${product.name} - ${variant.sku}`;
      image = variant.images?.[0] || product.images?.[0];
    } else {
      product = await Product.findById(item.productId);
      price = product.price;
      name = product.name;
      image = product.images?.[0];
    }
    subtotal += price * item.quantity;
    orderItems.push({
      product: item.productId,
      variant: item.variantId,
      name,
      image,
      quantity: item.quantity,
      price,
    });
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name, images: image ? [image] : [] },
        unit_amount: Math.round(price * 100),
      },
      quantity: item.quantity,
    });
  }

  const shippingConfig = await getShippingConfig();

  // Coupon (validated server-side) — freeshipping waives the delivery fee
  const { coupon: appliedCoupon, couponDiscount } = await applyOrderCoupon(
    req,
    res,
    subtotal,
    shippingConfig
  );
  const freeShippingCoupon = appliedCoupon?.discountType === "freeshipping";
  const payableSubtotal = Math.max(0, subtotal - couponDiscount);
  const shippingWithoutCoupon =
    payableSubtotal >= shippingConfig.freeThreshold ? 0 : shippingConfig.standardCost;
  const shippingCost = freeShippingCoupon ? 0 : shippingWithoutCoupon;
  // Amount of shipping actually waived by the coupon (for the order record)
  const shippingWaived = freeShippingCoupon ? shippingWithoutCoupon : 0;

  // The session charges exactly (subtotal - coupon discount); the delivery
  // fee is settled separately, as before.
  if (couponDiscount > 0) applyCouponToLineItems(lineItems, couponDiscount);

  // Reserve stock temporarily
  const reservations = await reserveStock(items);

  try {
    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod: "stripe",
      totalPrice: payableSubtotal + shippingCost,
      shippingCost,
      orderStatus: "pending",
      coupon: appliedCoupon
        ? {
            _id: appliedCoupon._id,
            code: appliedCoupon.code,
            discountType: appliedCoupon.discountType,
            discountValue: appliedCoupon.discountValue,
            discountAmount: couponDiscount + shippingWaived,
          }
        : undefined,
      discountTotal: couponDiscount + shippingWaived,
      couponCounted: false,
      // Immutable per-seller commission snapshot at placement time (rate
      // changes later never rewrite this order's history).
      commissionSnapshot: await computeCommissionSnapshot({ items: orderItems }),
    });

    // Real-time: refresh admin pending-orders badge without HTTP polling
    emitToAdmins("admin:stats-changed", { orderId: order._id });
    // Real-time: ping the seller so the dashboard pending-orders badge updates live
    await notifyOrderSellersOfNewOrder(order._id);
    // Real-time: new orders bump brand totalOrders (seller stats)
    notifyBrandStatsChanged(await orderBrands(order));

    // Clear the transient hold; real stock drops only on payment/cod via finalizeStockForOrder
    for (const reservation of reservations) {
      if (reservation) {
        const model = mongoose.model(reservation.constructor.modelName);
        await model.findByIdAndUpdate(reservation._id, { $set: { reservedStock: 0 } }, { new: true });
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/payment?success=true&orderId=${order._id}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment?cancelled=true`,
      metadata: { orderId: order._id.toString() },
    });

    order.stripeSessionId = session.id;
    await order.save();

    res.json({ success: true, sessionId: session.id, url: session.url });
  } catch (err) {
    // Release stock on error
    await releaseStock(reservations);
    throw err;
  }
});

export const verifyStripePayment = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
  if (session.payment_status === "paid") {
    const wasPaid = order.paymentStatus === "paid";
    order.paymentStatus = "paid";
    order.orderStatus = "processing";
    await order.save();
    await finalizeStockForOrder(order);
    // Count coupon usage exactly once (webhook and this verify may race)
    if (order.coupon) await recordCouponUse(order);
    // Stripe webhook is the primary path; the client verify is a fallback
    // that may run after the webhook, so only notify when truly new.
    if (!wasPaid) await notifyAdminsOfOrder(order);
    res.json({ success: true, order: await Order.findById(order._id) });
  } else {
    res.status(400);
    throw new Error("Payment not completed");
  }
});

export const handleStripeFailure = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const order = await Order.findById(orderId);
  if (order) {
    order.paymentStatus = "failed";
    order.orderStatus = "failed";
    await order.save();
  }
  res.json({ success: true, message: "Payment failure recorded" });
});

export const placeCODOrder = asyncHandler(async (req, res) => {
  validateCheckoutBody(req, res);
  const { items, shippingAddress } = req.body;
  let subtotal = 0;
  const orderItems = [];

  for (const item of items) {
    let product, variant, price, name, image;
    if (item.variantId) {
      variant = await Variant.findById(item.variantId);
      product = await Product.findById(variant.parentProduct);
      price = variant.price || product.price;
      name = `${product.name} - ${variant.sku}`;
      image = variant.images?.[0] || product.images?.[0];
    } else {
      product = await Product.findById(item.productId);
      price = product.price;
      name = product.name;
      image = product.images?.[0];
    }
    subtotal += price * item.quantity;
    orderItems.push({
      product: item.productId,
      variant: item.variantId,
      name,
      image,
      quantity: item.quantity,
      price,
    });
  }

  const shippingConfig = await getShippingConfig();

  // Coupon (validated server-side) — freeshipping waives the delivery fee
  const { coupon: appliedCoupon, couponDiscount } = await applyOrderCoupon(
    req,
    res,
    subtotal,
    shippingConfig
  );
  const freeShippingCoupon = appliedCoupon?.discountType === "freeshipping";
  const payableSubtotal = Math.max(0, subtotal - couponDiscount);
  const shippingWithoutCoupon =
    payableSubtotal >= shippingConfig.freeThreshold ? 0 : shippingConfig.standardCost;
  const shippingCost = freeShippingCoupon ? 0 : shippingWithoutCoupon;
  const shippingWaived = freeShippingCoupon ? shippingWithoutCoupon : 0;

  // Reserve stock temporarily for COD order
  const reservations = await reserveStock(items);

  try {
    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod: "cod",
      paymentStatus: "pending",
      orderStatus: "pending",
      totalPrice: payableSubtotal + shippingCost,
      shippingCost,
      coupon: appliedCoupon
        ? {
            _id: appliedCoupon._id,
            code: appliedCoupon.code,
            discountType: appliedCoupon.discountType,
            discountValue: appliedCoupon.discountValue,
            discountAmount: couponDiscount + shippingWaived,
          }
        : undefined,
      discountTotal: couponDiscount + shippingWaived,
      couponCounted: false,
      // Immutable per-seller commission snapshot at placement time (rate
      // changes later never rewrite this order's history).
      commissionSnapshot: await computeCommissionSnapshot({ items: orderItems }),
    });

    // COD: order counts immediately, so finalize real stock now
    await finalizeStockForOrder(order);

    // COD orders consume the coupon right away (counted exactly once)
    if (appliedCoupon) await recordCouponUse(order);

    // Real-time: refresh admin pending-orders badge without HTTP polling
    emitToAdmins("admin:stats-changed", { orderId: order._id });
    // Real-time: ping the seller so the dashboard pending-orders badge updates live
    await notifyOrderSellersOfNewOrder(order._id);
    // Real-time: new orders bump brand totalOrders (seller stats)
    notifyBrandStatsChanged(await orderBrands(order));

    await notifyAdminsOfOrder(order);

    res.status(201).json({ success: true, order });
  } catch (err) {
    // Release stock on error
    await releaseStock(reservations);
    throw err;
  }
});

const notifyAdminsOfOrder = async (order) => {
  try {
    const admins = await User.find({ role: "admin" });
    const messageText = `New order #${order._id} placed - Rs. ${order.totalPrice?.toLocaleString() || "N/A"}`;
    let lastMsg = null;
    for (const admin of admins) {
      lastMsg = await Message.create({
        sender: order.user || admin._id,
        message: messageText,
        orderRef: order._id,
        senderType: "user",
        isAdmin: false,
        adminRead: false,
        userRead: true,
        sellerRead: false, // Counts toward the seller's unread badge
      });
    }
    // Real-time: let the seller's Messages page + badge react instantly
    if (lastMsg) await notifyOrderSellers(order._id, lastMsg);
  } catch (err) {
    console.error("Failed to notify admins:", err);
  }
};

export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    res.status(400).json({ error: "Webhook signature verification failed" });
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      const order = await Order.findById(orderId);
      if (order && order.paymentStatus !== "paid") {
        order.paymentStatus = "paid";
        order.orderStatus = "processing";
        await order.save();
        await finalizeStockForOrder(order);
        // Count coupon usage exactly once (client verify may also run)
        if (order.coupon) await recordCouponUse(order);
        await notifyAdminsOfOrder(order);
      }
    }
  } else if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      const order = await Order.findById(orderId);
      if (order) {
        order.paymentStatus = "failed";
        order.orderStatus = "failed";
        await order.save();
      }
    }
  } else if (event.type === "charge.refunded") {
    const charge = event.data.object;
    // Handle refund events if needed
    console.log(`Refund event: ${JSON.stringify(charge)}`);
  }

  res.json({ received: true });
};