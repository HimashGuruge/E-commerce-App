import asyncHandler from "express-async-handler";
import Trending from "../models/Trending.js";

export const getTrending = asyncHandler(async (req, res) => {
  const trending = await Trending.find({ status: "active" })
    .sort({ order: 1, createdAt: -1 })
    .limit(10);
  res.json({ success: true, trending });
});

export const getAllTrending = asyncHandler(async (req, res) => {
  const trending = await Trending.find().sort({ order: 1, createdAt: -1 });
  res.json({ success: true, trending });
});

export const addTrending = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400);
    throw new Error("Name is required");
  }
  const trending = await Trending.create({ name, icon: req.body.icon, status: req.body.status || "active", order: req.body.order || 0 });
  res.status(201).json({ success: true, trending });
});

export const updateTrending = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, status, order, icon } = req.body;
  const trending = await Trending.findByIdAndUpdate(id, { name, status, order, icon }, { new: true });
  if (!trending) {
    res.status(404);
    throw new Error("Not found");
  }
  res.json({ success: true, trending });
});

export const deleteTrending = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await Trending.findByIdAndDelete(id);
  if (!deleted) {
    res.status(404);
    throw new Error("Not found");
  }
  res.json({ success: true, message: "Deleted" });
});