import mongoose from "mongoose";

const adSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    image: { type: String },
    imageUrl: { type: String },
    mediaType: { type: String, enum: ["image", "video"], default: "image" },
    videoUrl: { type: String },
    link: { type: String },
    category: { type: String, default: "home" },
    position: { type: String, enum: ["banner", "sidebar", "popup"], default: "banner" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    startDate: { type: Date },
    endDate: { type: Date },
    countdownText: { type: String, default: "Sale Ends In:" },
  },
  { timestamps: true }
);

export default mongoose.model("Ad", adSchema);
