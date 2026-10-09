import express from "express";
import {
  createFeature,
  getFeatures,
  updateFeature,
  deleteFeature,
} from "../controller/featureController.js";

const router = express.Router();

router.get("/", getFeatures);
router.post("/", createFeature);
router.put("/:id", updateFeature);
router.delete("/:id", deleteFeature);

export default router;
