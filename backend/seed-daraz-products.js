import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import Product from "./models/Product.js";

dotenv.config();

const productUrls = [
  { url: "https://www.daraz.lk/products/apihappi-printed-bean-bag-i108064301.html", category: "Home & Kitchen", price: 22000, brand: "Apihappi" },
  { url: "https://www.daraz.lk/products/orange-pi-13mp-camera-ov13855-1300-million-pixels-focal-length-300mm-suitable-for-orange-pi-5-5b-5-plus-board-i198573341-s1263966464.html", category: "Electronics", price: 8500, brand: "Orange Pi" },
  { url: "https://www.daraz.lk/products/fs-two-million-pixels-ov2640-camera-wide-angle-160-degree-24-pin-csi-interface-esp32-camera-module-i122437249.html", category: "Electronics", price: 4500, brand: "FS" },
  { url: "https://www.daraz.lk/products/anrushide-estardyn-newest-esp32-cam-camera-module-esp32-wrover-board-with-hot-selling-camera-wi-fi-bluetooth-for-arduino-ide-c-python-code-ov2640-i422465653.html", category: "Electronics", price: 6500, brand: "Anrushide" },
  { url: "https://www.daraz.lk/products/i12-airpods-original-tws-true-wireless-bluetooth-earbuds-for-android-ios-samsung-huawei-redmi-touch-control-perfect-for-girls-complete-with-box-airpods-pro-airpods-pro-original-airpods-pro-2nd-gen-airpods-for-samsung-i12-tws-airpods-i247718065-s1510113046.html", category: "Electronics", price: 3500, brand: "TWS" },
  { url: "https://www.daraz.lk/products/i12-tws-wireless-bluetooth-headset-50-touch-control-earbuds-for-android-and-i-os-phones-i135564379.html", category: "Electronics", price: 2800, brand: "TWS" },
  { url: "https://www.daraz.lk/products/omnidirectional-microphone-module-i2s-interface-inmp441-mems-high-precision-low-ultra-small-volume-for-esp32-i193553826.html", category: "Electronics", price: 1800, brand: "INMP441" },
  { url: "https://www.daraz.lk/products/2pcs-tea2025-stereo-audio-amplifier-ic-i162805429.html", category: "Electronics", price: 600, brand: "TEA" },
  { url: "https://www.daraz.lk/products/smart-watch-i8-pro-max-smartwatch-i8-pro-max-series-8-smart-watch-175-inches-25d-curved-full-touch-screen-smartwatch-bluetooth-call-blood-pressure-watches-with-nfc-function-magnetic-wireless-charging-i239382927.html", category: "Electronics", price: 12000, brand: "i8 Pro Max" },
  { url: "https://www.daraz.lk/products/i8-pro-max-series-8-smart-watch-175-inches-25d-curved-full-touch-screen-smartwatch-bluetooth-i178270530.html", category: "Electronics", price: 9900, brand: "i8 Pro Max" },
  { url: "https://www.daraz.lk/products/new-i9-ultra-2-smart-watch-9-lingdong-island-i9-ultra-smart-watch-headset-two-in-one-i275766871.html", category: "Electronics", price: 15000, brand: "i9 Ultra" },
  { url: "https://www.daraz.lk/products/cool-backlit-i8-mini-wireless-keyboard-24ghz-air-mouse-touchpad-handheld-for-android-tv-box-mini-pc-i190975500.html", category: "Electronics", price: 5500, brand: "i8 Mini" },
  { url: "https://www.daraz.lk/products/tommy-hilfiger-t-shirt-white-soft-cotton-t-shirt-tommy-printed-logo-on-chest-casual-tee-for-all-fashion-essential-white-cotton-t-shirt-tommy-club-collection-i193992999.html", category: "Fashion", price: 4500, brand: "Tommy Hilfiger" },
  { url: "https://www.daraz.lk/products/printed-t-shirt-floral-print-loose-fit-tee-shirt-for-women-springsummer-fashion-top-with-double-layer-sleeves-high-waist-design-casual-stylish-style-women-t-shirt-i205564152.html", category: "Fashion", price: 2200, brand: "Bodhi" },
  { url: "https://www.daraz.lk/products/etj-2025-spring-new-1975-series-denim-midi-dress-with-lapel-side-zipper-fashion-wrinkle-waist-slim-elegant-dress-i378066858.html", category: "Fashion", price: 5500, brand: "ETJ" },
  { url: "https://www.daraz.lk/products/yfashion-women-tank-tops-sexy-v-neck-short-sleeves-solid-color-lace-loose-summer-tops-casual-blouse-t-shirts-i191552659.html", category: "Fashion", price: 1800, brand: "Yfashion" },
  { url: "https://www.daraz.lk/products/zanzea-casual-loose-tank-dress-women-korean-fashion-color-block-sleeveless-knee-length-vestidos-holiday-daily-a-line-short-robes-i514390647.html", category: "Fashion", price: 3500, brand: "ZANZEA" },
  { url: "https://www.daraz.lk/products/zanzea-summer-fashion-womens-dress-sexy-solid-color-knee-length-bodycon-sundress-elegant-34-sleeve-v-neck-work-ol-vestidos-2025-i242156331.html", category: "Fashion", price: 4200, brand: "ZANZEA" },
  { url: "https://www.daraz.lk/products/miga-plazachanghh-women-midi-dress-v-neck-polka-dot-high-waist-irregular-short-ruffle-sleeves-summer-dress-i225562785.html", category: "Fashion", price: 3800, brand: "MIGA" },
  { url: "https://www.daraz.lk/products/vorix-2025-new-rayon-fashion-oversize-african-women-clothing-dubai-dashiki-abaya-free-size-print-design-with-scarf-loose-long-dress-i558916075-s2611203227.html", category: "Fashion", price: 4800, brand: "Vorix" },
  { url: "https://www.daraz.lk/products/yfashion-women-cotton-casual-cotton-linen-dress-with-pocket-short-sleeves-round-neck-pullover-midi-skirt-simple-solid-color-loose-dress-i190595537.html", category: "Fashion", price: 3200, brand: "Yfashion" },
  { url: "https://www.daraz.lk/products/xia-shiwen-polarized-touching-yuji-shirt-temperament-long-sleeve-white-shirt-womens-spring-loose-drooping-gentle-top-6-month-26-finished-daily-delivery-i227011080.html", category: "Fashion", price: 2800, brand: "Xia Shiwen" },
];

