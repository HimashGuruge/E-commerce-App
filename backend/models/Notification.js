import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["REVIEW_REMINDER", "ORDER_STATUS"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    variant: { type: mongoose.Schema.Types.ObjectId, ref: "Variant" },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    read: { type: Boolean, default: false },
    reviewSubmitted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One reminder per user + product + order (DB-level deduplication)
notificationSchema.index(
  { user: 1, product: 1, order: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: "REVIEW_REMINDER" } }
);

export default mongoose.model("Notification", notificationSchema);
