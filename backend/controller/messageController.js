import asyncHandler from "express-async-handler";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import logger from "../utils/logger.js";
import Order from "../models/Order.js";
import { simConfig } from "../config/env.js";

// Helper: fetch products relevant to the user's message (keyword-aware)
async function fetchRelevantProducts(message, limit = 6) {
  const commonWords = new Set([
    "the","a","an","is","are","was","were","this","that","for","and","not","but","or","yet","so",
    "with","can","you","your","i","my","me","we","our","they","their","do","did","has","have",
    "had","get","got","what","which","who","how","why","when","where","please","help","want",
    "need","tell","show","give","find","looking","some","about","from","will","would","could",
    "should","may","might","shall","all","any","each","every","both","no","nor","only","very",
    "just","also","too","much","more","many","such","than","then","now","here","there","am",
    "are","be","been","being","does","doing","done","say","says","said","make","made","take",
    "took","know","like","see","think","come","came","going","go","went","buy","bought","sell",
    "sold","use","used","new","one","two","three","first","last","high","low","big","small",
    "good","bad","best","better","great","nice","fine","ok","okay","hi","hello","hey","thanks",
    "thank","welcome","yes","no","sure","okay","please","sorry",
  ]);
  const words = (message || "")
    .toLowerCase()
    .split(/[\s,;:.!?]+/)
    .filter((w) => w.length > 2 && !commonWords.has(w));

  if (words.length > 0) {
    const conditions = words.flatMap((w) => [
      { name: { $regex: w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
      { category: { $regex: w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
    ]);

    const matched = await Product.find({
      $or: conditions,
      status: { $in: ["active", "ready"] },
    })
      .limit(limit)
      .select("name price images category")
      .lean();

    if (matched.length > 0) return matched;
  }

  return Product.find({ status: { $in: ["active", "ready"] } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("name price images category")
    .lean();
}

// --- POST /api/messages/sendmessage ---
export const sendUserMessage = asyncHandler(async (req, res) => {
  // Extract body with proper destructuring to handle nested/conflicting field names
  const requestBody = req.body || {};
  const messageText = (requestBody.message || "").trim();
  const isVoice = requestBody.isVoice || false;
  const language = requestBody.language || "en-US";
  const imageUrl = requestBody.imageUrl || null;
  const cart = requestBody.cart || [];
  const wishlist = requestBody.wishlist || [];
  const userId = req.user?._id;
  
  // Allow image-only messages (no text) — use placeholder text
  const displayMessage = messageText || (imageUrl ? "Sent an image" : "");

  // Detect Singlish (Sinhala written in Latin script) via common function words
  const SINHALA_SINGLISH_WORDS = new Set([
    "mage","obe","ape","oya","meka","eka","monawa","monawada","koheda","kohomada","kohomai",
    "denna","ganna","karanna","innawa","yanna","enna","balanna","hitiya","hambuna",
    "dannawa","damanna","danna","aranna","thiyenawa","puluwan","poddak","wage","methana","ethana",
    "hoda","podi","loku","ayeth","goda","hari","hambawena","wenna",
    "thama","nehe","nadda","daw","yam","inna","denawa",
    "ehem","ithin","bohoma","hondata","obata","apita","oyata","ekata","mekata",
    "harida","ane","mokadda","kawda","kotana","isa",
  ]);
  
  // Use displayMessage for singlish detection and effective language determination
  const hasSinglish = displayMessage && language === "en-US"
    && (
      (displayMessage.length >= 8 && [...SINHALA_SINGLISH_WORDS].some(w => new RegExp(`\\b${w}\\b`, 'i').test(displayMessage)))
      ||
      (displayMessage.length >= 12 && [...SINHALA_SINGLISH_WORDS].filter(w => new RegExp(`\\b${w}\\b`, 'i').test(displayMessage)).length >= 2)
    );
  const effectiveLang = hasSinglish ? "si-LK" : (language || "en-US");

  // 1. Save user message
  const userMsg = await Message.create({
    sender: userId,
    message: displayMessage,
    imageUrl: imageUrl || null,
    language: language || "en-US",
    isVoice: !!isVoice,
    senderType: "user",
    isAdmin: false,
    adminRead: false,
  });

  // 2. Auto-reply when @admin is mentioned or image is attached
  const isEscalation = displayMessage.toLowerCase().includes("@admin");
  const hasImage = !!imageUrl;

  if (isEscalation || hasImage) {
    const replyText = language === "si-LK"
      ? "👋 ඔබට මෙම සහාය ලබා ගත හැක:\n\n🛍 නිෂ්පාදන සෙවීම හෝ නිර්දේශ\n📦 ඇණවුම් තත්ත්වය පරීක්ෂා කිරීම\n❓ ප්‍රශ්න ඇසීම\n\nඔබගේ පණිවිඩය පරිපාලකට යොමු කර ඇත. ඔබට ඉක්මනින් පිළිතුරු ලැබෙනු ඇත."
      : "👋 I can help you with:\n\n🛍 Finding products or recommendations\n📦 Checking order status\n❓ Answering questions about your orders\n\nYour message has been forwarded to the admin. You will get a reply shortly.";

    let adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      const adminUsers = await User.find().limit(1);
      adminUser = adminUsers[0];
    }

    const systemReply = await Message.create({
      sender: adminUser?._id || userId,
      message: replyText,
      language: language || "en-US",
      senderType: "bot",
      isAdmin: true,
      adminRead: true,
      userRead: false,
    });

    return res.status(201).json({
      success: true,
      messages: [userMsg, systemReply],
      audio: null,
    });
  }

  // 2b. Show help guide when user types @help
  const isHelp = displayMessage.toLowerCase().includes("@help");
  if (isHelp) {
    const helpText = language === "si-LK"
      ? "🔹 පරිපාලක සම්බන්ධ කර ගැනීමට @admin ටයිප් කර ඔබගේ පණිවිඩය ලියන්න.\n\nඋදා: @admin මගේ ඇණවුම තවම ලැබී නැත"
      : "🔹 To contact admin support, type @admin followed by your message.\n\nExample: @admin I haven't received my order yet";

    let adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      const adminUsers = await User.find().limit(1);
      adminUser = adminUsers[0];
    }

    const helpReply = await Message.create({
      sender: adminUser?._id || userId,
      message: helpText,
      language: language || "en-US",
      senderType: "bot",
      isAdmin: true,
      adminRead: true,
      userRead: false,
    });

    return res.status(201).json({
      success: true,
      messages: [userMsg, helpReply],
      audio: null,
    });
  }

  // 3. Fetch user context for AI
  let user = null;
  let products = [];
  let recentOrders = [];
  try {
    [user, products, recentOrders] = await Promise.all([
      User.findById(userId).select("name email phone"),
      fetchRelevantProducts(displayMessage),
      Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(3)
        .select("orderStatus totalPrice items createdAt")
        .lean(),
    ]);
  } catch (err) {
    logger.error("Data fetch error:", err);
  }

  const userName = user?.name || "there";
  const userEmail = user?.email || "";
  const userPhone = user?.phone || "";
  let aiMessageText = "";

  // 4. Call SIM.ai
  try {
    const langInstruction = effectiveLang === "si-LK"
      ? "IMPORTANT: You MUST reply in Sinhala language using Sinhala Unicode characters (සිංහල අකුරෙන්). Do NOT reply in English or Singlish.\n"
      : "IMPORTANT: You MUST reply in English language only.\n";

    // Build context blocks
    const contextBlocks = [];

    // User profile
    const profileLines = [`Name: ${userName}`];
    if (userEmail) profileLines.push(`Email: ${userEmail}`);
    if (userPhone) profileLines.push(`Phone: ${userPhone}`);
    contextBlocks.push("User profile:\n" + profileLines.map((l) => `- ${l}`).join("\n"));

    // Recent orders
    if (recentOrders.length > 0) {
      const orderLines = recentOrders.map((o) => {
        const date = o.createdAt
          ? new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "";
        const items = (o.items || []).map((i) => `${i.name || "Item"} (x${i.quantity || 1})`).join(", ");
        return `- Order on ${date} | Status: ${o.orderStatus} | Items: ${items} | Total: LKR ${(o.totalPrice || 0).toLocaleString("si-LK")}`;
      });
      contextBlocks.push("Recent orders:\n" + orderLines.join("\n"));
    }

    // Cart (from frontend)
    const cartItems = Array.isArray(cart) ? cart.slice(0, 5) : [];
    if (cartItems.length > 0) {
      contextBlocks.push(
        "Cart items:\n" + cartItems.map((i) => `- ${i.name || "Item"} | Qty: ${i.qty || 1} | LKR ${i.price || 0}`).join("\n"),
      );
    }

    // Wishlist (from frontend)
    const wishlistItems = Array.isArray(wishlist) ? wishlist.slice(0, 5) : [];
    if (wishlistItems.length > 0) {
      contextBlocks.push("Wishlist items:\n" + wishlistItems.map((i) => `- ${i.name || "Item"}`).join("\n"));
    }

    // Available products
    if (products.length > 0) {
      const productLines = products.map((p) => {
        const price = typeof p.price === "number" ? "LKR " + p.price.toLocaleString("si-LK") : "LKR " + (p.price || "N/A");
        return `- ${p.name} | ${price} | Category: ${p.category || "N/A"}`;
      }).join("\n");
      contextBlocks.push("Available products:\n" + productLines);
    }

    // Instructions
    contextBlocks.push([
      "You are ONLY an e-commerce assistant for this online store. You must NOT answer anything outside this role.",
      "Strict rules:",
      "1. ONLY answer questions about products, orders, cart, or wishlist from this store",
      "2. For product questions, recommend ONLY from the available products list above",
      "3. For order inquiries, reference ONLY the user's recent orders above",
      "4. If the user asks anything else (general chat, advice, coding, etc.), politely say you can only help with store-related questions and suggest @admin",
      "5. Be very concise — 1-2 sentences max",
      "6. Never roleplay, never generate code, never answer general knowledge questions",
    ].join("\n"));

    contextBlocks.push("User says:");

    const context = contextBlocks.join("\n\n") + "\n";

    const finalPrompt = context + langInstruction + (messageText || "");

    const requestBody = {
      input: finalPrompt,
      conversationId: userId.toString(),
    };
    console.log("📨 Prompt length:", finalPrompt.length, "chars");
    console.log("🔑 SIM API Key exists:", !!simConfig.apiKey);

    let simRes;
    let simData = null;
    const MAX_RETRIES = 2;
    let lastErrorBody = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        console.log(`🔄 Retrying SIM.ai (attempt ${attempt + 1}/${MAX_RETRIES + 1}, delay 5000ms)...`);
        await new Promise((r) => setTimeout(r, 5000));
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        simRes = await fetch(simConfig.workflowUrl, {
          method: "POST",
          headers: {
            "X-API-Key": simConfig.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (simRes.ok) {
          simData = await simRes.json();
          break;
        }

        // Non-OK response
        const errorBody = await simRes.text().catch(() => "");
        console.error(`❌ SIM.ai attempt ${attempt + 1} failed:`, simRes.status, errorBody.substring(0, 200));

        // Skip retry on 429 (rate limit/quota inside SIM.ai's 500) — won't recover in seconds
        const isRateLimited = errorBody.includes(':429') || errorBody.includes('"429');
        if (isRateLimited) {
          throw new Error("SIM.ai rate limited");
        }

        if (attempt < MAX_RETRIES) {
          lastErrorBody = errorBody;
          continue;
        }

        throw new Error(`SIM.ai failed (status ${simRes.status})`);
      } catch (err) {
        if (err.message === "SIM.ai rate limited") {
          throw err;
        }
        if (err.message?.includes?.("SIM.ai failed") && attempt < MAX_RETRIES) {
          lastErrorBody = null;
          continue;
        }
        throw err;
      }
    }

    if (!simData) {
      throw new Error("AI service temporarily unavailable. Please try again later.");
    }

    console.log("🔍 SIM.ai response:", JSON.stringify(simData, null, 2).substring(0, 500));

    // Extract response from various possible response structures
    let raw;
    if (simData.output?.content) {
      raw = simData.output.content;
    } else if (simData.output) {
      raw = simData.output;
    } else if (simData.result) {
      raw = simData.result;
    } else if (simData.data?.output) {
      raw = simData.data.output;
    } else if (simData.response) {
      raw = simData.response;
    } else {
      console.log("⚠️ Unexpected SIM.ai response structure:", Object.keys(simData));
      raw = "";
    }

    aiMessageText = typeof raw === "string" ? raw.trim() : "";

    // Fallback if empty or invalid
    if (!aiMessageText || aiMessageText === "[object Object]") {
      console.log("⚠️ Empty or invalid AI response, using fallback");
      aiMessageText = effectiveLang === "si-LK"
        ? "සමාවන්න, පිළිතුර ලබා ගත නොහැක."
        : "Sorry, I couldn't generate a response. Please try @admin for help.";
    }
  } catch (err) {
    logger.error("SIM.ai error:", err.message || err);
    console.error("❌ SIM.ai fetch failed:", err);

    // Intelligent fallback: use already-fetched data to generate a useful reply
    const fallbackParts = [];
    fallbackParts.push(effectiveLang === "si-LK"
      ? "AI සේවය තාවකාලිකව ක්‍රියාත්මක නොවේ."
      : "AI assistant is temporarily unavailable."
    );

    if (products.length > 0) {
      if (effectiveLang === "si-LK") {
        const productList = products.slice(0, 3).map((p) => {
          const price = typeof p.price === "number" ? "LKR " + p.price.toLocaleString("si-LK") : "LKR " + (p.price || "N/A");
          return `- ${p.name} (${price})`;
        }).join("\n");
        fallbackParts.push("මෙම නිෂ්පාදන තිබේ:\n" + productList);
      } else {
        const productList = products.slice(0, 3).map((p) => {
          const price = typeof p.price === "number" ? "LKR " + p.price.toLocaleString("si-LK") : "LKR " + (p.price || "N/A");
          return `- ${p.name} (${price})`;
        }).join("\n");
        fallbackParts.push("Here are products I found:\n" + productList);
      }
    }

    if (recentOrders.length > 0) {
      if (effectiveLang === "si-LK") {
        const orderSummary = recentOrders.map((o) => {
          const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
          return `- ${date} | ${o.orderStatus || "Processing"}`;
        }).join("\n");
        fallbackParts.push("ඔබගේ ඇණවුම්:\n" + orderSummary);
      } else {
        const orderSummary = recentOrders.map((o) => {
          const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
          return `- ${date} | ${o.orderStatus || "Processing"}`;
        }).join("\n");
        fallbackParts.push("Your recent orders:\n" + orderSummary);
      }
    }

    fallbackParts.push(effectiveLang === "si-LK"
      ? "වැඩි විස්තර සඳහා @admin ටයිප් කරන්න."
      : "For more details, type @admin."
    );

    aiMessageText = fallbackParts.join("\n\n");
  }

  // 5. Find admin user
  let adminUser = await User.findOne({ role: "admin" });
  if (!adminUser) {
    const adminUsers = await User.find().limit(1);
    adminUser = adminUsers[0];
  }

  // 6. Save AI response
  const aiMsg = await Message.create({
    sender: adminUser?._id || userId,
    message: aiMessageText,
    language: effectiveLang,
    senderType: "bot",
    isAdmin: true,
    isBot: true,
    adminRead: true,
    userRead: false,
  });

  res.status(201).json({
    success: true,
    messages: [userMsg, aiMsg],
    audio: null,
  });
});

// --- GET /api/messages/getmessages ---
export const getUserMessages = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const since = req.query.since;
  const after = req.query.after;

  const query = {
    $or: [{ sender: req.user._id }, { isAdmin: true }],
  };
  if (since) {
    query.createdAt = { $gt: new Date(since) };
  }
  if (after) {
    query._id = { $gt: after };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: 1 })
    .limit(limit);

  const total = await Message.countDocuments({
    $or: [{ sender: req.user._id }, { isAdmin: true }],
  });

  await Message.updateMany(
    { isAdmin: true, userRead: false },
    { $set: { userRead: true } }
  );

  res.json({
    success: true,
    messages,
    hasMore: total > limit,
    total,
  });
});

// --- GET /api/messages/initialize ---
export const initializeChat = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;

  // Mark admin messages as read when user opens chat (filter by isAdmin flag, not sender)
  await Message.updateMany(
    { isAdmin: true, userRead: false },
    { $set: { userRead: true } }
  );

  const messages = await Message.find({
    $or: [{ sender: req.user._id }, { isAdmin: true }],
  })
    .sort({ createdAt: 1 })
    .limit(limit);

  const total = await Message.countDocuments({
    $or: [{ sender: req.user._id }, { isAdmin: true }],
  });

  res.json({
    success: true,
    messages,
    hasMore: total > limit,
  });
});

