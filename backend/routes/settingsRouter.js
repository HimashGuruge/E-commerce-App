import express from "express";
import { getPublicSettings, getSettings, updateSettings, testEmail } from "../controller/settingsController.js";
import { adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/public", getPublicSettings);
router.get("/", adminOnly, getSettings);
router.put("/", adminOnly, updateSettings);
router.post("/test-email", adminOnly, testEmail);

export default router;
