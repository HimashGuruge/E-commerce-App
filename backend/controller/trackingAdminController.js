import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Seller from "../models/Seller.js";
import CODCollection from "../models/CODCollection.js";
import SellerPayout from "../models/SellerPayout.js";
import ReturnRequest from "../models/ReturnRequest.js";
import TrackingEvent from "../models/TrackingEvent.js";
import Notification from "../models/Notification.js";
import { emitToUser } from "../services/socketService.js";
import { generateReviewReminders } from "../services/reviewReminderService.js";
import {
  ensureCODCollection,
  failPendingCollectionsForOrder,
} from "../services/payoutService.js";
import { processShippedOrders, STUCK_AFTER_DAYS } from "../services/trackingService.js";
import logger from "../utils/logger.js";

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const DAYS_MS = 86400000;

/**
 * 📡 ADMIN DOMEX MONITOR — read-only monitoring + manual sync + audited override.
 *
 * All financial figures come straight from the existing CODCollection /
 * SellerPayout ledger (no new money math). Delivery buckets come from
 * Order.orderStatus + the persisted Domex status (Order.domexStatus).
 */

const STUCK_WINDOW_MS = STUCK_AFTER_DAYS * DAYS_MS;
const hasTracking = { trackingNumber: { $nin: [null, ""] } };
const noTracking = { trackingNumber: { $in: [null, ""] } };

/**
 * @desc   Admin: delivery monitoring summary (cards + last sync info)
 * @route  GET /api/orders/admin/tracking/summary
 */
export const adminTrackingSummary = asyncHandler(async (req, res) => {
  const now = new Date();
  const stuckCutoff = new Date(now - STUCK_WINDOW_MS);
  const stuckBase = { orderStatus: "shipped", ...hasTracking };

  const [
    totalShipments,
    shippedCount,
    inTransit,
    readyForPickup,
    deliveredCount,
    failedCount,
    trackingErrors,
    stuck,
    noTrackingCount,
    returnedCount,
    lastSync,
  ] = await Promise.all([
    Order.countDocuments({ orderStatus: { $in: ["shipped", "delivered", "failed"] } }),
    Order.countDocuments({ orderStatus: "shipped" }),
    Order.countDocuments({ orderStatus: "shipped", domexStatus: "in_transit" }),
    Order.countDocuments({ orderStatus: "shipped", domexStatus: "ready_for_pickup" }),
    Order.countDocuments({ orderStatus: "delivered" }),
    Order.countDocuments({ orderStatus: "failed" }),
    Order.countDocuments({ orderStatus: "shipped", trackingError: { $nin: [null, ""] } }),
    Order.countDocuments({
      ...stuckBase,
      $or: [
        { lastTrackedAt: { $exists: false } },
        { lastTrackedAt: null },
        { lastTrackedAt: { $lt: stuckCutoff } },
      ],
    }),
    Order.countDocuments({ orderStatus: "shipped", ...noTracking }),
    ReturnRequest.countDocuments({ status: "refunded" }),
    TrackingEvent.findOne({ source: { $in: ["cron", "manual"] } }).sort({ checkedAt: -1 }).limit(1),
  ]);

  res.json({
    success: true,
    summary: {
      totalShipments,
      shipped: shippedCount,
      inTransit,
      readyForPickup,
      delivered: deliveredCount,
      failed: failedCount,
      trackingErrors,
      stuck,
      noTracking: noTrackingCount,
      returned: returnedCount,
      lastSyncAt: lastSync?.checkedAt || null,
      lastSyncSource: lastSync?.source || null,
    },
  });
});

/**
 * @desc   Admin: filtered, paginated shipment list
 * @route  GET /api/orders/admin/tracking/shipments
 * @query  q (order id or tracking number) · seller · status (all|shipped|in_transit|
 *         ready_for_pickup|delivered|failed|tracking_error|stuck|returned) · from · to ·
 *         page · limit
 */
