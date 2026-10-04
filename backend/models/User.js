import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    role: { type: String, enum: ["customer", "seller", "admin"], default: "customer" },
    status: { type: String, enum: ["active", "inactive", "suspended"], default: "active" },
    profileImage: { type: String },
    phone: { type: String },
    googleId: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
    lastSeen: { type: Date },
    seenOrders: { type: [String], default: [] },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
