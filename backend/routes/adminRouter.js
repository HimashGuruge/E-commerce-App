import express from "express";
import { getAdminStats } from "../controller/adminController.js";
import { adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/stats", adminOnly, getAdminStats);

export default router;
