import asyncHandler from "express-async-handler";
import SliderItem from "../models/SliderItem.js";

export const createSliderItem = asyncHandler(async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl || !imageUrl.trim()) {
    res.status(400);
    throw new Error("Image URL is required");
  }
  const sliderItem = await SliderItem.create(req.body);
  res.status(201).json({ success: true, sliderItem });
});

export const getSliderItems = asyncHandler(async (req, res) => {
  const { active } = req.query;
  const filter = active === "true" ? { status: "active" } : {};
  const items = await SliderItem.find(filter).sort({ order: 1, createdAt: -1 });
  res.json({ success: true, items });
});

export const updateSliderItem = asyncHandler(async (req, res) => {
  const sliderItem = await SliderItem.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!sliderItem) {
    res.status(404);
    throw new Error("Slider item not found");
  }
  res.json({ success: true, sliderItem });
});

export const deleteSliderItem = asyncHandler(async (req, res) => {
  const sliderItem = await SliderItem.findByIdAndDelete(req.params.id);
  if (!sliderItem) {
    res.status(404);
    throw new Error("Slider item not found");
  }
  res.json({ success: true, message: "Slider item deleted" });
});

export const toggleSliderItemStatus = asyncHandler(async (req, res) => {
  const sliderItem = await SliderItem.findById(req.params.id);
  if (!sliderItem) {
    res.status(404);
    throw new Error("Slider item not found");
  }
  sliderItem.status = sliderItem.status === "active" ? "inactive" : "active";
  await sliderItem.save();
  res.json({ success: true, sliderItem });
});