export const adminTrackingShipments = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const q = String(req.query.q || "").trim();
  const status = req.query.status || "all";
  const seller = req.query.seller;
  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;

  const empty = () =>
    res.json({ success: true, shipments: [], page, totalPages: 0, totalCount: 0 });

  const filter = {};

  if (q) {
    const idCond = mongoose.isValidObjectId(q)
      ? { _id: new mongoose.Types.ObjectId(q) }
      : { _id: { $regex: q, $options: "i" } };
    filter.$or = [idCond, { trackingNumber: { $regex: q, $options: "i" } }];
  }

  if (seller) {
    if (!mongoose.isValidObjectId(seller)) {
      return res.status(400).json({ success: false, message: "Invalid seller id" });
    }
    const products = await Product.find({ seller: new mongoose.Types.ObjectId(seller) }).select("_id");
    if (!products.length) return empty();
    filter["items.product"] = { $in: products.map((p) => p._id) };
  }

  const now = new Date();
  const stuckCutoff = new Date(now - STUCK_WINDOW_MS);

  switch (status) {
    case "shipped":
      filter.orderStatus = "shipped";
      break;
    case "in_transit":
      filter.orderStatus = "shipped";
      filter.domexStatus = "in_transit";
      break;
    case "ready_for_pickup":
      filter.orderStatus = "shipped";
      filter.domexStatus = "ready_for_pickup";
      break;
    case "delivered":
      filter.orderStatus = "delivered";
      break;
    case "failed":
      filter.orderStatus = "failed";
      break;
    case "tracking_error":
      filter.orderStatus = "shipped";
      filter.trackingError = { $nin: [null, ""] };
      break;
    case "stuck":
      filter.orderStatus = "shipped";
      filter.trackingNumber = { $nin: [null, ""] };
      filter.$and = [
        {
          $or: [
            { lastTrackedAt: { $exists: false } },
            { lastTrackedAt: null },
            { lastTrackedAt: { $lt: stuckCutoff } },
          ],
        },
      ];
      break;
    case "returned": {
      const rrs = await ReturnRequest.find({ status: "refunded" }).select("order");
      const orderIds = [...new Set(rrs.map((r) => r.order))];
      if (!orderIds.length) return empty();
      filter._id = { $in: orderIds };
      break;
    }
    default:
      filter.orderStatus = { $in: ["shipped", "delivered", "failed", "cancelled"] };
  }

  if (from && !isNaN(from.getTime())) {
    filter.createdAt = { $gte: from };
    if (to && !isNaN(to.getTime())) filter.createdAt.$lte = to;
  }

  const [orders, totalCount] = await Promise.all([
    Order.find(filter)
      .populate("user", "name email")
      .populate("items.product", "name seller")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  const sellerIds = [
    ...new Set(
      orders
        .flatMap((o) => (o.items || []).map((i) => i.product?.seller))
        .filter(Boolean)
        .map(String)
    ),
  ];
  const shops = sellerIds.length
    ? await Seller.find({ user: { $in: sellerIds } }).select("shopName")
    : [];
  const shopMap = Object.fromEntries(shops.map((s) => [String(s.user), s.shopName]));

  const orderIds = orders.map((o) => o._id);
  const [codRows, events] = await Promise.all([
    CODCollection.find({ order: { $in: orderIds } }).sort({ createdAt: -1 }),
    TrackingEvent.find({ order: { $in: orderIds } }).sort({ checkedAt: -1 }).limit(200),
  ]);

  const shipments = orders.map((o) => {
    const oId = String(o._id);
    const cod = codRows.find((c) => String(c.order) === oId);
    const sellerIdsHere = [
      ...new Set(
        (o.items || [])
          .map((i) => i.product?.seller)
          .filter(Boolean)
          .map(String)
      ),
    ];
    return {
      ...o.toObject(),
      sellerShopNames: sellerIdsHere.map((s) => shopMap[s] || ""),
      cod: cod
        ? {
            status: cod.status,
            expectedAmount: cod.expectedAmount,
            grossCollected: cod.grossCollected,
            settlementRef: cod.settlementRef,
            payoutDueAt: cod.payoutDueAt,
          }
        : null,
      trackingHistory: events
        .filter((e) => String(e.order) === oId)
        .slice(0, 5)
        .map((e) => ({ status: e.status, source: e.source, error: e.error, at: e.checkedAt })),
      stuck:
        o.orderStatus === "shipped" &&
        o.trackingNumber &&
        (!o.lastTrackedAt || o.lastTrackedAt < stuckCutoff),
    };
  });

  res.json({
    success: true,
    shipments,
    page,
    totalPages: Math.ceil(totalCount / limit) || 1,
    totalCount,
  });
});

