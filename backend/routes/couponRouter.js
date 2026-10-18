import express from "express";
import {
  listCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponActive,
} from "../controller/couponController.js";
import { adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * 🏷️ COUPON ROUTES (admin only)
 */

router.route("/").get(adminOnly, listCoupons).post(adminOnly, createCoupon);

router
  .route("/:id")
  .get(adminOnly, getCouponById)
  .put(adminOnly, updateCoupon)
  .delete(adminOnly, deleteCoupon);

router.patch("/:id/toggle", adminOnly, toggleCouponActive);

export default router;