// --- GET /api/messages/unread-chat-count (USER-facing) ---
export const getUserUnreadCount = asyncHandler(async (req, res) => {
  // Count admin messages the user hasn't read yet
  const count = await Message.countDocuments({
    isAdmin: true,
    userRead: false,
  });
  res.json({ success: true, count });
});

// --- GET /api/messages/admin-unread-count (ADMIN-facing) ---
export const getAdminUnreadCount = asyncHandler(async (req, res) => {
  const count = await Message.countDocuments({
    isAdmin: false,
    adminRead: false,
  });
  res.json({ success: true, count });
});

export const markAdminNotificationsAsRead = asyncHandler(async (req, res) => {
  await Message.updateMany(
    { isAdmin: false, adminRead: false },
    { $set: { adminRead: true } }
  );
  res.json({ success: true });
});

// --- PUT /api/messages/mark-user-read (USER-facing) ---
export const markUserMessagesAsRead = asyncHandler(async (req, res) => {
  await Message.updateMany(
    { isAdmin: true, userRead: false },
    { $set: { userRead: true } }
  );
  res.json({ success: true });
});

export const testGetOrderStatus = asyncHandler(async (req, res) => {
  const Order = (await import("../models/Order.js")).default;
  const orders = await Order.find({ user: req.user._id }).select("orderStatus createdAt");
  res.json({ success: true, orders });
});