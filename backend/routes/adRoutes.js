import express from "express";
import {
  createAd,
  getAds,
  deleteAd,
  toggleAdStatus,
  updateAd,
} from "../controller/adController.js";
import { adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getAds);
router.post("/", adminOnly, createAd);
router.put("/:id", adminOnly, updateAd);
router.delete("/:id", adminOnly, deleteAd);
router.patch("/:id/status", adminOnly, toggleAdStatus);

export default router;