import express from "express";
import authMiddleware, { adminOnly, sellerOnly } from "../middleware/authMiddleware.js";
import {
  adminGetCollections,
  adminGetPayouts,
  adminGetPayoutBoard,
  verifyCollection,
  createPayoutBatch,
  markBatchPaid,
  markBatchFailed,
  backfillOrder,
  getSellerPayouts,
} from "../controller/payoutController.js";
import {
  registerSeller,
  getMySellerProfile,
  updateSellerProfile,
  getSellerDashboard,
  getSellerProducts,
  getSellerOrders,
  getSellerEarnings,
  getSellerMessages,
  getSellerUnreadCount,
  markSellerMessagesRead,
  sendSellerMessage,
  getSupportAdmin,
  sellerUpdateOrderStatus,
  getPublicStore,
  adminGetAllSellers,
  adminApproveSeller,
  adminRejectSeller,
  adminSuspendSeller,
  adminSetCommission,
  adminGetSellerStats,
  adminGetSellerDetail,
} from "../controller/sellerController.js";
import {
  getSellerCommissionBalanceC,
  getSellerCommissionPaymentsC,
  submitCommissionPaymentC,
  getSellerProofUrlC,
  cancelCommissionPaymentC,
  adminGetCommissionPaymentsC,
  adminGetProofUrlC,
  adminVerifyCommissionPaymentC,
  adminRejectCommissionPaymentC,
} from "../controller/commissionController.js";
import { proofUpload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// Seller routes (auth required, role=seller)
router.post("/register", authMiddleware, registerSeller);
router.get("/me", authMiddleware, getMySellerProfile);
router.put("/me", authMiddleware, updateSellerProfile);
router.get("/dashboard", sellerOnly, getSellerDashboard);
router.get("/products", sellerOnly, getSellerProducts);
router.get("/orders", sellerOnly, getSellerOrders);
router.put("/orders/:orderId/status", sellerOnly, sellerUpdateOrderStatus);
router.get("/earnings", sellerOnly, getSellerEarnings);
router.get("/messages", sellerOnly, getSellerMessages);
router.get("/messages/unread", sellerOnly, getSellerUnreadCount);
router.patch("/messages/read", sellerOnly, markSellerMessagesRead);
router.post("/messages", sellerOnly, sendSellerMessage);
router.get("/messages/support", sellerOnly, getSupportAdmin);

// Seller payout summary
router.get("/payouts", sellerOnly, getSellerPayouts);

// Seller commission (seller_pays mode)
router.get("/commission/balance", sellerOnly, getSellerCommissionBalanceC);
router.get("/commission/payments", sellerOnly, getSellerCommissionPaymentsC);
router.post("/commission/payments", sellerOnly, proofUpload, submitCommissionPaymentC);
router.get("/commission/my-proof/:paymentId", sellerOnly, getSellerProofUrlC);
router.delete("/commission/payments/:paymentId", sellerOnly, cancelCommissionPaymentC);

// Public store route
router.get("/store/:shopName", getPublicStore);

// Admin payout routes
router.get("/admin/payouts", adminOnly, adminGetPayouts);
router.get("/admin/payouts/board", adminOnly, adminGetPayoutBoard);
router.get("/admin/payouts/collections", adminOnly, adminGetCollections);
router.post("/admin/payouts/collections/:id/verify", adminOnly, verifyCollection);
router.post("/admin/payouts", adminOnly, createPayoutBatch);
router.post("/admin/payouts/backfill/:orderId", adminOnly, backfillOrder);
router.put("/admin/payouts/:id/mark-paid", adminOnly, markBatchPaid);
router.put("/admin/payouts/:id/mark-failed", adminOnly, markBatchFailed);

// Admin commission payment verification (seller_pays mode)
router.get("/admin/commission/payments", adminOnly, adminGetCommissionPaymentsC);
router.get("/admin/commission/proof/:paymentId", adminOnly, adminGetProofUrlC);
router.post("/admin/commission/payments/:paymentId/verify", adminOnly, adminVerifyCommissionPaymentC);
router.post("/admin/commission/payments/:paymentId/reject", adminOnly, adminRejectCommissionPaymentC);

// Admin routes
router.get("/admin/all", adminOnly, adminGetAllSellers);
router.get("/admin/stats", adminOnly, adminGetSellerStats);
router.get("/admin/:id/detail", adminOnly, adminGetSellerDetail);
router.put("/admin/:id/approve", adminOnly, adminApproveSeller);
router.put("/admin/:id/reject", adminOnly, adminRejectSeller);
router.put("/admin/:id/suspend", adminOnly, adminSuspendSeller);
router.put("/admin/:id/commission", adminOnly, adminSetCommission);

export default router;
