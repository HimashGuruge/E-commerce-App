import asyncHandler from "express-async-handler";
import Service from "../models/Service.js";
import { normalizeServiceStyle } from "../utils/serviceStyle.js";

export const createService = asyncHandler(async (req, res) => {
  const body = req.body;
  if (!body.title || !String(body.title).trim()) {
    res.status(400);
    throw new Error("Service title is required");
  }
  // Keep only known, validated styling keys — never store raw client data.
  body.style = normalizeServiceStyle(body.style || {});
  const service = await Service.create(body);
  res.status(201).json({ success: true, service });
});

export const getServices = asyncHandler(async (req, res) => {
  const services = await Service.find({ status: "active" }).sort({ createdAt: 1 });
  res.json({ success: true, services });
});

export const updateService = asyncHandler(async (req, res) => {
  if (req.body.style !== undefined) {
    req.body.style = normalizeServiceStyle(
      req.body.style || {},
      req.body
    );
  }
  const service = await Service.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
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
