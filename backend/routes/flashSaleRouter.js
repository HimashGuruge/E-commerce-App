import express from "express";
import { adminOnly } from "../middleware/authMiddleware.js";
import {
  getFlashSale,
  getAllFlashSale,
  addFlashSaleItem,
  updateFlashSaleItem,
  deleteFlashSaleItem,
} from "../controller/flashSaleController.js";

const router = express.Router();

router.get("/", getFlashSale);
router.get("/all", adminOnly, getAllFlashSale);
router.post("/", adminOnly, addFlashSaleItem);
router.put("/:id", adminOnly, updateFlashSaleItem);
router.delete("/:id", adminOnly, deleteFlashSaleItem);

export default router;
