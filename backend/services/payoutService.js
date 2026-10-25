import cron from "node-cron";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Seller from "../models/Seller.js";
import CODCollection from "../models/CODCollection.js";
import SellerPayout from "../models/SellerPayout.js";
import ReturnRequest from "../models/ReturnRequest.js";
import { emitToAdmins } from "./socketService.js";
import logger from "../utils/logger.js";

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Due-date rule (documented):
 *   payoutDueAt = the UTC calendar date of receivedAt PLUS 10 calendar days,
 *                 at 00:00:00 UTC.
 * Example: received 2026-10-01T15:04:00Z  →  due 2026-10-11T00:00:00Z.
 * The period never starts from order creation or delivery.
 */
export function addCalendarDaysUTC(fromDate, days) {
  const base = Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate());
  return new Date(base + days * 86400000);
}

/** Map seller (User id string) → sum of that seller's item totals in the order. */
export async function orderSellerTotals(order) {
  const ids = [...new Set((order.items || []).map((i) => i.product).filter(Boolean))];
  if (!ids.length) return {};
  const products = await Product.find({ _id: { $in: ids } }).select("seller").lean();
  const bySeller = {};
  for (const item of order.items || []) {
    const prod = products.find((p) => String(p._id) === String(item.product));
    if (!prod || !prod.seller) continue;
    const sid = String(prod.seller);
    bySeller[sid] = (bySeller[sid] || 0) + (item.price || 0) * (item.quantity || 0);
  }
  return bySeller;
}

/**
 * Build the immutable, per-seller commission snapshot for an order using the
 * sellers' rates AT THIS MOMENT. Called at order placement (the earliest
 * reliable pricing stage), so later rate changes never rewrite history.
 * Returns [{ seller, rate, amount }].
 */
export async function computeCommissionSnapshot(order) {
  const totals = await orderSellerTotals(order);
  const out = [];
  for (const [sid, total] of Object.entries(totals)) {
    const seller = await Seller.findOne({ user: sid }).select("commissionRate");
    const rate = seller?.commissionRate || 0;
    out.push({ seller: sid, rate: Number(rate) || 0, amount: round2((total * rate) / 100) });
  }
  return out;
}

/**
 * Ensure a delivered COD order has its pending_collection ledger rows.
 * Idempotent: the partial unique index on (order, type:"collection") makes a
 * duplicate delivery event impossible. Delivery alone never means money was
 * received — rows start as pending_collection only.
 */
export async function ensureCODCollection(order) {
  if (!order || order.paymentMethod !== "cod" || order.orderStatus !== "delivered") return null;

  const existing = await CODCollection.findOne({ order: order._id, type: "collection" });
  if (existing) return Array.isArray(existing) ? existing : [existing];

  const totals = await orderSellerTotals(order);
  const snapshot = order.commissionSnapshot || [];
  const source = snapshot.length ? "order" : "current_rate_backfill";

  const rows = [];
  for (const [sid, total] of Object.entries(totals)) {
    const entry = snapshot.find((e) => String(e.seller) === sid);
    const rate = entry ? Number(entry.rate) || 0 : Number(entry?.amount / Math.max(total, 1)) || 0;
    const amount = entry ? Number(entry.amount) || 0 : round2((total * rate) / 100);
    rows.push({
      order: order._id,
      seller: sid,
      type: "collection",
      status: "pending_collection",
      expectedAmount: round2(total),
      commissionRate: rate,
      commissionAmount: round2(amount),
      snapshotSource: source,
    });
  }
  if (!rows.length) return null;

  let created;
  try {
    created = await CODCollection.create(rows);
  } catch (err) {
    if (err?.code === 11000) {
      // Lost a concurrent insert race — return the winner's rows.
      const winner = await CODCollection.find({ order: order._id, type: "collection" });
      return winner;
    }
    throw err;
  }
  try {
    emitToAdmins("admin:stats-changed", { type: "payout", orderId: order._id });
  } catch {}
  return created;
}

