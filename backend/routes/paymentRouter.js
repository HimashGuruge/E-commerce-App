import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  placeCODOrder,
  createStripeSession,
  verifyStripePayment,
  handleStripeFailure, // handle payment failure
} from "../controller/paymentController.js";
import { cancelOrder } from "../controller/orderController.js";

const router = express.Router();

// Stripe Sessions
router.post("/create-checkout-session", authMiddleware, createStripeSession);
router.post("/verify-payment", authMiddleware, verifyStripePayment);

// Track failed/cancelled payments
router.post("/stripe-fail", authMiddleware, handleStripeFailure);

// COD Orders
router.post("/cod", authMiddleware, placeCODOrder);

// Cancel order route
router.post("/cancel/:id", authMiddleware, cancelOrder);

export default router;

