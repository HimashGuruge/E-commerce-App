import mongoose from "mongoose";

const featureSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    iconName: { type: String, required: true, default: "Shield" },
    color: {
      type: String,
      enum: ["blue", "green", "amber", "pink", "purple", "slate"],
      default: "blue",
    },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Feature", featureSchema);
