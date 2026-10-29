import mongoose from "mongoose";
import Seller from "../models/Seller.js";
import CommissionPayment from "../models/CommissionPayment.js";
import CODCollection from "../models/CODCollection.js";
import SellerPayout from "../models/SellerPayout.js";
import { uploadProof, getSignedProofUrl, deleteProof } from "./storageService.js";
import { createSellerAlert } from "../controller/notificationController.js";

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const normDate = (d) => {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const err = (message, status = 400) => Object.assign(new Error(message), { status });

/**
 * Sum of the commission owed on a seller's VERIFIED COD collection rows whose
 * receivedAt falls in [from, to). "Verified" = collected or eligible_for_payout.
 * This is the money the seller must remit when commissionMode = "seller_pays".
 * Allocated rows are NOT excluded here: commission that lands in a payout batch
 * is still owed to the platform — it is either deducted (deduct mode) or
 * collected here (seller_pays mode).
 */
async function owedCommissionInPeriod(sellerUserId, from, to) {
  const seller = String(sellerUserId);
  const [agg] = await CODCollection.aggregate([
    {
      $match: {
        seller: new mongoose.Types.ObjectId(seller),
        type: "collection",
        status: { $in: ["collected", "eligible_for_payout"] },
        receivedAt: { $gte: from, $lte: to },
      },
    },
    { $group: { _id: null, total: { $sum: "$commissionAmount" } } },
  ]);
  return round2(agg?.total || 0);
}

/**
 * Seller balance for the "seller_pays" mode.
 *
 *   OWED        = gross collected on verified rows  −  refunds credited
 *                 on those rows (reversal rows, gross is negative)
 *   deductedPaid= commission already taken from PAID payout batches
 *                 (SellerPayout status "paid", commissionAmount > 0)
 *   verifiedPaid= commission the seller proved they paid (verified submissions,
 *                 capped at the verified row's total so over-proofs don't count)
 *
 *   BALANCE = OWED − deductedPaid − verifiedPaid
 *
 * Only ELIGIBLE verified rows (receivedAt in period, type "collection") can be
 * proven. The balance is display-only; it is not written to the seller doc and
 * never triggers automatic reversals.
 */
export async function getSellerCommissionBalance(sellerUserId) {
  const seller = String(sellerUserId);

  const [totalRowAgg, eligibleCommissionAgg, paidPayoutAgg, verifiedPayments] = await Promise.all([
    // grossDue: collections (positive) + reversals (negative) across all
    // verified rows. This is the net the seller is owed by the platform on
    // the COD side (before commission is settled either way).
    CODCollection.aggregate([
      { $match: { seller: new mongoose.Types.ObjectId(seller), type: { $in: ["collection", "reversal"] }, status: { $in: ["collected", "eligible_for_payout", "paid", "reversed"] } } },
      { $group: { _id: null, gross: { $sum: "$grossCollected" } } },
    ]),
    // eligibleCommission: the COD commission on verified COLLECTION rows only.
    // This is the real commission owed to the platform and the cap on how
    // much of it a seller can count as separately-proven (no over-proof).
    CODCollection.aggregate([
      { $match: { seller: new mongoose.Types.ObjectId(seller), type: "collection", status: { $in: ["collected", "eligible_for_payout", "paid"] } } },
      { $group: { _id: null, total: { $sum: "$commissionAmount" } } },
    ]),
    // deductedPaid: commission already taken out of PAID payout batches
    // (the "deduct" path). Never double-counted in seller_pays mode.
    SellerPayout.aggregate([
      { $match: { seller: new mongoose.Types.ObjectId(seller), status: "paid" } },
      { $group: { _id: null, total: { $sum: { $cond: [{ $gt: ["$commissionAmount", 0] }, "$commissionAmount", 0] } } } },
    ]),
    // verifiedPaid: what the seller proved they remitted (verified submissions).
    CommissionPayment.find({ seller, status: "verified" }).select("paidAmount"),
  ]);

  const grossDue = round2(totalRowAgg?.gross || 0); // collections positive, reversals negative
  const eligibleCommission = round2(eligibleCommissionAgg?.total || 0);
  const deductedPaid = round2(paidPayoutAgg?.total || 0);

  // What the seller counted as paid, capped so an over-proof can never
  // offset more commission than actually existed on eligible rows.
  const verifiedRaw = round2(verifiedPayments.reduce((s, v) => s + (Number(v.paidAmount) || 0), 0));
  const verifiedPaid = round2(Math.min(verifiedRaw, eligibleCommission));

  const balance = round2(grossDue - deductedPaid - verifiedPaid);

  return {
    commissionMode: "seller_pays",
    grossDue,
    eligibleCommission,
    deductedPaid,
    verifiedPaid,
    balance,
    // Display-only flag: balance went negative (refunds > owed) → "credit".
    credit: balance < 0,
  };
}

/**
 * Seller submits a commission payment for a period.
 *
 * - Seller is only allowed to submit when commissionMode = "seller_pays".
 * - grossCommission is computed server-side (never trusted from the client).
 * - Proof is uploaded to the PRIVATE commission-proofs bucket (owner-keyed).
 * - Only the stored object path is persisted — never a URL.
 * - A live (pending/verified) submission for the same period is rejected.
 */
export async function submitCommissionPayment(sellerUserId, { periodFrom, periodTo, paidAmount, paymentMethod, paymentRef, paidAt, note }, file) {
  const seller = String(sellerUserId);
  const sellerDoc = await Seller.findOne({ user: seller });
  if (!sellerDoc) throw err("Seller not found", 404);
  if (sellerDoc.commissionMode !== "seller_pays") {
    throw err("Your commission is deducted from payouts automatically. You do not need to pay it separately.", 400);
  }

  const from = normDate(periodFrom);
  const to = normDate(periodTo);
  if (!from || !to) throw err("periodFrom and periodTo are required (valid dates)");
  if (to < from) throw err("periodTo must be on or after periodFrom");

  const paid = Number(paidAmount);
  if (!Number.isFinite(paid) || paid < 0) throw err("A valid paidAmount (>= 0) is required");

  // Duplicate guard: a live submission already exists for this exact period.
  const existing = await CommissionPayment.findOne({ seller, periodFrom: from, periodTo: to, status: { $in: ["pending", "verified"] } });
  if (existing) throw err("A commission payment for this period is already submitted", 409);

  const grossCommission = await owedCommissionInPeriod(seller, from, to);

  let proofPath = "";
  if (file) {
    proofPath = await uploadProof(file, seller);
  }

  const payment = await CommissionPayment.create({
    seller: sellerDoc.user, // User id (matches CODCollection / SellerPayout key)
    periodFrom: from,
    periodTo: to,
    grossCommission,
    paidAmount: paid,
    paymentMethod: String(paymentMethod || "").trim(),
    paymentRef: String(paymentRef || "").trim(),
    paidAt: normDate(paidAt),
    note: String(note || "").trim(),
    proofPath,
    status: "pending",
    auditLog: [{ at: new Date(), by: sellerDoc.user, action: "submitted", note: `Proof ${proofPath ? "attached" : "not attached"}` }],
  });

  return payment;
}

/**
 * Seller views their own submissions (newest first). Each row includes
 * `hasProof` so the UI can offer to open the signed URL on demand.
 */
export async function getSellerCommissionPayments(sellerUserId) {
  const seller = String(sellerUserId);
  const rows = await CommissionPayment.find({ seller }).sort({ createdAt: -1 });
  return rows.map((r) => ({
    ...r.toObject(),
    proofPath: undefined, // never expose the raw path to the client
    hasProof: !!r.proofPath,
  }));
}

/**
 * Seller fetches a SHORT-LIVED signed URL for their own proof (own doc only).
 */
export async function getSellerProofUrl(paymentId, sellerUserId) {
  const seller = String(sellerUserId);
  const payment = await CommissionPayment.findOne({ _id: paymentId, seller });
  if (!payment) throw err("Payment not found", 404);
  if (!payment.proofPath) throw err("No proof was attached to this payment", 404);
  const { signedUrl, expiresIn } = await getSignedProofUrl(payment.proofPath);
  return { signedUrl, expiresInSeconds: expiresIn };
}

/**
 * Seller cancels a PENDING submission. The proof is deleted from storage.
 * Only the owner can cancel their own pending submission.
 */
export async function cancelCommissionPayment(paymentId, sellerUserId) {
  const seller = String(sellerUserId);
  const updated = await CommissionPayment.findOneAndUpdate(
    { _id: paymentId, seller, status: "pending" },
    {
      $set: { status: "cancelled" },
      $push: { auditLog: { at: new Date(), by: seller, action: "cancelled" } },
    },
    { new: true }
  );
  if (!updated) throw err("Only your own pending submissions can be cancelled", 404);

  if (updated.proofPath) {
    await deleteProof(updated.proofPath);
  }
  return updated;
}

// ---- Admin: verify / reject ----

/** Admin lists all commission payments (optionally by status) newest first. */
export async function adminGetCommissionPayments({ status, seller } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (seller && mongoose.isValidObjectId(seller)) filter.seller = new mongoose.Types.ObjectId(seller);
  const rows = await CommissionPayment.find(filter).sort({ createdAt: -1 }).limit(500);
  // Enrich with seller shop name for the admin UI.
  const userMap = new Map();
  for (const r of rows) {
    if (!userMap.has(String(r.seller))) {
      const s = await Seller.findOne({ user: r.seller }).select("shopName commissionMode");
      userMap.set(String(r.seller), s ? { shopName: s.shopName, commissionMode: s.commissionMode } : null);
    }
  }
  return rows.map((r) => ({ ...r.toObject(), proofPath: undefined, hasProof: !!r.proofPath, sellerInfo: userMap.get(String(r.seller)) }));
}

/** Admin fetches a short-lived signed URL for one payment's proof. */
export async function adminGetProofUrl(paymentId) {
  const payment = await CommissionPayment.findById(paymentId);
  if (!payment) throw err("Payment not found", 404);
  if (!payment.proofPath) throw err("No proof was attached to this payment", 404);
  const { signedUrl, expiresIn } = await getSignedProofUrl(payment.proofPath);
  return { signedUrl, expiresInSeconds: expiresIn };
}

/**
 * Admin verifies a pending submission: money confirmed received.
 * Conditional update from pending → verified (race-safe; duplicate = 409).
 * Sends the seller an alert.
 */
export async function adminVerifyCommissionPayment(paymentId, adminUser, note) {
  const payment = await CommissionPayment.findById(paymentId);
  if (!payment) throw err("Payment not found", 404);
  if (payment.status !== "pending") throw err(`Payment is not pending (status: ${payment.status})`, 409);

  const updated = await CommissionPayment.findOneAndUpdate(
    { _id: paymentId, status: "pending" },
    {
      $set: { status: "verified", verifiedAt: new Date(), verifiedBy: adminUser?._id },
      $push: { auditLog: { at: new Date(), by: adminUser?._id, action: "verified", note: String(note || "").trim() || "Commission payment verified" } },
    },
    { new: true }
  );
  if (!updated) throw err("Payment is no longer pending", 409);

  await alertSeller(payment.seller, "Commission payment verified", `Your commission payment for ${formatRange(payment)} was verified. It has been applied to your balance.`);
  return updated;
}

/**
 * Admin rejects a pending submission (kept for audit; proof retained).
 * Seller may submit a fresh one for the same period after rejection.
 */
export async function adminRejectCommissionPayment(paymentId, adminUser, reason) {
  if (!reason || !String(reason).trim()) throw err("A rejection reason is required", 400);
  const payment = await CommissionPayment.findById(paymentId);
  if (!payment) throw err("Payment not found", 404);
  if (payment.status !== "pending") throw err(`Payment is not pending (status: ${payment.status})`, 409);

  const updated = await CommissionPayment.findOneAndUpdate(
    { _id: paymentId, status: "pending" },
    {
      $set: { status: "rejected", rejectedAt: new Date(), rejectedBy: adminUser?._id, rejectReason: String(reason).trim() },
      $push: { auditLog: { at: new Date(), by: adminUser?._id, action: "rejected", note: String(reason).trim() } },
    },
    { new: true }
  );
  if (!updated) throw err("Payment is no longer pending", 409);

  await alertSeller(payment.seller, "Commission payment rejected", `Your commission payment for ${formatRange(payment)} was rejected: ${String(reason).trim()}. You can submit a new one for the same period.`);
  return updated;
}

// ---- helpers ----

const formatRange = (p) => {
  const f = p.periodFrom ? p.periodFrom.toISOString().slice(0, 10) : "";
  const t = p.periodTo ? p.periodTo.toISOString().slice(0, 10) : "";
  return `${f} to ${t}`;
};

// Fire-and-forget seller alert (alert failures never block admin action).
async function alertSeller(sellerUserId, title, message) {
  try {
    await createSellerAlert({ user: sellerUserId, title, message });
  } catch (_) {}
}
