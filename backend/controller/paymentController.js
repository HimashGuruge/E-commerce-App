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
  const shippingCost = subtotal >= shippingConfig.freeThreshold ? 0 : shippingConfig.standardCost;

  // Reserve stock temporarily
  const reservations = await reserveStock(items);

  try {
    const order = await Order.create({
      user: req.user._id,
      items: items.map((item) => ({
        product: item.productId,
        variant: item.variantId,
        quantity: item.quantity,
        price: item.variantId ? undefined : undefined,
      })),
      shippingAddress,
      paymentMethod: "stripe",
      totalPrice: subtotal + shippingCost,
      shippingCost,
      orderStatus: "pending",
    });

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
    order.paymentStatus = "paid";
    order.orderStatus = "processing";
    await order.save();
    await finalizeStockForOrder(order);
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
    let price;
    if (item.variantId) {
      const variant = await Variant.findById(item.variantId);
      const product = await Product.findById(variant.parentProduct);
      price = variant.price || product.price;
    } else {
      const product = await Product.findById(item.productId);
      price = product.price;
    }
    subtotal += price * item.quantity;
    orderItems.push({
      product: item.productId,
      variant: item.variantId,
      quantity: item.quantity,
      price,
    });
  }

  const shippingConfig = await getShippingConfig();
  const shippingCost = subtotal >= shippingConfig.freeThreshold ? 0 : shippingConfig.standardCost;

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
      totalPrice: subtotal + shippingCost,
      shippingCost,
    });

    // COD: order counts immediately, so finalize real stock now
    await finalizeStockForOrder(order);

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
    for (const admin of admins) {
      await Message.create({
        sender: order.user || admin._id,
        message: messageText,
        orderRef: order._id,
        senderType: "user",
        isAdmin: false,
        adminRead: false,
        userRead: true,
      });
    }
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