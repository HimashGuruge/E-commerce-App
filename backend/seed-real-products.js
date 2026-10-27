import dotenv from "dotenv";
import connectDB from "./config/db.js";
import Product from "./models/Product.js";
import Variant from "./models/Variant.js";
import { deleteProductImages } from "./services/storageService.js";

dotenv.config();

// 27 real live Daraz products. URLs verified on 2026-10-27.
// Name, description, photos are scraped from the live page at runtime.
const products = [
  // ------------------- Electronics (7)
  { url: "https://www.daraz.lk/i214424811-s1331097716.html", name: "USB-C 3.2 Gen 2 20Gbps Fast Charging Cable", brand: "Ugreen", category: "Electronics", price: 3471, tags: ["usb-c", "cable", "charging"] },
  { url: "https://www.daraz.lk/i175370905-s1133794596.html", name: "PD Fast Charging Car Charger", brand: "Baseus", category: "Electronics", price: 5963, tags: ["car-charger", "usb", "car"] },
  { url: "https://www.daraz.lk/i167513102-s1116162725.html", name: "HP Laptop Power Adapter 65W", brand: "HP", category: "Electronics", price: 8500, tags: ["laptop", "charger", "adapter"] },
  { url: "https://www.daraz.lk/i173129078-s1128489537.html", name: "EASUN 350W UPS with Built-in Charger", brand: "EASUN", category: "Electronics", price: 12900, tags: ["ups", "battery", "power-backup"] },
  { url: "https://www.daraz.lk/i178262783-s1139900242.html", name: "Smart 100 LED Solar Garden Light with Motion Sensor", brand: "STYLES-CMB", category: "Electronics", price: 5176, tags: ["solar-light", "outdoor", "led"] },
  { url: "https://www.daraz.lk/i232071083-s1432146211.html", name: "Foldable Desktop Phone & Tablet Stand", brand: "Generic", category: "Electronics", price: 2780, tags: ["phone-stand", "desk", "accessory"] },
  { url: "https://www.daraz.lk/i214500569-s1332603822.html", name: "10 Pack E27 LED Bulbs 12V Outdoor", brand: "AP", category: "Electronics", price: 5335, tags: ["led-bulb", "lighting", "12v"] },

  // ------------------- Fashion (10)
  { url: "https://www.daraz.lk/i193559214-s1216769262.html", name: "Oversized Cotton T-Shirt for Men", brand: "Lauda", category: "Fashion", price: 4499, tags: ["t-shirt", "men", "cotton"] },
  { url: "https://www.daraz.lk/i193693064-s1218291343.html", name: "3D Printed Casual T-Shirt Unisex", brand: "Lauda", category: "Fashion", price: 4499, tags: ["t-shirt", "unisex", "casual"] },
  { url: "https://www.daraz.lk/i230607870-s1422951973.html", name: "Women's Cotton Linen Harem Pants Summer", brand: "Zhenling", category: "Fashion", price: 11748, tags: ["pant", "women", "summer"] },
  { url: "https://www.daraz.lk/i229940668-s1417279946.html", name: "Women's Lace-up Loose White Dress Autumn", brand: "Zhenling", category: "Fashion", price: 19660, tags: ["dress", "women", "casual"] },
  { url: "https://www.daraz.lk/i194438176-s1225945453.html", name: "Men's Fleece Hoodie Sweatshirt", brand: "Generic", category: "Fashion", price: 4999, tags: ["hoodie", "men", "fleece"] },
  { url: "https://www.daraz.lk/i230402716-s1421564631.html", name: "Men's Quick Dry Beach & Swim Shorts", brand: "Songmei", category: "Fashion", price: 14661, tags: ["shorts", "men", "sports"] },
  { url: "https://www.daraz.lk/i232577624-s1436163927.html", name: "Women's Korean Style Lace Top Summer", brand: "Generic", category: "Fashion", price: 16148, tags: ["top", "women", "summer"] },
  { url: "https://www.daraz.lk/i214401105-s1330528174.html", name: "Women's Fluffy Comfort Slippers", brand: "ASIFN", category: "Fashion", price: 5987, tags: ["slippers", "women", "shoes"] },
  { url: "https://www.daraz.lk/i214530953-s1333300027.html", name: "Cuban Chain Anklet for Women 13/14mm", brand: "Generic", category: "Fashion", price: 3716, tags: ["anklet", "jewelry", "women"] },
  { url: "https://www.daraz.lk/i214819887-s1341013933.html", name: "Lotus Pearl Brooch for Women", brand: "Generic", category: "Fashion", price: 3043, tags: ["brooch", "pearl", "women"] },

  // ------------------- Home & Kitchen (6)
  { url: "https://www.daraz.lk/i171904072-s1124759373.html", name: "Amilex Stainless Steel Idly Pan", brand: "Amilex", category: "Home & Kitchen", price: 7268, tags: ["cookware", "pan", "stainless-steel"] },
  { url: "https://www.daraz.lk/i171185339-s1122365906.html", name: "2 Layer Kitchen Dish Rack", brand: "Generic", category: "Home & Kitchen", price: 6929, tags: ["dish-rack", "kitchen", "storage"] },
  { url: "https://www.daraz.lk/i165370822-s1245082371.html", name: "Nippon Plastic Chair", brand: "Nippon Plastics", category: "Home & Kitchen", price: 4000, tags: ["chair", "plastic", "furniture"] },
  { url: "https://www.daraz.lk/i215348244-s1352508919.html", name: "3-in-1 Ultrasonic Humidifier & Air Purifier", brand: "Generic", category: "Home & Kitchen", price: 5784, tags: ["humidifier", "home", "air-purifier"] },
  { url: "https://www.daraz.lk/i193997826-s1223998360.html", name: "Wall Mounted 6 Grid Food Storage Dispenser", brand: "Generic", category: "Home & Kitchen", price: 5965, tags: ["food-storage", "kitchen", "container"] },
  { url: "https://www.daraz.lk/i230627798-s1422988788.html", name: "Multifunction Kitchen Drainer Basket & Storage Box", brand: "Generic", category: "Home & Kitchen", price: 26652, tags: ["storage", "kitchen", "rack"] },

  // ------------------- Beauty (4)
  { url: "https://www.daraz.lk/i229530961-s1413346764.html", name: "Press On Nails - Flower Glitter Design Reusable", brand: "Generic", category: "Beauty", price: 2616, tags: ["nails", "press-on", "beauty"] },
  { url: "https://www.daraz.lk/i214710692-s1335227662.html", name: "24 Pcs Y2K Gradient Full Cover Press On Nails", brand: "Generic", category: "Beauty", price: 2371, tags: ["nails", "press-on", "y2k"] },
  { url: "https://www.daraz.lk/i229970235-s1417660107.html", name: "100 Pcs Nail Vacuum Cleaner Filter for Salon", brand: "Generic", category: "Beauty", price: 2616, tags: ["nail-tool", "salon", "accessory"] },
  { url: "https://www.daraz.lk/i194271680-s1225112610.html", name: "Caratone Collagen Body Lotion 215ml", brand: "Caratone", category: "Beauty", price: 2290, tags: ["lotion", "body", "skincare"] },

  // ------------------- Batch 2: 15 more (added 2026-10-27)
  { url: "https://www.daraz.lk/i228812423-s1411822035.html", name: "Vintage Bronze Heart Key Pendant Jewelry", brand: "Generic", category: "Fashion", price: 3392, tags: ["jewelry", "pendant", "women"] },
  { url: "https://www.daraz.lk/i229288585-s1412688456.html", name: "Women's Sun Protection Batwing Sleeve Coat", brand: "Generic", category: "Fashion", price: 8070, tags: ["sun-protection", "women", "coat"] },
  { url: "https://www.daraz.lk/i229572080-s1413687163.html", name: "FNGEEN Stainless Steel Couple Wrist Watch", brand: "FNGEEN", category: "Fashion", price: 3953, tags: ["watch", "stainless-steel", "couple"] },
  { url: "https://www.daraz.lk/i177876850-s1139121925.html", name: "Trendy Men's Flip Flop Slippers", brand: "Generic", category: "Fashion", price: 2490, tags: ["slippers", "men", "shoes"] },
  { url: "https://www.daraz.lk/i214271202-s1329470661.html", name: "UV Protection Ice Silk Arm Sleeves", brand: "Generic", category: "Fashion", price: 3979, tags: ["uv-protection", "sleeves", "outdoor"] },
  { url: "https://www.daraz.lk/i163762375-s1107832152.html", name: "Silicone Phone Case for iPhone 13 Pro", brand: "Generic", category: "Electronics", price: 2250, tags: ["phone-case", "iphone", "accessory"] },
  { url: "https://www.daraz.lk/i163744516-s1107797933.html", name: "Tempered Glass Screen Protector for Samsung A12", brand: "Generic", category: "Electronics", price: 877, tags: ["screen-protector", "samsung", "accessory"] },
  { url: "https://www.daraz.lk/i172247480-s1125914006.html", name: "Matte Tempered Glass for iPhone X", brand: "Generic", category: "Electronics", price: 1440, tags: ["screen-protector", "iphone", "accessory"] },
  { url: "https://www.daraz.lk/i193531283-s1214940529.html", name: "Laptop Keyboard Dustproof Protective Film", brand: "NPK", category: "Electronics", price: 3690, tags: ["keyboard", "laptop", "protector"] },
  { url: "https://www.daraz.lk/i214214767-s1328857173.html", name: "Privacy Glass Screen Protector for iPad Pro", brand: "Generic", category: "Electronics", price: 3901, tags: ["screen-protector", "ipad", "accessory"] },
  { url: "https://www.daraz.lk/i154416402-s1083195755.html", name: "Transparent Sewing Machine Presser Foot", brand: "Generic", category: "Home & Kitchen", price: 9090, tags: ["sewing", "presser-foot", "machine"] },
  { url: "https://www.daraz.lk/i156432643-s1089447866.html", name: "60M Double-Sided Fusible Hemming Tape", brand: "Generic", category: "Home & Kitchen", price: 1275, tags: ["sewing", "hemming-tape", "fabric"] },
  { url: "https://www.daraz.lk/i168444348-s1117615073.html", name: "Gift Chocolate Hamper Box", brand: "Generic", category: "Home & Kitchen", price: 7000, tags: ["gift", "chocolate", "hamper"] },
  { url: "https://www.daraz.lk/i194862730-s1228637760.html", name: "DIY Silicone Candle Making Mold Set", brand: "Generic", category: "Home & Kitchen", price: 3313, tags: ["candle-mold", "craft", "silicone"] },
  { url: "https://www.daraz.lk/i232131378-s1432400538.html", name: "Washable Double Hole Toe Corrector", brand: "Generic", category: "Beauty", price: 3133, tags: ["foot-care", "toe-corrector", "personal-care"] },
];

