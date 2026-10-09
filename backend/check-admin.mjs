import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

dotenv.config();
await mongoose.connect(process.env.MONGO_URI);

const user = await mongoose
  .model("User", new mongoose.Schema({ email: String, password: String, role: String, status: String }))
  .findOne({ email: "admin@example.com" });

if (!user) {
  console.log("RESULT: admin user NOT found in DB");
  process.exit(0);
}
const pw = process.argv[2];
const match = await bcrypt.compare(pw, user.password);
console.log("Password match", JSON.stringify(pw), ":", match);
process.exit(0);
