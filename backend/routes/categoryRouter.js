import express from "express";
import {
  createCategory,
  getCategories,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
  getCategoryById,
} from "../controller/categoryController.js";
import { adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", getCategories);
router.get("/slug/:slug", getCategoryBySlug);
router.get("/:id", getCategoryById);

// Admin only
router.post("/", adminOnly, createCategory);
router.patch("/:id", adminOnly, updateCategory);
router.delete("/:id", adminOnly, deleteCategory);

export default router;
