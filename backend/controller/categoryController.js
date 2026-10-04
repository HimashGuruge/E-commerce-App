import asyncHandler from "express-async-handler";
import Category from "../models/Category.js";

export const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);
  res.status(201).json({ success: true, category });
});

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ status: "active" });
  res.json({ success: true, categories });
});

export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug });
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }
  res.json({ success: true, category });
});

export const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }
  res.json({ success: true, category });
});

export const updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!category) {
      res.status(404).json({ success: false, message: "Category not found" });
      return;
    }
    res.json({ success: true, category });
  } catch (err) {
    console.error("updateCategory error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }
  res.json({ success: true, message: "Category deleted" });
});

