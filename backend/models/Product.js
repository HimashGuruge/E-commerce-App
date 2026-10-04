import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    category: { type: String, required: true },
    subcategory: { type: String },
    brand: { type: String },
    images: [{ type: String }],
    stock: { type: Number, default: 0 },
    sku: { type: String },
    status: { type: String, enum: ["active", "inactive", "ready"], default: "active" },
    tags: [{ type: String }],
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    isVariantParent: { type: Boolean, default: false },
    variantAttributes: [{ type: String }],
    variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "Variant" }],
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedByAdmin: { type: Boolean, default: true },
    reservedStock: { type: Number, default: 0 },
  },
  { timestamps: true }
);

productSchema.index({ seller: 1 });
productSchema.index({ approvedByAdmin: 1 });

export default mongoose.model("Product", productSchema);
