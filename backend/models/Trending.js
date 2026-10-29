import mongoose from "mongoose";

const trendingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  icon: {
    type: String,
    default: "🔥",
  },
  productId: {
    type: String,
    default: "",
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
}, {
  timestamps: true,
});

const Trending = mongoose.model("Trending", trendingSchema);
export default Trending;