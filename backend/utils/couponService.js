import mongoose from "mongoose";
import Coupon from "../models/Coupon.js";
import Order from "../models/Order.js";

/**
 * Pure evaluation of a coupon document against an order subtotal.
 * Returns { ok: true, discount, shippingDiscount } or { ok: false, message }.
 *
 * - percent:      subtotal * value/100, capped by maxDiscountAmount (0 = none) and subtotal
 * - fixed:        value, capped by maxDiscountAmount and subtotal
 * - freeshipping: waives the shipping cost (shippingDiscount = shippingCost)
 */
export const evaluateCoupon = (coupon, subtotal, shippingCost = 0) => {
  if (!coupon) return { ok: false, message: "Coupon not found" };
  if (!coupon.active) return { ok: false, message: "Coupon is no longer active" };
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { ok: false, message: "Coupon has expired" };
  }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, message: "Coupon has reached its usage limit" };
  }
  if (subtotal < (coupon.minOrderAmount || 0)) {
    return {
      ok: false,
      message: `Minimum order amount is Rs. ${(coupon.minOrderAmount || 0).toLocaleString()}`,
    };
  }

  let discount = 0;
  let shippingDiscount = 0;
  const cap = coupon.maxDiscountAmount > 0 ? coupon.maxDiscountAmount : Infinity;

  if (coupon.discountType === "percent") {
    discount = Math.round((subtotal * (coupon.discountValue || 0)) / 100);
  } else if (coupon.discountType === "fixed") {
    discount = coupon.discountValue || 0;
  } else if (coupon.discountType === "freeshipping") {
    shippingDiscount = Math.min(shippingCost, subtotal + shippingCost);
    discount = 0;
  }

  discount = Math.min(Math.max(0, Math.round(discount)), cap, Math.max(0, Math.round(subtotal)));

  return { ok: true, discount, shippingDiscount };
};

/**
 * Look up a coupon by code and evaluate it for an order.
 * Returns { ok, coupon, discount, shippingDiscount, message }.
 */
export const resolveCoupon = async (code, subtotal, shippingCost = 0) => {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return { ok: false, coupon: null, discount: 0, shippingDiscount: 0, message: "" };

  const coupon = await Coupon.findOne({ code: normalized });
  if (!coupon) return { ok: false, coupon: null, discount: 0, shippingDiscount: 0, message: "Invalid coupon code" };

  const result = evaluateCoupon(coupon, subtotal, shippingCost);
  return result.ok
    ? { ok: true, coupon, discount: result.discount, shippingDiscount: result.shippingDiscount, message: "" }
    : { ok: false, coupon: null, discount: 0, shippingDiscount: 0, message: result.message };
};

/**
 * Atomically claim the coupon-use slot for an order (at most once per order),
 * then increment the coupon's usedCount if the coupon still has uses left.
 * Returns true when this call consumed the use.
 */
export const recordCouponUse = async (order) => {
  const couponId = order?.coupon?._id || order?.coupon?.code;
  if (!couponId) return false;

  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, couponCounted: { $ne: true } },
    { $set: { couponCounted: true } }
  );
  if (!claimed) return false; // already counted (webhook + client verify race)

  if (!mongoose.isValidObjectId(couponId)) return false;
  // only inc while there is headroom (maxUses 0 = unlimited). $expr keeps the
  // cross-field comparison server-side so Mongoose doesn't try to cast it.
  const updated = await Coupon.findOneAndUpdate(
    {
      _id: couponId,
      $expr: { $or: [{ $eq: ["$maxUses", 0] }, { $lt: ["$usedCount", "$maxUses"] }] },
    },
    { $inc: { usedCount: 1 } }
  );
  return Boolean(updated);
};
