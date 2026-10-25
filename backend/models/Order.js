import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        variant: { type: mongoose.Schema.Types.ObjectId, ref: "Variant" },
        name: { type: String },
        image: { type: String },
        quantity: { type: Number },
        price: { type: Number },
        sku: { type: String },
      },
    ],
    shippingAddress: {
      fullName: { type: String },
      address: { type: String },
      city: { type: String },
      state: { type: String },
      zip: { type: String },
      phone: { type: String },
    },
    paymentMethod: { type: String, enum: ["cod", "stripe"], required: true },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    orderStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled", "failed"],
      default: "pending",
    },
    totalPrice: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    stripeSessionId: { type: String },
    trackingNumber: { type: String },
    courier: { type: String },
    domexStatus: { type: String },
    cancelledBy: { type: String },
    cancellationReason: { type: String },
    seenByAdmin: { type: Boolean, default: false },
    stockFinalized: { type: Boolean, default: false },
    // Snapshot of the coupon applied at checkout (orders keep their own copy)
    coupon: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon" },
      code: { type: String },
      discountType: { type: String },
      discountValue: { type: Number },
      discountAmount: { type: Number },
    },
    discountTotal: { type: Number, default: 0 },
    // Guards the usedCount increment against webhook + client-verify races
    couponCounted: { type: Boolean, default: false },
    // Immutable, per-seller commission snapshot taken at order placement so
    // later rate changes never rewrite history:
    //   [{ seller (User id), rate, amount }] — amount = seller's item total x rate/100
    // Orders created before this feature have no snapshot; such history is
    // backfilled lazily (see payoutService.backfillOrderSnapshot, flagged
    // snapshotSource: "current_rate_backfill").
    commissionSnapshot: [
      {
        seller: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rate: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
