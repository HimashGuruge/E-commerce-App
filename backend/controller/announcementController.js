import asyncHandler from "express-async-handler";
import Announcement from "../models/Announcement.js";

export const createAnnouncement = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    res.status(400);
    throw new Error("Announcement text is required");
  }
  const announcement = await Announcement.create(req.body);
  res.status(201).json({ success: true, announcement });
});

export const getAnnouncements = asyncHandler(async (req, res) => {
  const { active } = req.query;
  const filter = active === "true" ? { status: "active" } : {};
  const announcements = await Announcement.find(filter).sort({ order: 1, createdAt: -1 });
  res.json({ success: true, announcements });
});

export const updateAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!announcement) {
    res.status(404);
    throw new Error("Announcement not found");
  }
  res.json({ success: true, announcement });
});

export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findByIdAndDelete(req.params.id);
  if (!announcement) {
    res.status(404);
    throw new Error("Announcement not found");
  }
  res.json({ success: true, message: "Announcement deleted" });
});

export const toggleAnnouncementStatus = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) {
    res.status(404);
    throw new Error("Announcement not found");
  }
  announcement.status = announcement.status === "active" ? "inactive" : "active";
  await announcement.save();
  res.json({ success: true, announcement });
});
