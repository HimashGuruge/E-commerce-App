import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

dotenv.config();
await mongoose.connect(process.env.MONGO_URI);
const M = mongoose.model("User", new mongoose.Schema({ email: String, password: String }));
const hashed = await bcrypt.hash("admin123", 10);
const res = await M.updateOne({ email: "admin@example.com" }, { password: hashed });
console.log("Updated docs:", res.modifiedCount);
const u = await M.findOne({ email: "admin@example.com" });
console.log("Verify admin123:", await bcrypt.compare("admin123", u.password));
process.exit(0);
