import mongoose from "mongoose";

/**
 * One row per Domex tracking check (cron or manual) — the full tracking
 * history for a shipment, plus the audit record for admin overrides.
 *
 *   source: "cron" | "manual" | "admin_override"
 *   status: "delivered" | "in_transit" | "ready_for_pickup" | "unknown"
 *           | "error" (network/parse failure) | "admin_override"
 */
const trackingEventSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    trackingNumber: { type: String, default: "" },
    status: { type: String, required: true },
    source: {
      type: String,
      enum: ["cron", "manual", "admin_override"],
      default: "cron",
    },
    error: { type: String, default: "" },
    // Audit fields (used by admin_override rows)
    reason: { type: String, default: "" },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note: { type: String, default: "" },
    checkedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

trackingEventSchema.index({ order: 1, checkedAt: -1 });

export default mongoose.model("TrackingEvent", trackingEventSchema);
