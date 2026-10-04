import express from "express";
import {
  createService,
  getServices,
  updateService,
  deleteService,
} from "../controller/serviceController.js";
import { adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getServices);
router.post("/", adminOnly, createService);
router.put("/:id", adminOnly, updateService);
router.delete("/:id", adminOnly, deleteService);

export default router;