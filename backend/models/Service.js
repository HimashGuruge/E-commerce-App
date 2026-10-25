import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: false },
    title: { type: String, required: true },
    description: { type: String },
    icon: { type: String },
    iconName: { type: String, default: "Palette" },
    iconType: { type: String, default: "Palette" },
    imageUrl: { type: String, default: null },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    // Per-service styling (structured values, not rich-text HTML).
    // Normalized/whitelisted by the controller before saving.
    style: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("Service", serviceSchema);
