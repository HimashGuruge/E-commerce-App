import express from "express";
import {
  askQuestion,
  getProductQuestions,
  getAllQuestions,
  answerQuestion,
  deleteQuestion,
  toggleQuestionStatus,
} from "../controller/questionController.js";
import authMiddleware, { adminOnly, sellerOrAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getProductQuestions);
router.get("/all", adminOnly, getAllQuestions);
router.post("/", authMiddleware, askQuestion);
router.post("/:id/answer", sellerOrAdmin, answerQuestion);
router.delete("/:id", authMiddleware, deleteQuestion);
router.patch("/:id/status", adminOnly, toggleQuestionStatus);

export default router;
