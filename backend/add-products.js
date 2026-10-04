import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import Product from "./models/Product.js";
import Variant from "./models/Variant.js";
import Category from "./models/Category.js";

dotenv.config();

const categories = [
  { name: "Electronics", slug: "electronics", description: "Gadgets, devices, and tech accessories", image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500" },
  { name: "Fashion", slug: "fashion", description: "Clothing, accessories, and apparel", image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=500" },
  { name: "Home & Kitchen", slug: "home-kitchen", description: "Furniture, decor, and kitchenware", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500" },
  { name: "Sports & Outdoors", slug: "sports-outdoors", description: "Fitness gear, outdoor equipment, and sportswear", image: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=500" },
  { name: "Books & Media", slug: "books-media", description: "Books, magazines, and media", image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=500" },
];

const products = [
  {
    name: "Wireless Bluetooth Headphones",
    description: "High-quality wireless headphones with noise cancellation, 30-hour battery life, and comfortable over-ear design.",
    price: 5999,
    originalPrice: 7999,
    category: "Electronics",
    brand: "SoundMax",
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
      "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500",
    ],
    stock: 100,
    status: "ready",
    tags: ["headphones", "wireless", "bluetooth", "audio"],
    highlights: ["Noise Cancellation", "30hr Battery", "Bluetooth 5.0", "Comfort Fit"],
    whatsInTheBox: "1x Headphones, 1x Charging Cable, 1x User Manual",
    isVariantParent: false,
  },
  {
    name: "Premium Cotton T-Shirt",
    description: "Soft, breathable 100% organic cotton t-shirt. Perfect for casual wear.",
    price: 1499,
    originalPrice: 1999,
    category: "Fashion",
    brand: "EcoWear",
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500",
      "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500",
    ],
    stock: 0,
    status: "ready",
    tags: ["t-shirt", "cotton", "organic", "casual"],
    highlights: ["100% Organic Cotton", "Breathable", "Machine Washable"],
    isVariantParent: true,
    variantAttributes: ["Size", "Color"],
  },
  {
    name: "Smart LED Desk Lamp",
    description: "Modern LED desk lamp with touch controls, adjustable brightness, and 5 color temperature modes. USB charging port built-in.",
    price: 3499,
    originalPrice: 4499,
    category: "Electronics",
    brand: "BrightHome",
    images: [
      "https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=500",
      "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=500",
    ],
    stock: 50,
    status: "ready",
    tags: ["lamp", "LED", "desk", "lighting"],
    highlights: ["Touch Control", "5 Color Modes", "USB Charging", "Eye Care"],
    whatsInTheBox: "1x Lamp, 1x Power Adapter, 1x User Manual",
    isVariantParent: false,
  },
  {
    name: "Stainless Steel Water Bottle",
    description: "Double-wall vacuum insulated water bottle. Keeps drinks cold 24hr or hot 12hr. BPA-free, leak-proof lid.",
    price: 2499,
    originalPrice: 2999,
    category: "Sports & Outdoors",
    brand: "HydroMax",
    images: [
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500",
      "https://images.unsplash.com/photo-1570831739435-6601aa3fa4fb?w=500",
    ],
    stock: 0,
    status: "ready",
    tags: ["bottle", "water", "insulated", "stainless"],
    highlights: ["24hr Cold", "12hr Hot", "BPA-Free", "Leak-Proof"],
    isVariantParent: true,
    variantAttributes: ["Color", "Capacity"],
  },
  {
    name: "Ergonomic Office Chair",
    description: "Adjustable ergonomic office chair with lumbar support, breathable mesh back, and padded armrests.",
    price: 24999,
    originalPrice: 32999,
    category: "Home & Kitchen",
    brand: "ComfortPlus",
    images: [
      "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=500",
      "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=500",
    ],
    stock: 15,
    status: "ready",
    tags: ["chair", "office", "ergonomic", "furniture"],
    highlights: ["Lumbar Support", "Adjustable Height", "Breathable Mesh", "360° Swivel"],
    whatsInTheBox: "1x Chair, 1x Assembly Kit, 1x User Manual",
    isVariantParent: false,
  },
  {
    name: "The Great Gatsby",
    description: "F. Scott Fitzgerald's classic novel about the American Dream. Hardcover edition with original cover art.",
    price: 1299,
    originalPrice: 1599,
    category: "Books & Media",
    brand: "Penguin Classics",
    images: [
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500",
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500",
    ],
    stock: 200,
    status: "ready",
    tags: ["book", "novel", "classic", "fiction"],
    highlights: ["Hardcover", "Original Cover", "192 Pages", "Award Winning"],
    whatsInTheBox: "1x Book",
    isVariantParent: false,
  },
  {
    name: "Running Shoes",
    description: "Lightweight, cushioned running shoes with responsive foam sole and breathable knit upper.",
    price: 8999,
    originalPrice: 11999,
    category: "Sports & Outdoors",
    brand: "SpeedFit",
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500",
      "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500",
    ],
    stock: 0,
    status: "ready",
    tags: ["shoes", "running", "sports", "footwear"],
    highlights: ["Lightweight", "Cushioned Sole", "Breathable", "Non-Slip Grip"],
    isVariantParent: true,
    variantAttributes: ["Size", "Color"],
  },
  {
    name: "Ceramic Coffee Mug Set",
    description: "Set of 4 handcrafted ceramic coffee mugs. Microwave and dishwasher safe. Minimalist design.",
    price: 2499,
    originalPrice: 2999,
    category: "Home & Kitchen",
    brand: "ArtisanCraft",
    images: [
      "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=500",
      "https://images.unsplash.com/photo-1577937927433-3d7e3c5d8c1a?w=500",
    ],
    stock: 80,
    status: "ready",
    tags: ["mug", "coffee", "ceramic", "kitchen"],
    highlights: ["Set of 4", "Microwave Safe", "Dishwasher Safe", "Handcrafted"],
    whatsInTheBox: "4x Coffee Mugs",
    isVariantParent: false,
  },
];

const variantTemplates = {
  "Premium Cotton T-Shirt": [
    { attributes: { Size: "S", Color: "White" }, price: 1499, sellingPrice: 1499, stock: 25, skuSuffix: "S-White", images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500"] },
    { attributes: { Size: "M", Color: "White" }, price: 1499, sellingPrice: 1499, stock: 30, skuSuffix: "M-White", images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500"] },
    { attributes: { Size: "L", Color: "White" }, price: 1499, sellingPrice: 1499, stock: 30, skuSuffix: "L-White", images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500"] },
    { attributes: { Size: "XL", Color: "White" }, price: 1699, sellingPrice: 1699, stock: 20, skuSuffix: "XL-White", images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500"] },
    { attributes: { Size: "S", Color: "Black" }, price: 1499, sellingPrice: 1499, stock: 25, skuSuffix: "S-Black", images: ["https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=500"] },
    { attributes: { Size: "M", Color: "Black" }, price: 1499, sellingPrice: 1499, stock: 30, skuSuffix: "M-Black", images: ["https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=500"] },
    { attributes: { Size: "L", Color: "Black" }, price: 1499, sellingPrice: 1499, stock: 30, skuSuffix: "L-Black", images: ["https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=500"] },
    { attributes: { Size: "XL", Color: "Black" }, price: 1699, sellingPrice: 1699, stock: 20, skuSuffix: "XL-Black", images: ["https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=500"] },
  ],
  "Stainless Steel Water Bottle": [
    { attributes: { Color: "Silver", Capacity: "500ml" }, price: 2499, sellingPrice: 2499, stock: 40, skuSuffix: "Silver-500", images: ["https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500"] },
    { attributes: { Color: "Silver", Capacity: "750ml" }, price: 2799, sellingPrice: 2799, stock: 35, skuSuffix: "Silver-750", images: ["https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500"] },
    { attributes: { Color: "Black", Capacity: "500ml" }, price: 2499, sellingPrice: 2499, stock: 30, skuSuffix: "Black-500", images: ["https://images.unsplash.com/photo-1570831739435-6601aa3fa4fb?w=500"] },
    { attributes: { Color: "Black", Capacity: "750ml" }, price: 2799, sellingPrice: 2799, stock: 25, skuSuffix: "Black-750", images: ["https://images.unsplash.com/photo-1570831739435-6601aa3fa4fb?w=500"] },
  ],
  "Running Shoes": [
    { attributes: { Size: "8", Color: "Blue" }, price: 8999, sellingPrice: 8999, stock: 20, skuSuffix: "8-Blue", images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500"] },
    { attributes: { Size: "9", Color: "Blue" }, price: 8999, sellingPrice: 8999, stock: 25, skuSuffix: "9-Blue", images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500"] },
    { attributes: { Size: "10", Color: "Blue" }, price: 8999, sellingPrice: 8999, stock: 20, skuSuffix: "10-Blue", images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500"] },
    { attributes: { Size: "8", Color: "Red" }, price: 8999, sellingPrice: 8999, stock: 15, skuSuffix: "8-Red", images: ["https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500"] },
    { attributes: { Size: "9", Color: "Red" }, price: 8999, sellingPrice: 8999, stock: 20, skuSuffix: "9-Red", images: ["https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500"] },
    { attributes: { Size: "10", Color: "Red" }, price: 8999, sellingPrice: 8999, stock: 15, skuSuffix: "10-Red", images: ["https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500"] },
  ],
};

const run = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB\n");

    // Create categories
    for (const cat of categories) {
      const existing = await Category.findOne({ slug: cat.slug });
      if (!existing) {
        await Category.create(cat);
        console.log(`Created category: "${cat.name}"`);
      } else {
        console.log(`Skipping category "${cat.name}" — already exists`);
      }
    }
    console.log("");

    // Create products
    for (const prod of products) {
      const existing = await Product.findOne({ name: prod.name });
      if (existing) {
        console.log(`Skipping "${prod.name}" — already exists`);
        continue;
      }

      if (prod.isVariantParent) {
        const { isVariantParent, variantAttributes, highlights, whatsInTheBox, ...parentData } = prod;
        const parent = await Product.create({ ...parentData, isVariantParent: true, variantAttributes });
        console.log(`Created parent product: "${parent.name}" (${parent._id})`);

        const template = variantTemplates[prod.name] || [];
        const variantDocs = template.map((v, idx) => ({
          ...v,
          parentProduct: parent._id,
          sku: v.sku || `SKU-${String(parent._id).slice(-4)}-${idx + 1}`,
          sellingPrice: v.sellingPrice || v.price,
        }));
        const created = await Variant.insertMany(variantDocs);
        await Product.findByIdAndUpdate(parent._id, {
          $push: { variants: { $each: created.map(v => v._id) } },
        });
        console.log(`  → ${created.length} variants created`);
      } else {
        const product = await Product.create(prod);
        console.log(`Created product: "${product.name}" (${product._id})`);
      }
    }

    console.log("\nDone!");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

run();