function extractMeta(html, property) {
  const m = html.match(new RegExp(`<meta\\s+property="${property}"\\s+content="([^"]*)"`, "i"));
  if (m) return m[1];
  const m2 = html.match(new RegExp(`<meta\\s+content="([^"]*)"\\s+property="${property}"`, "i"));
  return m2 ? m2[1] : null;
}

function cleanImageUrl(url) {
  if (!url) return null;
  const a = url.match(/static-01\.daraz\.lk\/p\/([a-fA-F0-9]+\.[a-z]+)/);
  if (a) return `https://static-01.daraz.lk/p/${a[1]}`;
  const b = url.match(/img\.drz\.lazcdn\.com\/static\/lk\/p\/([a-fA-F0-9]+)\./);
  if (b) return `https://static-01.daraz.lk/p/${b[1]}.jpg`;
  return url.split("?")[0];
}

async function fetchProductData(item) {
  const res = await fetch(item.url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36", "Accept": "text/html" },
  });
  if (res.status !== 200) throw new Error(`HTTP ${res.status} for ${item.url}`);
  const html = await res.text();

  const title = extractMeta(html, "og:title") || extractMeta(html, "twitter:title") || (html.match(/<title>([^<]+)/) || [])[1] || "Daraz Product";
  const description = extractMeta(html, "og:description") || extractMeta(html, "twitter:description") || "Genuine product listed on Daraz.lk. Fast delivery across Sri Lanka.";
  const ogImage = cleanImageUrl(extractMeta(html, "og:image") || extractMeta(html, "twitter:image"));

  const gallery = [...new Set([...html.matchAll(/https:\/\/static-01\.daraz\.lk\/p\/[a-fA-F0-9]+\.[a-z]+/g)].map((m) => m[0]))];
  const images = [ogImage, ...gallery.filter((u) => u !== ogImage)].slice(0, 5).filter(Boolean);

  const name = title.replace(/\|.*$/, "").trim().slice(0, 120);
  return { name, description, images };
}

