import mongoose from "mongoose";

/**
 * One ledger row per delivered COD order (per seller) plus reversal rows
 * created on refund. The money lifecycle is separate from order status:
 *
 *   pending_collection  → created when a COD order is delivered. The
 *                         courier's money has NOT been verified yet.
 *   collected           → admin verified the courier's remittance;
 *                         receivedAt + payoutDueAt are set.
 *   eligible_for_payout → payoutDueAt has passed (cron, idempotent).
 *   paid                → grouped in a payout that an admin confirmed as
 *                         paid (money moved outside the site).
 *   failed              → order cancelled before collection was verified.
 *   reversed            → reversal rows only (type = "reversal").
 *
 * Immutable commission snapshot: commissionRate/commissionAmount are copied
 * from the order's placement-time snapshot (order.commissionSnapshot).
 * Changing a seller's rate later never touches these values.
 *
 * Database guarantees (partial unique indexes):
 *  - at most one "collection" row per order
 *  - at most one "reversal" row per return request
 */
const codCollectionSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["collection", "reversal"], required: true, default: "collection" },
    status: {
      type: String,
      enum: ["pending_collection", "collected", "eligible_for_payout", "paid", "failed", "reversed"],
      required: true,
      default: "pending_collection",
      index: true,
    },
    // Sum of the seller's item prices (price x quantity) in the order
    expectedAmount: { type: Number, default: 0 },
    // Actual money received from the courier (set by admin verification —
    // can be less than expectedAmount because of courier deductions)
    grossCollected: { type: Number, default: 0 },
    // Immutable commission snapshot for this collection
    commissionRate: { type: Number, default: 0 },
    commissionAmount: { type: Number, default: 0 },
    // "order" = taken from order.commissionSnapshot (placement time)
    // "current_rate_backfill" = order predates snapshots; built lazily from
    // the seller's rate at backfill time and flagged for admin review
    snapshotSource: { type: String, enum: ["order", "current_rate_backfill"], default: "order" },
    // Verification of the courier's remittance
    receivedAt: { type: Date },
    courier: { type: String, default: "" },
    settlementRef: { type: String, default: "" },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Payout due date = UTC date of receivedAt + 10 calendar days
    payoutDueAt: { type: Date },
    // Payout this collection was allocated to (at most one — enforced by the
    // atomic conditional update at allocation time)
    allocatedPayout: { type: mongoose.Schema.Types.ObjectId, ref: "SellerPayout", default: null, index: true },
    // For reversal rows: the original collection this reverses
    reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: "CODCollection" },
    // For reversal rows: the return request that caused it (unique per request)
    returnRequest: { type: mongoose.Schema.Types.ObjectId, ref: "ReturnRequest" },
    // Return requests this collection has been adjusted by (audit-only)
    auditRef: [{ type: mongoose.Schema.Types.ObjectId, ref: "ReturnRequest" }],
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// One collection per order — a duplicate delivery event cannot create a second row
codCollectionSchema.index(
  { order: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "collection" },
  }
);
// One reversal per return request — reprocessing a refund cannot duplicate it
codCollectionSchema.index(
  { returnRequest: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "reversal" },
  }
);

export default mongoose.model("CODCollection", codCollectionSchema);
