import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    message: { type: String, required: true },
    imageUrl: { type: String, default: null },
    language: { type: String, default: "en-US" },
    isVoice: { type: Boolean, default: false },
    orderRef: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    senderType: {
      type: String,
      enum: ["user", "bot", "admin"],
      default: "user",
    },
    isAdmin: { type: Boolean, default: false },
    isBot: { type: Boolean, default: false },
    adminRead: { type: Boolean, default: false },
    userRead: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
