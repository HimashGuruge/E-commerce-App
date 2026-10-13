import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { emitToUser } from "./socketService.js";
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
