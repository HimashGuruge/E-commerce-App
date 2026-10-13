import express from "express";
import {
  createCategory,
  getCategories,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
  getCategoryById,
} from "../controller/categoryController.js";
import { adminOnly, sellerOrAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", getCategories);
router.get("/slug/:slug", getCategoryBySlug);
router.get("/:id", getCategoryById);

// Sellers may create categories too (needed by the product form)
router.post("/", sellerOrAdmin, createCategory);
router.patch("/:id", adminOnly, updateCategory);
router.delete("/:id", adminOnly, deleteCategory);

export default router;
