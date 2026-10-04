import cron from "node-cron";
import Order from "../models/Order.js";
import Message from "../models/Message.js";

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
      status: "shipped",
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
        order.status = "delivered";
        order.deliveredAt = new Date();
        await order.save();

        await Message.create({
          sender: order.user || null,
          isAdmin: true,
          userRead: false,
          text: `✅ Order #${order.orderId || order._id} has been delivered (auto-detected via tracking).`,
          sentAt: new Date(),
        });

        updatedCount++;
        console.log(`[TrackingService] Order ${order.orderId || order._id} auto-marked as delivered`);
      }
    }
    console.log(`[TrackingService] Done. ${updatedCount}/${shippedOrders.length} orders updated`);
  } catch (err) {
    console.error("[TrackingService] Error:", err.message);
  }
}

export function startTrackingCron() {
  cron.schedule("0 */6 * * *", () => {
    processShippedOrders();
  });
  console.log("[TrackingService] Cron scheduled: every 6 hours");
}

export { processShippedOrders };
