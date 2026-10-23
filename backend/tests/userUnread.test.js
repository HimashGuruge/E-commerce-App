import express from "express";
import jwt from "jsonwebtoken";
import {
  connectDb,
  disconnectDb,
  retryTest,
  resetCollections,
  startServer,
  stopServer,
  request,
  makeUser,
  makeOrder,
  JWT_SECRET,
} from "./helpers/setup.js";
import Product from "../models/Product.js";
import Message from "../models/Message.js";
import Seller from "../models/Seller.js";
import sellersRouter from "../routes/sellersRouter.js";
import messageRouter from "../routes/messageRouter.js";
import { jest } from "@jest/globals";

// Same wedge-resilient cap as the other suites.
jest.setTimeout(180_000);

let app;

const tokenFor = (user) => jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);

const makeSeller = async (role = "seller") => {
  const u = await makeUser(role);
  await Seller.create({
    user: u._id,
    shopName: `Shop ${role}`,
    ownerName: `Owner ${role}`,
    ownerPhone: "0771234567",
  });
  return u;
};

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use("/api/sellers", sellersRouter);
  app.use("/api/messages", messageRouter);
  // Mirror the production error middleware so thrown controller errors
  // (with res.status already set) come back as JSON.
  app.use((err, req, res, next) => {
    const status = res.statusCode >= 400 ? res.statusCode : err.status || 500;
    res.status(status).json({ success: false, error: err.message || "Internal Server Error" });
  });
  await startServer(app);
  await connectDb();
});

afterAll(async () => {
  await stopServer(app);
  await disconnectDb();
});

beforeEach(async () => {
  // resetCollections covers User/Product/Order/Notification; these two
  // collections are not reset by the shared helper.
  await resetCollections();
  await Seller.deleteMany({});
  await Message.deleteMany({});
});

// ---------------------------------------------------------------------------
// POST /api/sellers/messages — direct buyer DM requires a purchase relationship
// ---------------------------------------------------------------------------
describe("seller direct message guard (POST /api/sellers/messages)", () => {
  test("buyer with no order for this seller's products -> 403, nothing stored", async () => {
    await retryTest(async () => {
      const seller = await makeSeller();
      const buyer = await makeUser("customer");

      const r = await request(app, "POST", "/api/sellers/messages", {
        token: tokenFor(seller),
        body: { receiverId: String(buyer._id), text: "hello" },
      });
      expect(r.status).toBe(403);
      expect(String(r.body.error)).toMatch(/purchased/);
      expect(await Message.countDocuments({ sender: seller._id, recipient: buyer._id })).toBe(0);
    });
  });

  test("buyer who ordered this seller's product -> allowed, threadKey set", async () => {
    await retryTest(async () => {
      const seller = await makeSeller();
      const buyer = await makeUser("customer");
      const product = await Product.create({
        name: "Gadget",
        price: 10,
        category: "test",
        seller: seller._id,
      });
      await makeOrder(buyer, [product]);

      const r = await request(app, "POST", "/api/sellers/messages", {
        token: tokenFor(seller),
        body: { receiverId: String(buyer._id), text: "where is my order?" },
      });
      expect(r.status).toBe(201);
      expect(r.body.message.threadKey).toBe(`${buyer._id}|${seller._id}`);

      const dbMsg = await Message.findOne({
        threadKey: `${buyer._id}|${seller._id}`,
      });
      expect(dbMsg).not.toBeNull();
      expect(String(dbMsg.sender)).toBe(String(seller._id));
      expect(String(dbMsg.recipient)).toBe(String(buyer._id));
      // Direct-thread DMs are created already read for the buyer
      // (they live in the thread panel, not the AI support badge).
      expect(dbMsg.userRead).toBe(true);
      expect(dbMsg.sellerRead).toBe(true);
    });
  });

  test("buyer who only ordered another seller's product -> 403", async () => {
    await retryTest(async () => {
      const seller = await makeSeller();
      const otherSeller = await makeSeller();
      const buyer = await makeUser("customer");
      const otherProduct = await Product.create({
        name: "Other Gadget",
        price: 10,
        category: "test",
        seller: otherSeller._id,
      });
      await makeOrder(buyer, [otherProduct]);

      const r = await request(app, "POST", "/api/sellers/messages", {
        token: tokenFor(seller),
        body: { receiverId: String(buyer._id), text: "hello" },
      });
      expect(r.status).toBe(403);
      expect(await Message.countDocuments({ sender: seller._id, recipient: buyer._id })).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// GET /api/messages/unread-chat-count — only admin replies drive the badge
// ---------------------------------------------------------------------------
describe("user unread-chat-count semantics", () => {
  test("bot/AI replies and status notes are excluded; admin replay is counted", async () => {
    await retryTest(async () => {
      const user = await makeUser("customer");
      const admin = await makeUser("admin");

      // AI support reply
      await Message.create({
        sender: admin._id,
        recipient: user._id,
        message: "AI reply",
        senderType: "bot",
        isAdmin: true,
        userRead: false,
      });
      // Bot order/status note
      await Message.create({
        sender: admin._id,
        recipient: user._id,
        message: "Order update",
        senderType: "bot",
        isAdmin: true,
        userRead: false,
      });
      // Human admin reply — the only one that should count
      await Message.create({
        sender: admin._id,
        recipient: user._id,
        message: "admin hello",
        senderType: "admin",
        isAdmin: true,
        userRead: false,
      });

      const r = await request(app, "GET", "/api/messages/unread-chat-count", {
        token: tokenFor(user),
      });
      expect(r.status).toBe(200);
      expect(r.body.count).toBe(1);
    });
  });
});

// ---------------------------------------------------------------------------
// GET /api/messages/getmessages — no mark-read side effect
// ---------------------------------------------------------------------------
describe("getmessages has no mark-read side effect", () => {
  test("fetching messages leaves userRead false; initialize still marks read", async () => {
    await retryTest(async () => {
      const user = await makeUser("customer");
      const admin = await makeUser("admin");
      await Message.create({
        sender: admin._id,
        recipient: user._id,
        message: "admin hello",
        senderType: "admin",
        isAdmin: true,
        userRead: false,
      });

      const r = await request(app, "GET", "/api/messages/getmessages", {
        token: tokenFor(user),
      });
      expect(r.status).toBe(200);
      expect(r.body.messages.length).toBe(1);

      const afterFetch = await Message.findOne({ recipient: user._id });
      expect(afterFetch.userRead).toBe(false);

      const rInit = await request(app, "GET", "/api/messages/initialize", {
        token: tokenFor(user),
      });
      expect(rInit.status).toBe(200);
      const afterInit = await Message.findOne({ recipient: user._id });
      expect(afterInit.userRead).toBe(true);
    });
  });
});
