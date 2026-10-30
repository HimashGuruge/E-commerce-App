import asyncHandler from "express-async-handler";
import Ad from "../models/Ad.js";

export const createAd = asyncHandler(async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    res.status(400);
    throw new Error("Title is required");
  }
  const ad = await Ad.create(req.body);
  res.status(201).json({ success: true, ad });
});

export const getAds = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const filter = {};
  if (category) {
    filter.category = category;
  }
  const ads = await Ad.find(filter);
  res.json({ success: true, ads });
});

export const updateAd = asyncHandler(async (req, res) => {
  const { title } = req.body;
  if (title !== undefined && !title.trim()) {
    res.status(400);
    throw new Error("Title cannot be empty");
  }
  const ad = await Ad.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!ad) {
    res.status(404);
    throw new Error("Ad not found");
  }
  res.json({ success: true, ad });
});

export const deleteAd = asyncHandler(async (req, res) => {
  const ad = await Ad.findByIdAndDelete(req.params.id);
  if (!ad) {
    res.status(404);
    throw new Error("Ad not found");
  }
  res.json({ success: true, message: "Ad deleted" });
});

export const toggleAdStatus = asyncHandler(async (req, res) => {
  const ad = await Ad.findById(req.params.id);
  if (!ad) {
    res.status(404);
    throw new Error("Ad not found");
  }
  ad.status = ad.status === "active" ? "inactive" : "active";
  await ad.save();
  res.json({ success: true, ad });
});
