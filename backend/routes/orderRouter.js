import express from "express";
import {
  getOrdersByUser,
  getOrderById,
  cancelOrder,
  markOrdersAsSeen,
  getDashboardStats,
  getQuote,
  adminGetAllOrders,
  adminUpdateOrderStatus,
  syncDomexStatus,
  verifyStockBeforeCheckout,
  adminDeleteFailedOrder,
  getUserOrderStatusSummary,
} from "../controller/orderController.js";

import authMiddleware, { adminOnly } from "../middleware/authMiddleware.js";

import {
  adminTrackingSummary,
  adminTrackingShipments,
  adminTrackingSellers,
  adminTrackingSync,
  adminTrackingOverride,
} from "../controller/trackingAdminController.js";

const router = express.Router();

/**
 * 📦 ORDER ROUTES (CLEAN VERSION)
 */

// Get quote before ordering (Public Route)
router.post("/quote", getQuote);

// Stock verification before checkout
router.post("/verify-stock", authMiddleware, verifyStockBeforeCheckout);

// User's orders (paginated, filterable)
router.get("/my-orders", authMiddleware, getOrdersByUser);

// Lightweight status summary for polling
router.get("/status-summary", authMiddleware, getUserOrderStatusSummary);

router.get("/stats", authMiddleware, getDashboardStats);

router.delete(
  "/admin/failed-order/:orderId",
  adminOnly,
  adminDeleteFailedOrder,
);

router.put("/mark-seen", authMiddleware, markOrdersAsSeen);

router.get("/userplace/orders", authMiddleware, adminGetAllOrders);

router.get("/admin/sync-domex", adminOnly, syncDomexStatus);

// Admin Domex monitoring (all adminOnly)
router.get("/admin/tracking/summary", adminOnly, adminTrackingSummary);
router.get("/admin/tracking/shipments", adminOnly, adminTrackingShipments);
router.get("/admin/tracking/sellers", adminOnly, adminTrackingSellers);
router.post("/admin/tracking/sync", adminOnly, adminTrackingSync);
router.post("/admin/tracking/orders/:orderId/override", adminOnly, adminTrackingOverride);

router.get("/:orderId", authMiddleware, getOrderById);

router.put("/:orderId/cancel", authMiddleware, cancelOrder);

// Admin order status update
router.put(
  "/admin/update-order-status/:orderId",
  authMiddleware,
  adminUpdateOrderStatus,
);

export default router;
