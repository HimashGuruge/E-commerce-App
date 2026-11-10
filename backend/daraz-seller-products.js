import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGO_URI;
const API = process.env.BACKEND_URL || "http://localhost:4000";

if (!uri) {
  console.error("❌ MONGO_URI is not set. Add it to backend/.env and re-run.");
  process.exit(1);
}

// Real Daraz product pages to scrape (name + description + real image)
const productUrls = [
  { url: "https://www.daraz.lk/products/i12-airpods-original-tws-true-wireless-bluetooth-earbuds-for-android-ios-samsung-huawei-redmi-touch-control-perfect-for-girls-complete-with-box-airpods-pro-airpods-pro-original-airpods-pro-2nd-gen-airpods-for-samsung-i12-tws-airpods-i247718065-s1510113046.html", category: "Electronics", price: 3500, brand: "TWS" },
  { url: "https://www.daraz.lk/products/smart-watch-i8-pro-max-smartwatch-i8-pro-max-series-8-smart-watch-175-inches-25d-curved-full-touch-screen-smartwatch-bluetooth-call-blood-pressure-watches-with-nfc-function-magnetic-wireless-charging-i239382927.html", category: "Electronics", price: 12000, brand: "i8 Pro Max" },
  { url: "https://www.daraz.lk/products/tommy-hilfiger-t-shirt-white-soft-cotton-t-shirt-tommy-printed-logo-on-chest-casual-tee-for-all-fashion-essential-white-cotton-t-shirt-tommy-club-collection-i193992999.html", category: "Fashion", price: 4500, brand: "Tommy Hilfiger" },
  { url: "https://www.daraz.lk/products/printed-t-shirt-floral-print-loose-fit-tee-shirt-for-women-springsummer-fashion-top-with-double-layer-sleeves-high-waist-design-casual-stylish-style-women-t-shirt-i205564152.html", category: "Fashion", price: 2200, brand: "Bodhi" },
  { url: "https://www.daraz.lk/products/etj-2025-spring-new-1975-series-denim-midi-dress-with-lapel-side-zipper-fashion-wrinkle-waist-slim-elegant-dress-i378066858.html", category: "Fashion", price: 5500, brand: "ETJ" },
  { url: "https://www.daraz.lk/products/yfashion-women-tank-tops-sexy-v-neck-short-sleeves-solid-color-lace-loose-summer-tops-casual-blouse-t-shirts-i191552659.html", category: "Fashion", price: 1800, brand: "Yfashion" },
  { url: "https://www.daraz.lk/products/zanzea-casual-loose-tank-dress-women-korean-fashion-color-block-sleeveless-knee-length-vestidos-holiday-daily-a-line-short-robes-i514390647.html", category: "Fashion", price: 3500, brand: "ZANZEA" },
  { url: "https://www.daraz.lk/products/zanzea-summer-fashion-womens-dress-sexy-solid-color-knee-length-bodycon-sundress-elegant-34-sleeve-v-neck-work-ol-vestidos-2025-i242156331.html", category: "Fashion", price: 4200, brand: "ZANZEA" },
  { url: "https://www.daraz.lk/products/apihappi-printed-bean-bag-i108064301.html", category: "Home & Kitchen", price: 22000, brand: "Apihappi" },
  { url: "https://www.daraz.lk/products/cool-backlit-i8-mini-wireless-keyboard-24ghz-air-mouse-touchpad-handheld-for-android-tv-box-mini-pc-i190975500.html", category: "Electronics", price: 5500, brand: "i8 Mini" },
  { url: "https://www.daraz.lk/products/new-i9-ultra-2-smart-watch-9-lingdong-island-i9-ultra-smart-watch-headset-two-in-one-i275766871.html", category: "Electronics", price: 15000, brand: "i9 Ultra" },
  { url: "https://www.daraz.lk/products/yfashion-women-cotton-casual-cotton-linen-dress-with-pocket-short-sleeves-round-neck-pullover-midi-skirt-simple-solid-color-loose-dress-i190595537.html", category: "Fashion", price: 3200, brand: "Yfashion" },
];

