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
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
