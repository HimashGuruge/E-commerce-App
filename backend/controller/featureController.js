import asyncHandler from "express-async-handler";
import Feature from "../models/Feature.js";

export const createFeature = asyncHandler(async (req, res) => {
  const feature = await Feature.create(req.body);
  res.status(201).json({ success: true, feature });
});

export const getFeatures = asyncHandler(async (req, res) => {
  const filter = req.query.all === "true" ? {} : { active: true };
  const features = await Feature.find(filter).sort({ order: 1, createdAt: -1 });
  res.json({ success: true, features });
});

export const updateFeature = asyncHandler(async (req, res) => {
  const feature = await Feature.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!feature) {
    res.status(404);
    throw new Error("Feature not found");
  }
  res.json({ success: true, feature });
});

export const deleteFeature = asyncHandler(async (req, res) => {
  const feature = await Feature.findByIdAndDelete(req.params.id);
  if (!feature) {
    res.status(404);
    throw new Error("Feature not found");
  }
  res.json({ success: true, message: "Feature deleted" });
});