const fallbackByCategory = {
  Electronics: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
  Fashion: "https://images.unsplash.com/photo-1483985429749-bed39a858b64?w=500",
  "Home & Kitchen": "https://images.unsplash.com/photo-1584621650767-84c9d94c3cf1?w=500",
};

function extractMeta(html, property) {
  const regex = new RegExp(`<meta\\s+property="${property}"\\s+content="([^"]*)"`, "i");
  const m = html.match(regex);
  if (m) return m[1];
  const regex2 = new RegExp(`<meta\\s+content="([^"]*)"\\s+property="${property}"`, "i");
  const m2 = html.match(regex2);
  return m2 ? m2[1] : null;
}

function cleanImageUrl(url) {
  if (!url) return null;
  const staticMatch = url.match(/static-01\.daraz\.lk\/p\/([^"']+)/);
  if (staticMatch) return `https://static-01.daraz.lk/p/${staticMatch[1].split("?")[0]}`;
  const drzMatch = url.match(/img\.drz\.lazcdn\.com\/[^"']+\/([^"']+)/);
  if (drzMatch) return `https://static-01.daraz.lk/p/${drzMatch[1].split("_")[0]}`;
  return url;
}

function shortenName(name) {
  if (!name) return "Daraz Product";
  const cleaned = name
    .replace(/\| Daraz\.lk$/, "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .trim();
  return cleaned.length > 100 ? cleaned.substring(0, 97) + "..." : cleaned;
}

async function fetchProductData(item) {
  const res = await fetch(item.url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } });
  const html = await res.text();
  const title = extractMeta(html, "og:title");
  const description = extractMeta(html, "og:description");
  const image = cleanImageUrl(extractMeta(html, "og:image"));
  return {
    name: shortenName(title),
    description: description || "Quality product from Daraz.lk",
    image: image || fallbackByCategory[item.category] || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
  };
}

async function run() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;

  // 1. Delete the current (fake-image) products
  const delP = await db.collection("products").deleteMany({});
  await db.collection("variants").deleteMany({});
  console.log(`✅ Deleted ${delP.deletedCount} old products`);

  // 2. Login as the seller
  const loginRes = await fetch(`${API}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "seller@demo.com", password: "Seller@123" }),
  });
  const login = await loginRes.json();
  if (!login.token) {
    console.error("❌ Seller login failed:", JSON.stringify(login));
    process.exit(1);
  }
  console.log("✅ Logged in as seller\n");

  // 3. Fetch real Daraz data + add each as the seller via the API
  let added = 0, failed = 0;
  for (let i = 0; i < productUrls.length; i++) {
    const item = productUrls[i];
    try {
      const data = await fetchProductData(item);
      const res = await fetch(`${API}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${login.token}` },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          price: item.price,
          originalPrice: Math.round(item.price * 1.25),
          category: item.category,
          brand: item.brand,
          images: [data.image],
          stock: 10 + Math.floor(Math.random() * 80),
          status: "active",
          tags: ["daraz"],
        }),
      });
      const out = await res.json();
      if (out.success) {
        console.log(`✅ [${i + 1}/${productUrls.length}] "${data.name}" — LKR ${item.price}`);
        added++;
      } else {
        console.error(`❌ [${i + 1}] ${out.error}`);
        failed++;
      }
    } catch (e) {
      console.error(`❌ [${i + 1}] fetch failed: ${e.message}`);
      failed++;
    }
  }

  // 4. Approve everything so it shows on the storefront
  const approval = await db.collection("products").updateMany({ approvedByAdmin: false }, { $set: { approvedByAdmin: true } });
  console.log(`\n✅ Approved ${approval.modifiedCount} products`);

  const count = await db.collection("products").countDocuments({});
  console.log(`📦 Final product count: ${count} (added ${added}, failed ${failed})`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
