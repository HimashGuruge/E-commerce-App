import mongoose from "mongoose";

/**
 * A grouped seller payout. A batch only becomes eligible when EVERY included
 * collection is eligible (the batch due date is the latest individual due
 * date). Money is never moved by the site: "paid" only happens after the
 * admin performs the transfer outside the system and records the reference.
 *
 *   processing           → created from eligible, unallocated collections
 *   eligible_for_payout  → payoutDueAt reached (cron, idempotent)
 *   paid                 → admin confirmed the external transfer + ref
 *   failed               → recorded failure (distinct from paid)
 *
 * Each included collection keeps its own individual due date, commission
 * snapshot, and verification record. The paid record is never overwritten:
 * duplicate confirmations are rejected at the database level (conditional
 * update from "eligible_for_payout" only).
 */
const sellerPayoutSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Individual collections grouped into this payout
    collections: [{ type: mongoose.Schema.Types.ObjectId, ref: "CODCollection" }],
    grossCollected: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 0 },
    commissionAmount: { type: Number, default: 0 },
    // Authorized deductions/adjustments applied by the admin at creation
    deductions: { type: Number, default: 0 },
    // netPayable = grossCollected - commissionAmount - deductions
    netPayable: { type: Number, default: 0 },
    // Latest of the individual collection due dates
    payoutDueAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["processing", "eligible_for_payout", "paid", "failed"],
      default: "processing",
      index: true,
    },
    paidAt: { type: Date },
    paymentRef: { type: String, default: "" },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    failedReason: { type: String, default: "" },
    failedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Audit trail — every admin action appends an entry (never rewritten)
    auditLog: [
      {
        at: { type: Date },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        action: { type: String },
        note: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("SellerPayout", sellerPayoutSchema);
