import cron from "node-cron";
import Order from "../models/Order.js";
import TrackingEvent from "../models/TrackingEvent.js";
import Notification from "../models/Notification.js";
import { emitToUser } from "./socketService.js";
import { generateReviewReminders } from "./reviewReminderService.js";
import { ensureCODCollection } from "./payoutService.js";

const DOMEX_TRACK_URL = "https://domex.lk/Order-Details.php?wbno=";

/**
 * Stuck-shipment visibility window: shipped orders whose last tracking check
 * is older than this (or which never got a known status) are flagged "stuck".
 * Visibility ONLY — orders are never auto-delivered by age.
 */
export const STUCK_AFTER_DAYS = 3;

let isRunning = false;

/**
 * Check one Domex tracking number.
 * Returns { status, error }:
 *   status = "delivered" | "in_transit" | "ready_for_pickup" | "unknown" | "error"
 *   error  = message when the fetch failed / page could not be read
 */
async function checkDomexTracking(trackingNumber) {
  let html;
  try {
    const response = await fetch(`${DOMEX_TRACK_URL}${encodeURIComponent(trackingNumber)}`, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!response.ok) {
      return { status: "error", error: `Domex returned HTTP ${response.status}` };
    }
    html = await response.text();
  } catch (err) {
    return { status: "error", error: err?.message || "Network error contacting Domex" };
  }

  if (html.includes("Delivered") || html.includes("delivered") || html.includes("DELIVERED")) {
    return { status: "delivered", error: "" };
  }
  if (html.includes("In Transit") || html.includes("in transit") || html.includes("In-Transit")) {
    return { status: "in_transit", error: "" };
  }
  if (html.includes("Pickup") || html.includes("Ready for Pickup")) {
    return { status: "ready_for_pickup", error: "" };
  }
  return { status: "unknown", error: "" };
}

async function processShippedOrders(source = "cron") {
  if (isRunning) {
    console.log("[TrackingService] Sync skipped — a tracking run is already in progress");
    return { skipped: true, checked: 0, delivered: 0, unknown: 0, errors: 0, at: new Date() };
  }
  isRunning = true;
  console.log(`[TrackingService] Checking shipped orders (source: ${source})...`);

  const stats = { checked: 0, delivered: 0, unknown: 0, errors: 0, at: new Date() };
  try {
    const shippedOrders = await Order.find({
      orderStatus: "shipped",
      trackingNumber: { $ne: null, $ne: "" },
    });

    if (shippedOrders.length === 0) {
      console.log("[TrackingService] No shipped orders with tracking numbers found");
      return stats;
    }

    for (const order of shippedOrders) {
      const { status, error } = await checkDomexTracking(order.trackingNumber);
      const now = new Date();
      stats.checked++;

      // Persist the recognized external status (separate from internal orderStatus)
      const update = { lastTrackedAt: now };
      if (status === "error") {
        update.trackingError = error;
        update.trackingErrorAt = now;
        stats.errors++;
      } else {
        update.domexStatus = status;
        update.trackingError = "";
        update.trackingErrorAt = undefined;
        if (status === "unknown") stats.unknown++;
      }

      try {
        await Order.findOneAndUpdate({ _id: order._id }, { $set: update });
      } catch (e) {
        console.error(`[TrackingService] Failed to persist tracking state for ${order._id}:`, e.message);
      }

      // Full history row for every check
      try {
        await TrackingEvent.create({
          order: order._id,
          trackingNumber: order.trackingNumber,
          status,
          source,
          error,
        });
      } catch (e) {
        console.error(`[TrackingService] Failed to store tracking event for ${order._id}:`, e.message);
      }

      // Only a real "delivered" result moves the order forward
      if (status === "delivered") {
        order.orderStatus = "delivered";
        await order.save();
        stats.delivered++;

        // COD delivery → pending ledger row (idempotent; delivery ≠ money received)
        try {
          if (order.paymentMethod === "cod") await ensureCODCollection(order);
        } catch (codErr) {
          console.error(`[TrackingService] COD ledger failed for order ${order._id}:`, codErr.message);
        }

        try {
          // Delivery detection is a transactional event: deliver it through the
          // notification feed, not the support chat. The "delivered" state
          // already triggers review reminders below.
          const statusNotice = await Notification.create({
            user: order.user,
            type: "ORDER_STATUS",
            order: order._id,
            title: "Order delivered",
            message: `✅ Order #${order._id} has been delivered (auto-detected via tracking).`,
          });
          emitToUser(order.user, "notification:new", {
            id: statusNotice._id,
            type: statusNotice.type,
          });
        } catch (msgErr) {
          console.error(`[TrackingService] Failed to notify user for order ${order._id}:`, msgErr.message);
        }

        // Review reminders: order just became delivered
        try {
          await generateReviewReminders(order);
        } catch (remErr) {
          console.error(`[TrackingService] Failed to create review reminders for order ${order._id}:`, remErr.message);
        }

        // Real-time: tell the buyer's open orders page immediately
        emitToUser(order.user, "order:update", {
          orderId: order._id,
          orderStatus: "delivered",
        });
        console.log(`[TrackingService] Order ${order.orderId || order._id} auto-marked as delivered`);
      }
    }
    console.log(`[TrackingService] Done. checked ${stats.checked}, delivered ${stats.delivered}, unknown ${stats.unknown}, errors ${stats.errors}`);
  } catch (err) {
    console.error("[TrackingService] Error:", err.message);
  } finally {
    isRunning = false;
  }
  return stats;
}

let trackingTask = null;

export function startTrackingCron() {
  trackingTask = cron.schedule("0 */6 * * *", () => {
    processShippedOrders("cron");
  });
  console.log("[TrackingService] Cron scheduled: every 6 hours");
}

export function stopTrackingCron() {
  if (trackingTask) {
    trackingTask.stop();
  }
}

export { processShippedOrders };
