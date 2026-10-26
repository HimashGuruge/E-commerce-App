import mongoose from "mongoose";
import asyncHandler from "express-async-handler";
import FlashSaleItem from "../models/FlashSaleItem.js";

// Public: active flash sale items, sorted by order. Frontend can fall back
// to auto-picked products when this list is empty.
export const getFlashSale = asyncHandler(async (req, res) => {
  const items = await FlashSaleItem.find({ status: "active" })
    .sort({ order: 1, createdAt: -1 })
    .populate("product");
  res.json({ success: true, flashSale: items });
});

export const getAllFlashSale = asyncHandler(async (req, res) => {
  const items = await FlashSaleItem.find()
    .sort({ order: 1, createdAt: -1 })
    .populate("product");
  res.json({ success: true, flashSale: items });
});

export const addFlashSaleItem = asyncHandler(async (req, res) => {
  const { product, order, status } = req.body;
  const productId = mongoose.Types.ObjectId.isValid(product) ? product : null;
  if (!productId) {
    res.status(400);
    throw new Error("A valid product id is required");
  }
  const existing = await FlashSaleItem.findOne({ product: productId });
  if (existing) {
    res.status(409);
    throw new Error("This product is already in the flash sale");
  }
  const item = await FlashSaleItem.create({
    product: productId,
    order: Number(order) || 0,
    status: status || "active",
  });
  await item.populate("product");
  res.status(201).json({ success: true, item });
});

export const updateFlashSaleItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { order, status, product } = req.body;
  const update = {};
  if (order !== undefined) update.order = Number(order) || 0;
  if (status !== undefined) update.status = status;
  if (product !== undefined) {
    const productId = mongoose.Types.ObjectId.isValid(product) ? product : null;
    if (!productId) {
      res.status(400);
      throw new Error("A valid product id is required");
    }
    const existing = await FlashSaleItem.findOne({
      product: productId,
      _id: { $ne: id },
    });
    if (existing) {
      res.status(409);
      throw new Error("This product is already in the flash sale");
    }
    update.product = productId;
  }
  const item = await FlashSaleItem.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  }).populate("product");
  if (!item) {
    res.status(404);
    throw new Error("Not found");
  }
  res.json({ success: true, item });
});

export const deleteFlashSaleItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await FlashSaleItem.findByIdAndDelete(id);
  if (!deleted) {
    res.status(404);
    throw new Error("Not found");
  }
  res.json({ success: true, message: "Deleted" });
});
