import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
dotenv.config();
await connectDB();
const { Loginuser } = await import("./controller/usersController.js");

let sent = null;
const req = { body: { email: "admin@example.com", password: "admin123" } };
const res = {
  status(c) { return this; },
  json(data) { sent = data; return this; },
};
try {
  await Loginuser(req, res);
} catch (e) {
  sent = { threw: e.message };
}
console.log(JSON.stringify(sent ? { success: sent.success, role: sent.role, tokenLen: sent.token?.length, error: sent.error || sent.threw } : null));
process.exit(0);
