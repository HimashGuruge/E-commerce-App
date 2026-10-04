import asyncHandler from "express-async-handler";
import Service from "../models/Service.js";

export const createService = asyncHandler(async (req, res) => {
  const service = await Service.create(req.body);
  res.status(201).json({ success: true, service });
});

export const getServices = asyncHandler(async (req, res) => {
  const services = await Service.find({ status: "active" });
  res.json({ success: true, services });
});

export const updateService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!service) {
    res.status(404);
    throw new Error("Service not found");
  }
  res.json({ success: true, service });
});

export const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndDelete(req.params.id);
  if (!service) {
    res.status(404);
    throw new Error("Service not found");
  }
  res.json({ success: true, message: "Service deleted" });
});
