import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { emitToUser, emitToAll } from "./socketService.js";
import logger from "../utils/logger.js";

// Push a real-time "new chat message" ping to the seller(s) behind an order.
// Used by the payment flow (new order) and buyer support messages that are
// linked to one of the seller's orders.
export const notifyOrderSellers = async (orderId, message) => {
  try {
    if (!orderId) return;
    const order = await Order.findById(orderId).select("items").lean();
    if (!order) return;

    const productIds = (order.items || [])
      .map((i) => (i.product ? String(i.product) : null))
      .filter(Boolean);
    if (!productIds.length) return;

    const sellers = await Product.find({ _id: { $in: productIds } }).select("seller").lean();
    const sellerIds = [...new Set(sellers.map((s) => s.seller && String(s.seller)).filter(Boolean))];
    for (const sid of sellerIds) {
      emitToUser(sid, "seller:new-message", { id: message._id });
    }
  } catch (err) {
    logger.error("Failed to notify sellers of new message:", err);
  }
};

// Push a real-time "new order arrived" ping to the seller(s) behind an order,
// so the seller dashboard's pending-orders badge updates live.
export const notifyOrderSellersOfNewOrder = async (orderId) => {
  try {
    if (!orderId) return;
    const order = await Order.findById(orderId).select("items").lean();
    if (!order) return;

    const productIds = (order.items || [])
      .map((i) => (i.product ? String(i.product) : null))
      .filter(Boolean);
    if (!productIds.length) return;

    const sellers = await Product.find({ _id: { $in: productIds } }).select("seller").lean();
    const sellerIds = [...new Set(sellers.map((s) => s.seller && String(s.seller)).filter(Boolean))];
    for (const sid of sellerIds) {
      emitToUser(sid, "seller:new-order", { orderId: order._id });
    }
  } catch (err) {
    logger.error("Failed to notify sellers of new order:", err);
  }
};

// Broadcast a "seller stats changed" ping to every connected client so open
// product pages refresh their Seller Information block (rating, ship on time,
// chat response rate) without a page reload.
export const notifyBrandStatsChanged = (brands) => {
  const unique = [
    ...new Set(
      (brands || [])
        .map((b) => (b === null || b === undefined ? "" : String(b).trim()))
        .filter((b) => b && b !== "undefined" && b !== "null")
    ),
  ];
  if (!unique.length) return;
  emitToAll("seller-stats:changed", { brands: unique });
};
