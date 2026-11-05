import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Message from "../models/Message.js";
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

// Notify the seller(s) whose products are in a return request.
// Creates an inbox message (shows in the seller's Messages page) and emits a
// live ping so the unread badge refreshes without a reload.
// - New return:  senderType "user" (customer), no recipient — the seller inbox
//   picks it up via the orderRef scope.
// - Status change / admin note: senderType "admin", recipient = seller.
export const notifyReturnToSellers = async (returnRequest, { text, senderId, senderType = "user" }) => {
  try {
    if (!returnRequest?._id || !senderId) return;
    const productIds = (returnRequest.items || [])
      .map((i) => (i.product ? String(i.product) : null))
      .filter(Boolean);
    if (!productIds.length) return;

    const sellers = await Product.find({ _id: { $in: productIds } }).select("seller").lean();
    const sellerIds = [...new Set(sellers.map((s) => s.seller && String(s.seller)).filter(Boolean))];
    for (const sid of sellerIds) {
      if (sid === String(senderId)) continue; // never message the sender about their own action
      const msg = await Message.create({
        sender: senderId,
        recipient: senderType === "admin" ? sid : undefined,
        message: text,
        senderType,
        orderRef: returnRequest.order,
        returnRef: returnRequest._id,
        sellerRead: false,
        adminRead: false,
      });
      emitToUser(sid, "seller:new-message", { id: msg._id, returnRef: String(returnRequest._id) });
    }
  } catch (err) {
    logger.error("Failed to notify sellers of return:", err);
  }
};
