import Order from "../models/Order.js";
import Notification from "../models/Notification.js";
import Feedback from "../models/Feedback.js";
import ReturnRequest from "../models/ReturnRequest.js";
import { emitToUser } from "./socketService.js";

/**
 * Idempotently create review reminders for an order that just became delivered.
 * Safe to call repeatedly for the same order (the unique partial index plus the
 * pre-check make this idempotent).
 */
export async function generateReviewReminders(order) {
  if (!order || !order.items?.length) return [];

  // Reminders only exist for delivered orders. Both production callers
  // fire on the transition into "delivered"; this keeps the service safe
  // if called with other statuses too.
  if (order.orderStatus !== "delivered") return [];
  const created = [];

  for (const item of order.items) {
    if (!item.product) continue;

    // Already reviewed this product? No reminder.
    const existingReview = await Feedback.findOne({
      user: order.user,
      product: item.product,
      status: "approved",
    });
    if (existingReview) continue;

    // Product fully returned/refunded for this order? No reminder.
    const returned = await hasFullyReturnedItem(order, item);
    if (returned) continue;

    try {
      const notification = await Notification.create({
        user: order.user,
        type: "REVIEW_REMINDER",
        title: "How was your purchase?",
        message: "Share your experience and rate your product.",
        product: item.product,
        variant: item.variant || null,
        order: order._id,
      });
      created.push(notification);

      // Real-time: bump the buyer's notification badge if they're online
      emitToUser(order.user, "notification:new", {
        id: notification._id,
        type: notification.type,
      });
    } catch (err) {
      // E11000 duplicate key → another run already created it. Ignore.
      if (err.code !== 11000) throw err;
    }
  }

  return created;
}

/**
 * Mark every pending review reminder for an order as submitted, so the same
 * purchase never produces another reminder.
 */
export async function markRemindersSubmitted(orderId) {
  await Notification.updateMany(
    { order: orderId, type: "REVIEW_REMINDER", reviewSubmitted: false },
    { $set: { reviewSubmitted: true } }
  );
}

/**
 * A product may not have been bought yet but a delivered order exists —
 * eligibility for reviewing a product requires one of the caller's orders
 * containing that product to be delivered.
 */
export async function findQualifyingOrderForReview(userId, productId) {
  const order = await Order.findOne({
    user: userId,
    orderStatus: "delivered",
    "items.product": productId,
  });
  return order;
}

/**
 * Has the given order item's product been fully covered by a completed
 * (refunded/returned) return request?
 */
export async function hasFullyReturnedItem(order, item) {
  const requests = await ReturnRequest.find({
    order: order._id,
    status: { $in: ["refunded", "completed"] },
  });

  for (const rr of requests) {
    const rrItem = rr.items.find(
      (i) =>
        String(i.product) === String(item.product) &&
        (!item.variant || String(i.variant || "none") === String(item.variant || "none"))
    );
    if (!rrItem) continue;
    if ((rrItem.quantity ?? 0) >= (item.quantity ?? 0)) return true;
  }
  return false;
}
