import express from "express";
import authMiddleware, { adminOnly, sellerOnly } from "../middleware/authMiddleware.js";
import {
  registerSeller,
  getMySellerProfile,
  updateSellerProfile,
  getSellerDashboard,
  getSellerProducts,
  getSellerOrders,
  getSellerEarnings,
  getSellerMessages,
  sendSellerMessage,
  getPublicStore,
  adminGetAllSellers,
  adminApproveSeller,
  adminRejectSeller,
  adminSuspendSeller,
  adminSetCommission,
  adminGetSellerStats,
  adminGetSellerDetail,
} from "../controller/sellerController.js";

const router = express.Router();

// Seller routes (auth required, role=seller)
router.post("/register", authMiddleware, registerSeller);
router.get("/me", authMiddleware, getMySellerProfile);
router.put("/me", authMiddleware, updateSellerProfile);
router.get("/dashboard", sellerOnly, getSellerDashboard);
router.get("/products", sellerOnly, getSellerProducts);
router.get("/orders", sellerOnly, getSellerOrders);
router.get("/earnings", sellerOnly, getSellerEarnings);
router.get("/messages", sellerOnly, getSellerMessages);
router.post("/messages", sellerOnly, sendSellerMessage);

// Public store route
router.get("/store/:shopName", getPublicStore);

// Admin routes
router.get("/admin/all", adminOnly, adminGetAllSellers);
router.get("/admin/stats", adminOnly, adminGetSellerStats);
router.get("/admin/:id/detail", adminOnly, adminGetSellerDetail);
router.put("/admin/:id/approve", adminOnly, adminApproveSeller);
router.put("/admin/:id/reject", adminOnly, adminRejectSeller);
router.put("/admin/:id/suspend", adminOnly, adminSuspendSeller);
router.put("/admin/:id/commission", adminOnly, adminSetCommission);

export default router;
