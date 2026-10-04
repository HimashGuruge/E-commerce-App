import mongoose from "mongoose";

const sliderItemSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true },
    link: { type: String, default: "" },
    altText: { type: String, default: "" },
    order: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.model("SliderItem", sliderItemSchema);
