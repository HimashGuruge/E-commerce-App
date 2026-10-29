import mongoose from "mongoose";

/**
 * One submission = a seller remitting their commission separately
 * (Seller.commissionMode: "seller_pays"). Admin verifies or rejects.
 *
 *   pending      — seller submitted (payment details + proof uploaded).
 *                  Waiting for admin.
 *   verified     — admin confirmed the money arrived. Amount is counted
 *                  toward the commission that would otherwise have been
 *                  deducted from payouts.
 *   rejected     — admin rejected (wrong amount, proof missing, etc.).
 *                  Seller may submit a fresh one for the same period.
 *   cancelled    — seller cancelled a pending submission (proof deleted).
 *
 * `seller` is the seller's USER id (same key as CODCollection / SellerPayout).
 *
 * Money is never trusted from the client: `grossCommission` is computed
 * server-side from verified (collected/eligible) CODCollection rows for the
 * claimed period. The seller only picks the period and reports what they
 * paid; admin verifies both.
 *
 * Database guarantee: there is at most one live (pending/verified)
 * submission per (seller, period) — a partial unique index on non-terminal
 * statuses, so a rejected or cancelled period can be re-submitted.
 */
const commissionPaymentSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    periodFrom: { type: Date, required: true },
    periodTo: { type: Date, required: true },

    // Server-computed at submit time: sum of commission on the seller's
    // verified COD collection rows in [periodFrom, periodTo).
    grossCommission: { type: Number, default: 0 },

    // What the seller reports they paid + supporting proof
    paidAmount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, default: "" },
    paymentRef: { type: String, default: "" },
    paidAt: { type: Date, default: null },
    note: { type: String, default: "" },

    // Private storage object path only (NEVER a URL). Access is only via
    // short-lived signed URLs minted server-side.
    proofPath: { type: String, default: "" },

    status: { type: String, enum: ["pending", "verified", "rejected", "cancelled"], default: "pending", index: true },

    // Admin decision
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rejectReason: { type: String, default: "" },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    auditLog: [
      {
        at: { type: Date, default: Date.now },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        action: { type: String, default: "" },
        note: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

// One live submission per seller per period.
commissionPaymentSchema.index(
  { seller: 1, periodFrom: 1, periodTo: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["pending", "verified"] } } }
);

export default mongoose.model("CommissionPayment", commissionPaymentSchema);
