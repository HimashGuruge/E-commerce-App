// Demo data seeder for the seller dashboard.
// Run: node seed-demo-seller.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load backend/.env without pulling in the whole app stack
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI not found in backend/.env");
  process.exit(1);
}

await mongoose.connect(MONGO_URI, { compressors: ["zlib"], zlibCompressionLevel: 3 });

// Load models lazily via mongoose.connection — dynamic import keeps them in the module registry
const { default: User } = await import("./models/User.js");
const { default: Seller } = await import("./models/Seller.js");
const { default: Product } = await import("./models/Product.js");
const { default: Order } = await import("./models/Order.js");
const { default: Category } = await import("./models/Category.js");

const DEMO_EMAIL = "seller@demo.com";
const DEMO_PASSWORD = "Seller@123";
const SHOP_NAME = "DemoTech Store";

// ---- 1. Seller user (role=seller) ----
let user = await User.findOne({ email: DEMO_EMAIL });
if (!user) {
  user = await User.create({
    name: "Demo Seller",
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    role: "seller",
    status: "active",
    phone: "0712345678",
  });
  console.log("created user:", DEMO_EMAIL);
} else {
  console.log("user exists:", DEMO_EMAIL);
}

// ---- 2. Seller profile (approved) ----
let seller = await Seller.findOne({ user: user._id });
if (!seller) {
  seller = await Seller.create({
    user: user._id,
    shopName: SHOP_NAME,
    shopDescription: "Demo store for testing the seller dashboard. Sells gadgets and accessories.",
    shopLogo: "https://placehold.co/200x200/f85606/white?text=DT",
    businessType: "individual",
    ownerName: "Demo Seller",
    ownerPhone: "0712345678",
    ownerNic: "123456789V",
    ownerAddress: "12 Demo Street, Colombo 05",
    warehouseAddress: "Warehouse 7, Export Processing Zone, Colombo 10",
    returnAddress: "12 Demo Street, Colombo 05",
    bankName: "Bank of Ceylon",
    bankAccountTitle: "Demo Seller",
    bankAccountNo: "123456789",
    bankBranch: "Colombo Main Branch",
    status: "approved",
    approvedAt: new Date(),
    commissionRate: 5,
    rating: 4.6,
    numRatings: 12,
    shipOnTime: 97,
    chatResponseRate: 88,
    onboardingCompleted: true,
  });
  console.log("created seller profile:", SHOP_NAME);
} else {
  console.log("seller profile exists:", seller.shopName);
}

// ---- 3. Products ----
const categories = Category ? await Category.find().limit(20) : [];
const catPick = (names) => {
  const found = categories.find((c) => names.includes(c.name?.toLowerCase()));
  return found?.name || "Electronics";
};

const productDefs = [
  {
    name: "Wireless Earbuds Pro",
    price: 7500,
    originalPrice: 9900,
    description: "Bluetooth 5.3 wireless earbuds with 24-hour battery and noise isolation.",
    brand: "DemoTech",
    stock: 42,
    category: catPick(["electronics", "phones", "mobile"]),
    subcategory: "Audio",
    sku: "DEMO-EB-001",
  },
  {
    name: "Magnetic Phone Case",
    price: 1500,
    originalPrice: 2000,
    description: "Slim magnetic case with camera protection for popular phone models.",
    brand: "DemoTech",
    stock: 120,
    category: catPick(["electronics", "accessories"]),
    subcategory: "Accessories",
    sku: "DEMO-PH-002",
  },
  {
    name: "10000mAh Power Bank",
    price: 5500,
    originalPrice: 6500,
    description: "Fast-charge power bank with dual USB output and LED display.",
    brand: "DemoTech",
    stock: 30,
    category: catPick(["electronics", "accessories"]),
    subcategory: "Chargers",
    sku: "DEMO-PB-003",
  },
];

const products = [];
for (const def of productDefs) {
  let p = await Product.findOne({ sku: def.sku });
  if (!p) {
    p = await Product.create({ ...def, seller: user._id, approvedByAdmin: true, status: "active" });
    console.log("created product:", p.name);
  } else {
    console.log("product exists:", p.name);
  }
  products.push(p);
}

// ---- 4. Sample buyer (for orders) ----
let buyer = await User.findOne({ email: "buyer@demo.com" });
if (!buyer) {
  buyer = await User.create({
    name: "Demo Buyer",
    email: "buyer@demo.com",
    password: DEMO_PASSWORD,
    role: "customer",
    status: "active",
    phone: "0798765432",
  });
  console.log("created buyer: buyer@demo.com");
} else {
  console.log("buyer exists: buyer@demo.com");
}

// ---- 5. Sample orders (paid) ----
const orderDefs = [
  {
    items: [[products[0], 1], [products[2], 1]],
    orderStatus: "delivered",
    daysAgo: 25,
  },
  {
    items: [[products[1], 2]],
    orderStatus: "shipped",
    daysAgo: 8,
  },
  {
    items: [[products[0], 2]],
    orderStatus: "processing",
    daysAgo: 1,
  },
];

for (let i = 0; i < orderDefs.length; i++) {
  const def = orderDefs[i];
  const exists = await Order.findOne({
    user: buyer._id,
    trackingNumber: `DEMO-ORD-${i + 1}`,
  });
  if (exists) {
    console.log("order exists: DEMO-ORD-", i + 1);
    continue;
  }
  const items = def.items.map(([product, quantity]) => ({
    product: product._id,
    name: product.name,
    image: product.images?.[0] || "https://placehold.co/300x300/eeeeee/999999?text=Demo",
    quantity,
    price: product.price,
    sku: product.sku,
  }));
  const totalPrice = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  await Order.create({
    user: buyer._id,
    items,
    shippingAddress: {
      fullName: buyer.name,
      address: "45 Buyer Road, Dehiwala",
      city: "Colombo",
      state: "Western",
      zip: "11005",
      phone: buyer.phone,
    },
    paymentMethod: "stripe",
    paymentStatus: "paid",
    orderStatus: def.orderStatus,
    totalPrice,
    trackingNumber: `DEMO-ORD-${i + 1}`,
    courier: "Demo Express",
    createdAt: new Date(Date.now() - def.daysAgo * 24 * 60 * 60 * 1000),
  });
  console.log("created order: DEMO-ORD-", i + 1, `(${def.orderStatus})`);
}

// ---- 6. Sample chat message from the buyer about an order ----
const Message = (await import("./models/Message.js")).default;
const msgDefs = [
  { orderTracking: "DEMO-ORD-3", text: "Hi, my order DEMO-ORD-3 is still processing — when will it be shipped?" },
  { orderTracking: "DEMO-ORD-2", text: "Thank you! I received my cases, they look great. 😊" },
];
for (const def of msgDefs) {
  const existsMsg = await Message.findOne({ sender: buyer._id, message: def.text });
  if (existsMsg) {
    console.log("message exists:", def.text.slice(0, 32) + "…");
    continue;
  }
  const order = await Order.findOne({ trackingNumber: def.orderTracking });
  if (!order) continue;
  await Message.create({
    sender: buyer._id,
    recipient: null,
    message: def.text,
    orderRef: order._id,
    senderType: "user",
    isAdmin: false,
    userRead: true,
  });
  console.log("created message for", def.orderTracking);
}

await mongoose.disconnect();
console.log("\nDone. Login: seller@demo.com / Seller@123");
console.log("Shop page: http://localhost:3001/store/" + encodeURIComponent(SHOP_NAME));