/**
 * @desc   Admin: seller-wise product + payment summary
 * @route  GET /api/orders/admin/tracking/sellers
 *
 * Product figures (additive): sum of item quantities over delivered
 * Order.items and over approved/processing/refunded ReturnRequest items —
 * cancelled/failed orders excluded, each order counted once.
 *
 * Money figures: the SAME aggregations as the payout board
 * (adminGetPayoutBoard) — pending, ready, unallocatedReversals,
 * nextEarliestDue, duePayout, paidTotal. No new money math.
 */
export const adminTrackingSellers = asyncHandler(async (req, res) => {
  const sellers = await Seller.find().select("user shopName commissionRate commissionMode").lean();

  const [soldAgg, ordersAgg, returnedAgg] = await Promise.all([
    // Delivered: quantity + gross per seller
    Order.aggregate([
      { $match: { orderStatus: "delivered" } },
      { $unwind: "$items" },
      { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "prod" } },
      { $match: { "prod.seller": { $ne: null } } },
      {
        $group: {
          _id: "$prod.seller",
          productsSold: { $sum: { $ifNull: ["$items.quantity", 0] } },
          grossSales: { $sum: { $multiply: [{ $ifNull: ["$items.price", 0] }, { $ifNull: ["$items.quantity", 0] }] } },
        },
      },
    ]),
    // Delivered: distinct delivered orders per seller
    Order.aggregate([
      { $match: { orderStatus: "delivered" } },
      { $unwind: "$items" },
      { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "prod" } },
      { $match: { "prod.seller": { $ne: null } } },
      { $group: { _id: "$prod.seller", deliveredOrders: { $addToSet: "$_id" } } },
      { $project: { deliveredOrders: { $size: "$deliveredOrders" } } },
    ]),
    // Returned items: approved/processing/refunded return requests (pending not counted)
    ReturnRequest.aggregate([
      { $match: { status: { $in: ["approved", "processing", "refunded"] } } },
      { $unwind: "$items" },
      { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "prod" } },
      { $match: { "prod.seller": { $ne: null } } },
      {
        $group: {
          _id: "$prod.seller",
          returnedItems: { $sum: { $ifNull: ["$items.quantity", 0] } },
        },
      },
    ]),
  ]);

  const soldMap = Object.fromEntries(soldAgg.map((r) => [String(r._id), r]));
  const ordersMap = Object.fromEntries(ordersAgg.map((r) => [String(r._id), r]));
  const returnedMap = Object.fromEntries(returnedAgg.map((r) => [String(r._id), r]));

  const rows = [];
  for (const s of sellers) {
    const sid = s.user;

    // Money fields are the SAME aggregations the payout board uses — this is
    // an extension of that board, not a separate money calculation.
    const [pending, unallocated, unallocatedVer, reversals, due, paid] = await Promise.all([
      CODCollection.aggregate([
        { $match: { seller: sid, type: "collection", status: "pending_collection" } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$expectedAmount" } } },
      ]),
      CODCollection.aggregate([
        { $match: { seller: sid, type: "collection", allocatedPayout: null, status: { $in: ["collected", "eligible_for_payout"] } } },
        { $group: { _id: null, count: { $sum: 1 }, gross: { $sum: "$grossCollected" }, commission: { $sum: "$commissionAmount" } } },
      ]),
      CODCollection.findOne({ seller: sid, type: "collection", status: { $in: ["collected", "eligible_for_payout"] }, allocatedPayout: null }).limit(1),
      CODCollection.aggregate([
        { $match: { seller: sid, type: "reversal", allocatedPayout: null } },
        { $project: { amount: "$grossCollected" } },
      ]),
      SellerPayout.findOne({ seller: sid, status: "eligible_for_payout" }).sort({ payoutDueAt: 1 }),
      SellerPayout.aggregate([
        { $match: { seller: sid, status: "paid" } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$netPayable" } } },
      ]),
    ]);

    const p = pending[0] || { count: 0, total: 0 };
    const u = unallocated[0] || { count: 0, gross: 0, commission: 0 };
    const revs = reversals.reduce((x, r) => x + (r.amount || 0), 0);

    rows.push({
      seller: sid.toString(),
      shopName: s.shopName,
      commissionRate: s.commissionRate || 0,
      commissionMode: s.commissionMode || "deduct",
      // Additive product stats (quantity sums), not money
      productsSold: soldMap[String(sid)]?.productsSold || 0,
      deliveredOrders: ordersMap[String(sid)]?.deliveredOrders || 0,
      returnedItems: returnedMap[String(sid)]?.returnedItems || 0,
      grossSales: round2(soldMap[String(sid)]?.grossSales || 0),
      // Money straight from the payout board
      pending: { count: p.count, expectedTotal: p.total },
      ready: { count: u.count, gross: u.gross, commission: u.commission, net: Math.round((u.gross - u.commission) * 100) / 100 },
      unallocatedReversals: Math.round(revs * 100) / 100,
      nextEarliestDue: unallocatedVer?.payoutDueAt || null,
      duePayout: due ? { id: due._id.toString(), dueAt: due.payoutDueAt, netPayable: due.netPayable } : null,
      paidTotal: { count: paid[0]?.count || 0, total: paid[0]?.total || 0 },
    });
  }

  res.json({ success: true, sellers: rows });
});