/**
 * Backfill the commission snapshot for an old delivered COD order that was
 * created before snapshots existed. The rate is the seller's CURRENT rate at
 * backfill time (best available approximation for unknown history) and the
 * collection rows are flagged snapshotSource: "current_rate_backfill" so the
 * admin can review them. Order snapshot is stored, never recomputed silently.
 */
export async function backfillOrderSnapshot(orderId) {
  const order = await Order.findById(orderId);
  if (!order) return { ok: false, error: "not_found" };
  if (order.paymentMethod !== "cod") return { ok: false, error: "not_cod" };
  if (order.commissionSnapshot?.length) {
    return { ok: false, error: "already_snapshot", collection: await CODCollection.find({ order: order._id, type: "collection" }) };
  }

  const snapshot = await computeCommissionSnapshot(order);
  order.commissionSnapshot = snapshot;
  await order.save();

  const rows = await ensureCODCollection(order);
  return { ok: true, backfilled: true, snapshot, collection: rows || [] };
}

/**
 * Cancellation: unverified (pending_collection) rows for the order become
 * failed — they never become payout-eligible. Verified rows are left alone
 * (already-received money needs an explicit reversal/adjustment instead).
 */
export async function failPendingCollectionsForOrder(orderId) {
  const res = await CODCollection.updateMany(
    { order: orderId, type: "collection", status: "pending_collection" },
    { $set: { status: "failed" } }
  );
  return res.modifiedCount;
}

/**
 * Refund/return: create an idempotent reversal row for the return request.
 * The row is negative (gross = -refundAmount, commission proportional at the
 * original collection's rate). It is linked to the original collection and
 * stays unallocated until the admin includes it in a NEW payout batch —
 * already-paid payouts are never touched.
 */
