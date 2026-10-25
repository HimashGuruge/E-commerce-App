import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    icon: { type: String, default: "Sparkles" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    order: { type: Number, default: 0 },
    // Optional per-announcement text styling. Old docs have none (default {})
    // and the frontend falls back to the global bar styling.
    style: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("Announcement", announcementSchema);
