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

import authMiddleware from "../middleware/authMiddleware.js";

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
  authMiddleware,
  adminDeleteFailedOrder,
);

router.put("/mark-seen", authMiddleware, markOrdersAsSeen);

router.get("/userplace/orders", authMiddleware, adminGetAllOrders);

router.get("/admin/sync-domex", syncDomexStatus);

router.get("/:orderId", authMiddleware, getOrderById);

router.put("/:orderId/cancel", authMiddleware, cancelOrder);

// Admin order status update
router.put(
  "/admin/update-order-status/:orderId",
  authMiddleware,
  adminUpdateOrderStatus,
);

export default router;
