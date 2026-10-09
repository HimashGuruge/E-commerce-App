import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true },
    variantSku: { type: String, index: true },
    attributes: { type: Object, default: {} },
    price: { type: Number },
    sellingPrice: { type: Number },
    stock: { type: Number, default: 0 },
    images: [{ type: String }],
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    parentProduct: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  },
  { timestamps: true }
);

export default mongoose.model("Variant", variantSchema);
