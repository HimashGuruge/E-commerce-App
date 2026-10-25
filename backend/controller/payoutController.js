import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import CODCollection from "../models/CODCollection.js";
import SellerPayout from "../models/SellerPayout.js";
import Order from "../models/Order.js";
import Seller from "../models/Seller.js";
import {
  verifyCODCollection,
  createPayout,
  markPayoutPaid,
  markPayoutFailed,
  getSellerPayoutSummary,
  backfillOrderSnapshot,
} from "../services/payoutService.js";

// @desc    Admin: list COD collections (optional filters)
// @route   GET /api/sellers/admin/payouts/collections
export const adminGetCollections = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.seller) {
    if (!mongoose.isValidObjectId(req.query.seller)) {
      return res.status(400).json({ success: false, message: "Invalid seller id" });
    }
    filter.seller = req.query.seller;
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.order) {
    if (!mongoose.isValidObjectId(req.query.order)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }
    filter.order = req.query.order;
  }
  if (req.query.type) filter.type = req.query.type;

  const collections = await CODCollection.find(filter)
    .populate("order", "orderStatus paymentMethod totalPrice createdAt")
    .populate("seller", "name email")
    .sort({ createdAt: -1 })
    .limit(500);

  res.json({ success: true, collections });
});

// @desc    Admin: list seller payouts (optional filters)
// @route   GET /api/sellers/admin/payouts
export const adminGetPayouts = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.seller) {
    if (!mongoose.isValidObjectId(req.query.seller)) {
      return res.status(400).json({ success: false, message: "Invalid seller id" });
    }
    filter.seller = req.query.seller;
  }
  if (req.query.status) filter.status = req.query.status;

  const payouts = await SellerPayout.find(filter)
    .populate("seller", "name email")
    .populate("paidBy", "name")
    .populate("failedBy", "name")
    .populate("auditLog.by", "name")
    .sort({ payoutDueAt: -1 })
    .limit(500);

  // Attach the shop name (Seller doc) to each payout for readability
  const ids = [...new Set(payouts.map((p) => p.seller?._id).filter(Boolean))];
  if (ids.length) {
    const shops = await Seller.find({ user: { $in: ids } }).select("user shopName");
    const map = Object.fromEntries(shops.map((s) => [s.user.toString(), s.shopName]));
    for (const p of payouts) p.seller.shopName = p.seller.shopName || map[String(p.seller._id)] || "";
  }

  res.json({ success: true, payouts });
});

// @desc    Admin: list sellers with their payout state (dashboard board)
// @route   GET /api/sellers/admin/payouts/board
export const adminGetPayoutBoard = asyncHandler(async (req, res) => {
  const sellers = await Seller.find().select("user shopName commissionRate");

  const rows = [];
  for (const s of sellers) {
    const sid = s.user.toString();
    const [pending, unallocated, unallocatedVer, reversals, due, paid] = await Promise.all([
      CODCollection.aggregate([
        { $match: { seller: s.user, type: "collection", status: "pending_collection" } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$expectedAmount" } } },
      ]),
      CODCollection.aggregate([
        { $match: { seller: s.user, type: "collection", allocatedPayout: null, status: { $in: ["collected", "eligible_for_payout"] } } },
        { $group: { _id: null, count: { $sum: 1 }, gross: { $sum: "$grossCollected" }, commission: { $sum: "$commissionAmount" } } },
      ]),
      CODCollection.findOne({ seller: s.user, type: "collection", status: { $in: ["collected", "eligible_for_payout"] }, allocatedPayout: null }).limit(1),
      CODCollection.aggregate([
        { $match: { seller: s.user, type: "reversal", allocatedPayout: null } },
        { $project: { amount: "$grossCollected" } },
      ]),
      SellerPayout.findOne({ seller: s.user, status: "eligible_for_payout" }).sort({ payoutDueAt: 1 }),
      SellerPayout.aggregate([
        { $match: { seller: s.user, status: "paid" } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$netPayable" } } },
      ]),
    ]);
    const p = pending[0] || { count: 0, total: 0 };
    const u = unallocated[0] || { count: 0, gross: 0, commission: 0 };
    const revs = reversals.reduce((x, r) => x + (r.amount || 0), 0);
    rows.push({
      seller: s.user.toString(),
      shopName: s.shopName,
      commissionRate: s.commissionRate || 0,
      pending: { count: p.count, expectedTotal: p.total },
      ready: {
        count: u.count,
        gross: u.gross,
        commission: u.commission,
        net: Math.round((u.gross - u.commission) * 100) / 100,
      },
      unallocatedReversals: Math.round(revs * 100) / 100,
      nextEarliestDue: unallocatedVer?.payoutDueAt || null,
      duePayout: due ? { id: due._id.toString(), dueAt: due.payoutDueAt, netPayable: due.netPayable } : null,
      paidTotal: { count: paid[0]?.count || 0, total: paid[0]?.total || 0 },
    });
  }

  res.json({ success: true, board: rows });
});

// @desc    Admin: verify a courier collection (sets receivedAt, payoutDueAt)
// @route   POST /api/sellers/admin/payouts/collections/:id/verify
export const verifyCollection = asyncHandler(async (req, res) => {
  const { grossCollected, courier, settlementRef } = req.body;
  const collection = await verifyCODCollection(req.params.id, { grossCollected, courier, settlementRef }, req.user);
  res.json({ success: true, collection });
});

// @desc    Admin: create a payout batch from eligible, un-allocated collections
// @route   POST /api/sellers/admin/payouts
export const createPayoutBatch = asyncHandler(async (req, res) => {
  const { seller, collectionIds, deductions } = req.body;
  if (!seller || !mongoose.isValidObjectId(seller)) {
    return res.status(400).json({ success: false, message: "A valid seller id is required" });
  }
  const payout = await createPayout(seller, collectionIds || [], deductions, req.user);
  res.status(201).json({ success: true, payout });
});

// @desc    Admin: mark a payout paid (payment reference required; atomic)
// @route   PUT /api/sellers/admin/payouts/:id/mark-paid
export const markBatchPaid = asyncHandler(async (req, res) => {
  const payout = await markPayoutPaid(req.params.id, req.body.paymentRef, req.user);
  res.json({ success: true, payout });
});

// @desc    Admin: mark a payout failed (reason required)
// @route   PUT /api/sellers/admin/payouts/:id/mark-failed
export const markBatchFailed = asyncHandler(async (req, res) => {
  const payout = await markPayoutFailed(req.params.id, req.body.reason, req.user);
  res.json({ success: true, payout });
});

// @desc    Admin: backfill commission snapshot for old COD orders
// @route   POST /api/sellers/admin/payouts/backfill/:orderId
export const backfillOrder = asyncHandler(async (req, res) => {
  const result = await backfillOrderSnapshot(req.params.orderId);
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 400;
    return res.status(status).json({ success: false, message: result.error });
  }
  res.json({ success: true, ...result });
});

// @desc    Seller: my payout summary (pending, verified, due, paid history)
// @route   GET /api/sellers/payouts
export const getSellerPayouts = asyncHandler(async (req, res) => {
  const summary = await getSellerPayoutSummary(req.user._id);
  res.json({ success: true, payout: summary });
});
