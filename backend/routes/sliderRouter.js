import express from "express";
import {
  createSliderItem,
  getSliderItems,
  updateSliderItem,
  deleteSliderItem,
  toggleSliderItemStatus,
} from "../controller/sliderController.js";
import { adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getSliderItems);
router.post("/", adminOnly, createSliderItem);
router.put("/:id", adminOnly, updateSliderItem);
router.delete("/:id", adminOnly, deleteSliderItem);
router.patch("/:id/status", adminOnly, toggleSliderItemStatus);

export default router;
