import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    answer: { type: String, required: true },
  },
  { timestamps: true }
);

const questionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    question: { type: String, required: true },
    status: { type: String, enum: ["active", "hidden"], default: "active" },
    answers: [answerSchema],
  },
  { timestamps: true }
);

questionSchema.index({ product: 1, status: 1, createdAt: -1 });

export default mongoose.model("Question", questionSchema);