/**
 * @desc   Admin: manual Domex sync (admin-only, overlap-safe)
 * @route  POST /api/orders/admin/tracking/sync
 */
export const adminTrackingSync = asyncHandler(async (req, res) => {
  const stats = await processShippedOrders("manual");
  if (stats.skipped) {
    return res.status(409).json({ success: false, message: "A tracking run is already in progress — try again shortly" });
  }
  res.json({ success: true, stats });
});

/**
 * @desc   Admin: manual delivery override (reason required, audited)
 * @route  POST /api/orders/admin/tracking/orders/:orderId/override
 * @body   { status: "delivered"|"shipped"|"failed"|"cancelled", reason: string }
 */
export const adminTrackingOverride = asyncHandler(async (req, res) => {
  const reason = String(req.body?.reason || "").trim();
  if (!reason) {
    return res.status(400).json({ success: false, message: "A reason is required for a manual override" });
  }
  const order = await Order.findById(req.params.orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }

  const newStatus = String(req.body?.status || "delivered");
  if (!["shipped", "delivered", "failed", "cancelled"].includes(newStatus)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }
  const oldStatus = order.orderStatus;
  if (oldStatus === newStatus) {
    return res.status(409).json({ success: false, message: `Order is already ${newStatus}` });
  }

  order.orderStatus = newStatus;
  await order.save();

  // Audit record (kept in the tracking history)
  try {
    await TrackingEvent.create({
      order: order._id,
      trackingNumber: order.trackingNumber || "",
      status: newStatus,
      source: "admin_override",
      reason,
      by: req.user._id,
      note: `${oldStatus} → ${newStatus}`,
    });
  } catch (e) {
    logger.error(`[Tracking] Override audit failed for ${order._id}:`, e.message);
  }

  // COD hooks — same rules as the existing status update (idempotent)
  if (order.paymentMethod === "cod") {
    try {
      if (newStatus === "delivered") await ensureCODCollection(order);
      else if (newStatus === "cancelled" && oldStatus !== "cancelled")
        await failPendingCollectionsForOrder(order._id);
    } catch (codErr) {
      logger.error(`[Tracking] COD hook failed for override on ${order._id}:`, codErr.message);
    }
  }

  // Buyer notification + real-time push
  try {
    const statusNotice = await Notification.create({
      user: order.user,
      type: "ORDER_STATUS",
      order: order._id,
      title: "Order status updated",
      message: `✅ Order #${order._id} status updated by admin: ${oldStatus} → ${newStatus}. Reason: ${reason}`,
    });
    emitToUser(order.user, "notification:new", { id: statusNotice._id, type: statusNotice.type });
  } catch (e) {
    logger.error("Failed to send override notification:", e.message);
  }
  emitToUser(order.user, "order:update", { orderId: order._id, orderStatus: newStatus });

  // Review reminders fire when an order first reaches delivered (same as existing flow)
  if (oldStatus !== "delivered" && newStatus === "delivered") {
    try {
      await generateReviewReminders(order);
    } catch (e) {
      logger.error("Failed to generate review reminders on override:", e.message);
    }
  }

  logger.info(`[Tracking] Admin override: order ${order._id} ${oldStatus} → ${newStatus} (${reason}) by ${req.user._id}`);
  res.json({ success: true, order });
});