export async function createReversalForReturn(returnRequestId, refundAmount, adminUserId) {
  const rr = await ReturnRequest.findById(returnRequestId);
  if (!rr) throw Object.assign(new Error("Return request not found"), { status: 404 });

  const existing = await CODCollection.findOne({ returnRequest: rr._id, type: "reversal" });
  if (existing) return { ok: true, duplicate: true, row: existing };

  const original = await CODCollection.findOne({ order: rr.order, type: "collection" });

  const gross = -Math.abs(Number(refundAmount) || 0);
  const rate = original ? Number(original.commissionRate) || 0 : 0;
  const amount = round2((Math.abs(gross) * rate) / 100);

  let row;
  try {
    row = await CODCollection.create({
      order: rr.order,
      seller: original?.seller,
      type: "reversal",
      status: "reversed",
      expectedAmount: 0,
      grossCollected: gross,
      commissionRate: rate,
      commissionAmount: -amount, // negative: commission owed back to seller
      snapshotSource: "order",
      reversalOf: original?._id,
      returnRequest: rr._id,
      notes: `Reversal for return request ${rr._id}`,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return { ok: true, duplicate: true, row: await CODCollection.findOne({ returnRequest: rr._id, type: "reversal" }) };
    }
    throw err;
  }

  // Audit the adjustment against the original collection
  if (original) {
    await CODCollection.updateOne(
      { _id: original._id },
      { $push: { auditRef: rr._id } }
    );
  }
  logger.info(`[Payout] Reversal ${row._id} created for return ${rr._id} (-${Math.abs(gross)})`);
  return { ok: true, row };
}

/**
 * Admin verifies the courier's remittance for one collection.
 * Only an admin-verified amount may set receivedAt / payoutDueAt.
 * Conditional on status pending_collection → duplicate verify = 409.
 */
export async function verifyCODCollection(collectionId, { grossCollected, courier, settlementRef }, adminUser) {
  const gross = Number(grossCollected);
  if (!Number.isFinite(gross) || gross < 0) throw Object.assign(new Error("grossCollected must be a non-negative number"), { status: 400 });
  if (!settlementRef || !String(settlementRef).trim()) throw Object.assign(new Error("settlementRef is required"), { status: 400 });

  const updated = await CODCollection.findOneAndUpdate(
    { _id: collectionId, type: "collection", status: "pending_collection" },
    {
      $set: {
        status: "collected",
        grossCollected: round2(gross),
        receivedAt: new Date(),
        payoutDueAt: addCalendarDaysUTC(new Date(), 10),
        courier: String(courier || "").trim(),
        settlementRef: String(settlementRef).trim(),
        verifiedBy: adminUser?._id,
      },
    },
    { new: true }
  );
  if (!updated) throw Object.assign(new Error("Collection is not pending collection (already verified, cancelled, or missing)"), { status: 409 });
  try {
    emitToAdmins("admin:stats-changed", { type: "payout", orderId: updated.order });
  } catch {}
  logger.info(`[Payout] Collection ${updated._id} verified: ${updated.grossCollected}, due ${updated.payoutDueAt.toISOString()}`);
  return updated;
}

/**
 * Create a grouped payout from a seller's eligible, unallocated collections.
 * Every included collection must already be verified; a batch can never
 * become eligible before its latest included due date. Reversal rows for the
 * same orders/seller are auto-included as negative lines so partial refunds
 * reduce the correct batch.
 */
export async function createPayout(sellerUserId, collectionIds, deductions, adminUser) {
  const seller = String(sellerUserId);
  const ded = Math.max(0, Number(deductions) || 0);

  const positive = collectionIds.length
    ? await CODCollection.find({ _id: { $in: collectionIds } })
    : [];
  if (!positive.length) throw Object.assign(new Error("No collections provided"), { status: 400 });

  // Validate: correct type, same seller, verified money, not allocated/reversed/failed
  for (const c of positive) {
    if (c.type !== "collection") throw Object.assign(new Error(`Collection ${c._id} is not a collection row`), { status: 400 });
    if (String(c.seller) !== seller) throw Object.assign(new Error(`Collection ${c._id} belongs to another seller`), { status: 400 });
    if (!["collected", "eligible_for_payout"].includes(c.status)) {
      throw Object.assign(new Error(`Collection ${c._id} is not verified (status: ${c.status})`), { status: 400 });
    }
    if (c.allocatedPayout) throw Object.assign(new Error(`Collection ${c._id} is already allocated to a payout`), { status: 409 });
  }

  // Auto-include unallocated reversal rows for the same orders/seller
  const orderIds = [...new Set(positive.map((c) => String(c.order)))];
  const reversals = await CODCollection.find({
    type: "reversal",
    status: "reversed",
    allocatedPayout: null,
    seller,
    order: { $in: orderIds },
  });

  const all = [...positive, ...reversals];
  const gross = round2(all.reduce((s, c) => s + (c.grossCollected || 0), 0));
  const commission = round2(all.reduce((s, c) => s + (c.commissionAmount || 0), 0));
  // Use the rate of the latest included collection (informational)
  const latest = all.filter((c) => c.grossCollected > 0).sort((a, b) => (a.receivedAt || a.updatedAt) < (b.receivedAt || b.updatedAt) ? 1 : -1)[0];
  const maxDue = all
    .filter((c) => c.grossCollected > 0)
    .map((c) => c.payoutDueAt)
    .reduce((a, b) => (a > b ? a : b), new Date(0));

  const payout = await SellerPayout.create({
    seller,
    collections: all.map((c) => c._id),
    grossCollected: gross,
    commissionRate: latest ? Number(latest.commissionRate) || 0 : 0,
    commissionAmount: commission,
    deductions: ded,
    netPayable: round2(gross - commission - ded),
    payoutDueAt: maxDue,
    status: "processing",
    auditLog: [
      {
        at: new Date(),
        by: adminUser?._id,
        action: "created",
        note: `Batch of ${positive.length} collection(s) + ${reversals.length} reversal(s)`,
      },
    ],
  });

  // Atomically allocate every row: conditional on allocatedPayout = null.
  // If any row fails (someone else grabbed it), roll everything back.
  const allocated = [];
  try {
    for (const c of all) {
      const updated = await CODCollection.findOneAndUpdate(
        { _id: c._id, allocatedPayout: null, status: { $in: c.type === "reversal" ? ["reversed"] : ["collected", "eligible_for_payout", "paid"] } },
        { $set: { allocatedPayout: payout._id } },
        { new: true }
      );
      if (!updated) {
        throw Object.assign(new Error(`Collection ${c._id} was taken by another payout`), { status: 409 });
      }
      allocated.push(updated._id);
    }
  } catch (err) {
    // Roll back any partial allocation
    if (allocated.length) {
      await CODCollection.updateMany(
        { _id: { $in: allocated }, allocatedPayout: payout._id },
        { $set: { allocatedPayout: null } }
      );
    }
    await SellerPayout.deleteOne({ _id: payout._id });
    throw err;
  }

  logger.info(`[Payout] Payout ${payout._id} created for seller ${seller}: net ${payout.netPayable}`);
  try {
    emitToAdmins("admin:stats-changed", { type: "payout" });
  } catch {}
  return payout;
}

/**
 * Mark a payout PAID. Requires a real payment reference; the site does NOT
 * move money — the transfer happens outside the system and this only records
 * the verified confirmation. Atomic conditional update from
 * eligible_for_payout: duplicate or concurrent confirmations get 409 and the
 * original ref / audit history are preserved.
 */
export async function markPayoutPaid(payoutId, paymentRef, adminUser) {
  if (!paymentRef || !String(paymentRef).trim()) {
    throw Object.assign(new Error("paymentRef is required — record the real transfer reference"), { status: 400 });
  }
  const payout = await SellerPayout.findOne({ _id: payoutId });
  if (!payout) throw Object.assign(new Error("Payout not found"), { status: 404 });

  if (payout.status === "paid") {
    throw Object.assign(new Error(`Payout already paid at ${payout.paidAt?.toISOString()} (ref: ${payout.paymentRef})`), { status: 409 });
  }

  const updated = await SellerPayout.findOneAndUpdate(
    { _id: payoutId, status: "eligible_for_payout" },
    {
      $set: { status: "paid", paidAt: new Date(), paymentRef: String(paymentRef).trim(), paidBy: adminUser?._id },
      $push: { auditLog: { at: new Date(), by: adminUser?._id, action: "marked_paid", note: `External transfer confirmed (ref ${String(paymentRef).trim()})` } },
    },
    { new: true }
  );
  if (!updated) {
    throw Object.assign(new Error(`Payout is not payably eligible (status: ${payout.status})`), { status: 409 });
  }

  // Individual collections inherit the paid state (their own records unchanged)
  await CODCollection.updateMany({ _id: { $in: payout.collections }, type: "collection" }, { $set: { status: "paid" } });
  logger.info(`[Payout] Payout ${payoutId} marked paid, ref ${updated.paymentRef}, by ${adminUser?._id}`);
  return updated;
}

/** Mark a payout FAILED (distinct from paid; audit-logged). */
export async function markPayoutFailed(payoutId, reason, adminUser) {
  if (!reason || !String(reason).trim()) throw Object.assign(new Error("reason is required"), { status: 400 });
  const updated = await SellerPayout.findOneAndUpdate(
    { _id: payoutId, status: { $in: ["processing", "eligible_for_payout"] } },
    {
      $set: { status: "failed", failedReason: String(reason).trim(), failedBy: adminUser?._id },
      $push: { auditLog: { at: new Date(), by: adminUser?._id, action: "marked_failed", note: String(reason).trim() } },
    },
    { new: true }
  );
  if (!updated) throw Object.assign(new Error("Payout is not in a state that can fail (already paid or failed)"), { status: 409 });

  // Free the collections so they can be grouped again
  await CODCollection.updateMany({ _id: { $in: updated.collections }, allocatedPayout: payoutId }, { $set: { allocatedPayout: null } });
  logger.info(`[Payout] Payout ${payoutId} marked failed: ${reason}`);
  return updated;
}

/**
 * Idempotent cron work:
 *  - collected collections past payoutDueAt  → eligible_for_payout
 *  - processing payouts past payoutDueAt     → eligible_for_payout
 * NEVER marks anything paid.
 */
export async function processPayoutCron() {
  const now = new Date();
  const [c, p] = await Promise.all([
    CODCollection.updateMany({ type: "collection", status: "collected", payoutDueAt: { $lte: now } }, { $set: { status: "eligible_for_payout" } }),
    SellerPayout.updateMany({ status: "processing", payoutDueAt: { $lte: now } }, { $set: { status: "eligible_for_payout" } }),
  ]);
  if (c.modifiedCount || p.modifiedCount) {
    logger.info(`[Payout] Cron: ${c.modifiedCount} collection(s), ${p.modifiedCount} payout(s) became eligible`);
    try {
      emitToAdmins("admin:stats-changed", { type: "payout" });
    } catch {}
  }
  return { collections: c.modifiedCount, payouts: p.modifiedCount };
}

let payoutTask = null;

export function startPayoutCron() {
  payoutTask = cron.schedule("*/30 * * * *", () => {
    processPayoutCron();
  });
  logger.info("[Payout] Cron scheduled: every 30 minutes");
}

export function stopPayoutCron() {
  if (payoutTask) payoutTask.stop();
}

/** Read-only summary for the seller's own dashboard. */
export async function getSellerPayoutSummary(sellerUserId) {
  const seller = String(sellerUserId);
  const now = new Date();

  const [pending, collectedRows, eligibleRows, reversals, paidPayouts, duePayouts, sellerDoc] = await Promise.all([
    CODCollection.aggregate([
      { $match: { seller: new mongoose.Types.ObjectId(seller), type: "collection", status: "pending_collection" } },
      { $group: { _id: null, count: { $sum: 1 }, expectedTotal: { $sum: "$expectedAmount" } } },
    ]),
    CODCollection.find({ seller, type: "collection", status: { $in: ["collected", "eligible_for_payout"] }, allocatedPayout: null }),
    CODCollection.find({ seller, type: "collection", status: "eligible_for_payout", allocatedPayout: null }),
    CODCollection.find({ seller, type: "reversal", status: "reversed", allocatedPayout: null }),
    SellerPayout.find({ seller, status: "paid" }).sort({ paidAt: -1 }).limit(25),
    SellerPayout.find({ seller, status: "eligible_for_payout" }).sort({ payoutDueAt: 1 }),
    Seller.findOne({ user: seller }).select("commissionRate"),
  ]);

  const pendingAgg = pending[0] || { count: 0, expectedTotal: 0 };
  const collectedTotal = round2(collectedRows.reduce((s, c) => s + c.grossCollected, 0));
  const eligibleTotal = round2(eligibleRows.reduce((s, c) => s + c.grossCollected - c.commissionAmount, 0));
  const nextDueAt = collectedRows.length ? collectedRows.map((c) => c.payoutDueAt).reduce((a, b) => (a < b ? a : b), null) : null;

  return {
    commissionRate: sellerDoc?.commissionRate || 0,
    pendingCollection: { count: pendingAgg.count, expectedTotal: round2(pendingAgg.expectedTotal) },
    verifiedNotPaid: { count: collectedRows.length, grossTotal: collectedTotal, nextDueAt },
    eligibleUnallocated: { count: eligibleRows.length, netTotal: eligibleTotal },
    unallocatedReversals: { count: reversals.length, amount: round2(reversals.reduce((s, c) => s + c.grossCollected, 0)) },
    duePayouts: duePayouts,
    paidHistory: paidPayouts,
  };
}
