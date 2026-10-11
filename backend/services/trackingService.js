import cron from "node-cron";
import Order from "../models/Order.js";
import Message from "../models/Message.js";
import { emitToUser } from "./socketService.js";
import { generateReviewReminders } from "./reviewReminderService.js";

const DOMEX_TRACK_URL = "https://www.domex.lk/track?tracking=";

async function checkDomexTracking(trackingNumber) {
  try {
    const response = await fetch(`${DOMEX_TRACK_URL}${encodeURIComponent(trackingNumber)}`, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!response.ok) return null;

    const html = await response.text();

    if (html.includes("Delivered") || html.includes("delivered") || html.includes("DELIVERED")) {
      return "delivered";
    }
    if (html.includes("In Transit") || html.includes("in transit") || html.includes("In-Transit")) {
      return "in_transit";
    }
    if (html.includes("Pickup") || html.includes("Ready for Pickup")) {
      return "ready_for_pickup";
    }

    return "unknown";
  } catch {
    return null;
  }
}

async function processShippedOrders() {
  console.log("[TrackingService] Checking shipped orders...");
  try {
    const shippedOrders = await Order.find({
      orderStatus: "shipped",
      trackingNumber: { $ne: null, $ne: "" },
    });

    if (shippedOrders.length === 0) {
      console.log("[TrackingService] No shipped orders with tracking numbers found");
      return;
    }

    let updatedCount = 0;
    for (const order of shippedOrders) {
      const domexStatus = await checkDomexTracking(order.trackingNumber);

      if (domexStatus === "delivered") {
        order.orderStatus = "delivered";
        await order.save();

        try {
          await Message.create({
            sender: order.user,
            recipient: order.user,
            orderRef: order._id,
            message: `✅ Order #${order._id} has been delivered (auto-detected via tracking).`,
            senderType: "bot",
            isAdmin: true,
            isBot: true,
            adminRead: true,
            userRead: false,
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

        updatedCount++;

        // Real-time: tell the buyer's open orders page immediately
        emitToUser(order.user, "order:update", {
          orderId: order._id,
          orderStatus: "delivered",
        });
        console.log(`[TrackingService] Order ${order.orderId || order._id} auto-marked as delivered`);
      }
    }
    console.log(`[TrackingService] Done. ${updatedCount}/${shippedOrders.length} orders updated`);
  } catch (err) {
    console.error("[TrackingService] Error:", err.message);
  }
}

const AUTO_DELIVER_DAYS = 3;

async function autoDeliverStaleShipped() {
  const cutoff = new Date(Date.now() - AUTO_DELIVER_DAYS * 24 * 60 * 60 * 1000);
  const stale = await Order.find({ orderStatus: "shipped", updatedAt: { $lte: cutoff } });
  if (stale.length === 0) return;
  for (const order of stale) {
    order.orderStatus = "delivered";
    order.domexStatus = "delivered";
    await order.save();
    emitToUser(order.user, "order:update", { orderId: order._id, orderStatus: "delivered" });
  }
  console.log(`[TrackingService] Auto-delivered ${stale.length} stale shipped orders (shipped before ${cutoff.toISOString()})`);
}

let trackingTask = null;
let autoDeliverTask = null;

export function startTrackingCron() {
  trackingTask = cron.schedule("0 */6 * * *", () => {
    processShippedOrders();
  });
  console.log("[TrackingService] Cron scheduled: every 6 hours");
  autoDeliverTask = cron.schedule("0 3 * * *", () => {
    autoDeliverStaleShipped();
  });
  console.log("[TrackingService] Cron scheduled: daily auto-deliver at 3:00 AM");
}

export function stopTrackingCron() {
  if (trackingTask) {
    trackingTask.stop();
  }
  if (autoDeliverTask) {
    autoDeliverTask.stop();
  }
}

export { processShippedOrders };
