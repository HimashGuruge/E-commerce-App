import asyncHandler from "express-async-handler";
import Coupon from "../models/Coupon.js";

// ---------------- input validation ----------------

const CODE_RE = /^[A-Z0-9_-]{3,30}$/;

export const validateCouponPayload = (data, { partial = false } = {}) => {
  const errors = [];

  if (!partial || data.code !== undefined) {
    const code = String(data.code ?? "").trim().toUpperCase();
    if (!code) {
      errors.push("Code is required");
    } else if (!CODE_RE.test(code)) {
      errors.push("Code must be 3-30 characters (A-Z, 0-9, _ or -)");
    } else {
      data.code = code;
    }
  }

  if (!partial || data.discountType !== undefined) {
    if (!["percent", "fixed", "freeshipping"].includes(data.discountType)) {
      errors.push("discountType must be percent, fixed or freeshipping");
    } else if (data.discountType === "percent") {
      const v = Number(data.discountValue);
      if (!Number.isFinite(v) || v < 1 || v > 100) {
        errors.push("Percent value must be between 1 and 100");
      } else {
        data.discountValue = v;
      }
    } else if (data.discountType === "fixed") {
      const v = Number(data.discountValue);
      if (!Number.isFinite(v) || v < 1) {
        errors.push("Fixed value must be at least 1");
      } else {
        data.discountValue = v;
      }
    } else {
      data.discountValue = 0;
    }
  }

  if (data.maxDiscountAmount !== undefined && data.maxDiscountAmount !== null && data.maxDiscountAmount !== "") {
    const v = Number(data.maxDiscountAmount);
    if (!Number.isFinite(v) || v < 0) {
      errors.push("Max discount amount must be 0 (no cap) or greater");
    } else {
      data.maxDiscountAmount = v;
    }
  }

  if (data.minOrderAmount !== undefined && data.minOrderAmount !== null && data.minOrderAmount !== "") {
    const v = Number(data.minOrderAmount);
    if (!Number.isFinite(v) || v < 0) {
      errors.push("Minimum order amount must be 0 or greater");
    } else {
      data.minOrderAmount = v;
    }
  }

  if (data.maxUses !== undefined && data.maxUses !== null && data.maxUses !== "") {
    const v = Number(data.maxUses);
    if (!Number.isInteger(v) || v < 0) {
      errors.push("Max uses must be a whole number (0 = unlimited)");
    } else {
      data.maxUses = v;
    }
  }

  if (data.expiresAt !== undefined) {
    if (data.expiresAt === null || data.expiresAt === "") {
      data.expiresAt = null;
    } else {
      const d = new Date(data.expiresAt);
      if (Number.isNaN(d.getTime())) {
        errors.push("Expiry date is invalid");
      } else {
        data.expiresAt = d;
      }
    }
  }

  if (data.active !== undefined) {
    data.active = Boolean(data.active);
  }

  if (data.description !== undefined) {
    data.description = String(data.description).slice(0, 500);
  }

  return errors;
};

// ---------------- handlers ----------------

export const listCoupons = asyncHandler(async (req, res) => {
  const { search, active } = req.query;
  const filter = {};
  if (active === "true" || active === "false") {
    filter.active = active === "true";
  }
  if (search && search.trim()) {
    filter.code = new RegExp(search.trim().toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }
  const coupons = await Coupon.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, coupons });
});

export const getCouponById = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }
  res.json({ success: true, coupon });
});

export const createCoupon = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  const errors = validateCouponPayload(data);
  if (errors.length) {
    res.status(400);
    throw new Error(errors.join(". "));
  }
  try {
    const coupon = await Coupon.create(data);
    res.status(201).json({ success: true, coupon });
  } catch (err) {
    if (err.code === 11000) {
      res.status(409);
      throw new Error("A coupon with this code already exists");
    }
    throw err;
  }
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const update = { ...req.body };
  const errors = validateCouponPayload(update, { partial: true });
  if (errors.length) {
    res.status(400);
    throw new Error(errors.join(". "));
  }
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!coupon) {
      res.status(404);
      throw new Error("Coupon not found");
    }
    res.json({ success: true, coupon });
  } catch (err) {
    if (err.code === 11000) {
      res.status(409);
      throw new Error("A coupon with this code already exists");
    }
    throw err;
  }
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  // Hard delete — orders keep their own snapshot of the applied coupon.
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }
  res.json({ success: true, message: "Coupon deleted" });
});

export const toggleCouponActive = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }
  coupon.active = req.body?.active === undefined ? !coupon.active : Boolean(req.body.active);
  await coupon.save();
  res.json({ success: true, coupon });
});
