import express from "express";
import {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementStatus,
} from "../controller/announcementController.js";
import { adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getAnnouncements);
router.post("/", adminOnly, createAnnouncement);
router.put("/:id", adminOnly, updateAnnouncement);
router.delete("/:id", adminOnly, deleteAnnouncement);
router.patch("/:id/status", adminOnly, toggleAnnouncementStatus);

export default router;
