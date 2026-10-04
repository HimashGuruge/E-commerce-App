import express from "express";
import {
  addAddress,
  deleteAddress,
  getUserAddresses,
  updateAddress,
  getAddressById
} from "../controller/addressController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * 📍 ADDRESS ROUTES
 * Manage customer addresses
 */

// Get all addresses
router.get("/", authMiddleware, getUserAddresses);

// Get single address
router.get("/:addressId", authMiddleware, getAddressById);

// Add new address
router.post("/", authMiddleware, addAddress);

// Update address
router.put("/:addressId", authMiddleware, updateAddress);

// Delete address
router.delete("/:addressId", authMiddleware, deleteAddress);

export default router;