import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import User from "./models/User.js";
import Seller from "./models/Seller.js";
import bcrypt from "bcryptjs";

dotenv.config();

const DEMO_SELLER = {
  name: "Demo Seller",
  lastname: "Test",
  email: "demo.seller@example.com",
  password: "Seller123!",
  phone: "+94 77 000 0000",
  address: "Demo Street, Colombo",
};

const DEMO_PROFILE = {
  shopName: "Demo Store",
  shopDescription: "A demo seller account for testing",
  businessType: "individual",
  ownerName: "Demo Seller",
  ownerPhone: "+94 77 000 0000",
  ownerAddress: "Demo Street, Colombo",
  warehouseAddress: "Demo Street, Colombo",
  returnAddress: "Demo Street, Colombo",
  bankName: "Demo Bank",
  bankAccountTitle: "Demo Seller",
  bankAccountNo: "0000000000",
  bankBranch: "Colombo",
  status: "approved",
  approvedAt: new Date(),
  commissionRate: 0,
  totalEarnings: 0,
  availableBalance: 0,
  onboardingCompleted: true,
  rating: 4.5,
  numRatings: 10,
  shipOnTime: 98,
  chatResponseRate: 95,
};

await connectDB();

let user = await User.findOne({ email: DEMO_SELLER.email });
if (!user) {
  user = await User.create({ ...DEMO_SELLER, role: "seller" });
  console.log(`Created user: ${user.email} (password: ${DEMO_SELLER.password})`);
} else {
  console.log(`User already exists: ${user.email}`);
}

let profile = await Seller.findOne({ user: user._id });
if (!profile) {
  profile = await Seller.create({ ...DEMO_PROFILE, user: user._id });
  console.log(`Created seller profile: ${profile.shopName} (approved)`);
} else {
  console.log(`Seller profile already exists: ${profile.shopName} (status: ${profile.status})`);
}

const verify = await bcrypt.compare(DEMO_SELLER.password, user.password);
console.log(`Login verify (${DEMO_SELLER.email} / ${DEMO_SELLER.password}): ${verify ? "OK" : "FAIL"}`);
process.exit(0);
