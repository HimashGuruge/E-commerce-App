import mongoose from "mongoose";

const sellerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    shopName: { type: String, required: true },
    shopDescription: { type: String, default: "" },
    shopLogo: { type: String, default: "" },
    shopBanner: { type: String, default: "" },
    businessType: { type: String, enum: ["individual", "company"], default: "individual" },
    registrationNumber: { type: String, default: "" },
    ownerName: { type: String, required: true },
    ownerPhone: { type: String, required: true },
    ownerNic: { type: String, default: "" },
    ownerAddress: { type: String, default: "" },
    warehouseAddress: { type: String, default: "" },
    returnAddress: { type: String, default: "" },
    bankName: { type: String, default: "" },
    bankAccountTitle: { type: String, default: "" },
    bankAccountNo: { type: String, default: "" },
    bankBranch: { type: String, default: "" },
    bankChequeImage: { type: String, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected", "suspended"], default: "pending" },
    rejectionReason: { type: String, default: "" },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    commissionRate: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    availableBalance: { type: Number, default: 0 },
    onboardingCompleted: { type: Boolean, default: false },
    trainingAttended: { type: Boolean, default: false },
    packagingMaterialsSent: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    numRatings: { type: Number, default: 0 },
    shipOnTime: { type: Number, default: 0 },
    chatResponseRate: { type: Number, default: 0 },
  },
  { timestamps: true }
);

sellerSchema.index({ status: 1 });

export default mongoose.model("Seller", sellerSchema);