async function run() {
  await connectDB();
  console.log("Connected to MongoDB\n");

  // ---------- 1. Delete all existing products + their variants ----------
  console.log("STEP 1: deleting existing products...");
  const oldProducts = await Product.find().lean();
  const oldIds = new Set(oldProducts.map((p) => String(p._id)));
  const idArr = [...oldIds];
  const oldVariants = await Variant.find({ parentProduct: { $in: idArr } }).lean();

  await Variant.deleteMany({ parentProduct: { $in: idArr } });
  await Product.deleteMany({});

  const imgCleanup = await deleteProductImages({ products: oldProducts, variants: oldVariants });
  console.log(
    `  Deleted ${oldProducts.length} products, ${oldVariants.length} variants. ` +
      `Supabase images cleaned: ${imgCleanup.deleted} (failed: ${imgCleanup.failed.length}).`
  );

  // ---------- 2. Seed new real products ----------
  let created = 0;
  let failed = 0;
  for (let i = 0; i < products.length; i++) {
    const item = products[i];
    try {
      const data = await fetchProductData(item);
      const product = await Product.create({
        name: data.name || item.name,
        description: data.description,
        price: item.price,
        originalPrice: Math.round(item.price * 1.25),
        category: item.category,
        brand: item.brand,
        images: data.images,
        stock: 20 + Math.floor(Math.random() * 60),
        status: "active",
        approvedByAdmin: true,
        tags: item.tags,
        rating: 0,
        numReviews: 0,
      });
      console.log(`  [${i + 1}/${products.length}] "${product.name}" - LKR ${product.price}`);
      created++;
    } catch (err) {
      failed++;
      console.error(`  [${i + 1}/${products.length}] FAILED ${item.url}: ${err.message}`);
    }
  }

  const total = await Product.countDocuments();
  console.log(`\nDone. Created: ${created}, Failed: ${failed}. Total products in DB: ${total}`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
