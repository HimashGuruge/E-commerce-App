import express from "express";
import {
  createFeedback,
  getFeedback,
  getFeedbackById,
  updateFeedback,
  submitFeedback,
  editFeedback,
  deleteFeedback,
  adminDeleteFeedback,
  adminApproveFeedback,
  markHelpful,
  unmarkHelpful,
  getProductRating,
  getProductRatingDistribution,
  getFeedbackStats,
} from "../controller/feedbackController.js";
import {
  initiateReturn,
  getReturnRequests,
  getReturnRequestById,
  approveReturn,
  rejectReturn,
  processRefund,
  completeReturn,
} from "../controller/feedbackController.js";
import authMiddleware, { adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// ========== RETURN REQUEST ROUTES (must be before :id routes) ==========
router.post("/returns/initiate", authMiddleware, initiateReturn);
router.get("/returns", adminOnly, getReturnRequests);
router.get("/returns/:id", adminOnly, getReturnRequestById);
router.put("/returns/:id/approve", adminOnly, approveReturn);
router.put("/returns/:id/reject", adminOnly, rejectReturn);
router.put("/returns/:id/process-refund", adminOnly, processRefund);
router.put("/returns/:id/complete", adminOnly, completeReturn);

// Feedback routes
router.get("/", getFeedback);
router.get("/stats", getFeedbackStats);
router.get("/product/:productId/rating", getProductRating);
router.get("/product/:productId/rating-distribution", getProductRatingDistribution);
router.get("/:id", getFeedbackById);

router.post("/", createFeedback);
router.post("/submit", authMiddleware, submitFeedback);
router.post("/:id/approve", adminOnly, adminApproveFeedback);
router.patch("/:id/helpful", authMiddleware, markHelpful);
router.delete("/:id/helpful", authMiddleware, unmarkHelpful);

router.put("/:id", authMiddleware, updateFeedback);
router.put("/:id/edit", authMiddleware, editFeedback);
router.delete("/:id", authMiddleware, deleteFeedback);
router.delete("/:id/admin", adminOnly, adminDeleteFeedback);

export default router;