const descriptions = {
  "Home & Kitchen": [
    "Premium quality product for your home. Durable materials and elegant design make this a perfect addition to any living space.",
    "Stylish and functional home essential. Crafted with care for long-lasting use and everyday comfort.",
  ],
  "Electronics": [
    "High-performance electronic device with cutting-edge technology. Features include reliable performance and user-friendly design.",
    "Advanced gadget designed for modern needs. Built with high-quality components for optimal functionality and durability.",
  ],
  "Fashion": [
    "Trendy and comfortable apparel for everyday wear. Made from high-quality fabric with attention to detail in every stitch.",
    "Stylish clothing piece that combines fashion with comfort. Perfect for casual outings and special occasions alike.",
  ],
};

function extractMeta(html, property) {
  const regex = new RegExp(`<meta\\s+property="${property}"\\s+content="([^"]*)"`, "i");
  const match = html.match(regex);
  if (match) return match[1];
  const regex2 = new RegExp(`<meta\\s+content="([^"]*)"\\s+property="${property}"`, "i");
  const match2 = html.match(regex2);
  return match2 ? match2[1] : null;
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
  if (!name) return "Product";
  const cleaned = name
    .replace(/\| Daraz\.lk$/, "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .trim();
  if (cleaned.length > 100) return cleaned.substring(0, 97) + "...";
  return cleaned;
}

async function fetchProductData(item) {
  try {
    const response = await fetch(item.url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    const html = await response.text();

    const title = extractMeta(html, "og:title") || extractMeta(html, "twitter:title");
    const description = extractMeta(html, "og:description") || extractMeta(html, "twitter:description");
    const image = cleanImageUrl(extractMeta(html, "og:image"));

    return {
      name: shortenName(title || "Daraz Product"),
      description: description || descriptions[item.category]?.[0] || "Quality product from Daraz.lk",
      image: image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
    };
  } catch (err) {
    console.error(`  Failed to fetch ${item.url.slice(0, 60)}...`, err.message);
    return {
      name: "Daraz Product",
      description: descriptions[item.category]?.[0] || "Quality product from Daraz.lk",
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
    };
  }
}

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB\n");

    const tags = {
      "Home & Kitchen": ["home", "furniture", "kitchen", "lifestyle"],
      "Electronics": ["electronics", "gadgets", "tech", "accessories"],
      "Fashion": ["fashion", "clothing", "apparel", "style"],
    };

    let created = 0;
    let skipped = 0;

    for (let i = 0; i < productUrls.length; i++) {
      const item = productUrls[i];
      console.log(`[${i + 1}/${productUrls.length}] Fetching product data...`);

      const data = await fetchProductData(item);

      const existing = await Product.findOne({ name: data.name });
      if (existing) {
        console.log(`  Skipping "${data.name}" — already exists`);
        skipped++;
        continue;
      }

      const product = await Product.create({
        name: data.name,
        description: data.description,
        price: item.price,
        originalPrice: Math.round(item.price * 1.25),
        category: item.category,
        brand: item.brand,
        images: [data.image],
        stock: Math.floor(Math.random() * 80) + 10,
        status: "active",
        tags: tags[item.category] || ["general"],
        rating: 0,
        numReviews: 0,
      });
      console.log(`  Created: "${product.name}" — LKR ${product.price}`);
      created++;
    }

    console.log(`\nDone! Created ${created} products, skipped ${skipped}.`);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
