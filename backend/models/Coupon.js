import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: /^[A-Z0-9_-]{3,30}$/,
    },
    description: { type: String, default: "" },
    discountType: {
      type: String,
      enum: ["percent", "fixed", "freeshipping"],
      required: true,
    },
    // percent: 1-100 (%) • fixed: amount in Rs • freeshipping: ignored (shipping waived)
    discountValue: { type: Number, required: false, default: 0, min: 0 },
    // 0 = no cap
    maxDiscountAmount: { type: Number, default: 0, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    // 0 = unlimited uses
    maxUses: { type: Number, default: 0, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
