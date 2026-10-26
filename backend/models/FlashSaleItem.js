import mongoose from "mongoose";

const flashSaleItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

flashSaleItemSchema.index({ product: 1 }, { unique: true });

const FlashSaleItem = mongoose.model("FlashSaleItem", flashSaleItemSchema);
export default FlashSaleItem;
