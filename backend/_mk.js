import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });
await mongoose.connect(process.env.MONGO_URI, { compressors: ["zlib"] });
const User = (await import("./models/User.js")).default;
const Product = (await import("./models/Product.js")).default;
const Order = (await import("./models/Order.js")).default;
const seller = await User.findOne({ email: "seller@demo.com" });
const buyer = await User.findOne({ email: "buyer@demo.com" });
const prod = await Product.findOne({ seller: seller._id });
const order = await Order.create({
  user: buyer._id,
  items: [{ product: prod._id, name: prod.name, image: prod.images?.[0] || "", quantity: 1, price: prod.price, sku: prod.sku }],
  shippingAddress: { fullName: buyer.name, address: "Test", city: "Colombo", state: "Western", zip: "1", phone: buyer.phone },
  paymentMethod: "stripe", paymentStatus: "paid", orderStatus: "pending", totalPrice: prod.price,
});
console.log("ORDER_ID=" + order._id);
await mongoose.disconnect();
