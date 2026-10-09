import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import connectDB from "./config/db.js";

dotenv.config();
await connectDB();
const User = (await import("./models/User.js")).default;
const { appConfig } = await import("./config/env.js");

const admin = await User.findOne({ email: "admin@example.com" });
if (!admin) throw new Error("no admin found");
const token = jwt.sign({ id: admin._id, role: admin.role }, appConfig.jwtSecret, { expiresIn: "30d" });

const res = await fetch("http://localhost:4000/api/users/me", {
  headers: { Authorization: `Bearer ${token}` },
});
const body = await res.json();
console.log("HTTP", res.status, JSON.stringify(body));
process.exit(0);
