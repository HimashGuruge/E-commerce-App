import express from "express";
import { adminOnly } from "../middleware/authMiddleware.js";
import {
  getTrending,
  getAllTrending,
  addTrending,
  updateTrending,
  deleteTrending,
} from "../controller/trendingController.js";

const router = express.Router();

router.get("/", getTrending);
router.get("/all", adminOnly, getAllTrending);
router.post("/", adminOnly, addTrending);
router.put("/:id", adminOnly, updateTrending);
router.delete("/:id", adminOnly, deleteTrending);

export default router;