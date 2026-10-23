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
import Notification from "../models/Notification.js";
import Seller from "../models/Seller.js";
import sellersRouter from "../routes/sellersRouter.js";
import orderRouter from "../routes/orderRouter.js";
import notificationRouter from "../routes/notificationRouter.js";
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
  app.use("/api/orders", orderRouter);
  app.use("/api/notifications", notificationRouter);
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
  // resetCollections covers User/Product/Order/Notification; Seller and
  // Message are not reset by the shared helper.
  await resetCollections();
  await Seller.deleteMany({});
  await Message.deleteMany({});
});

// ---------------------------------------------------------------------------
// Order status updates must be delivered as ORDER_STATUS notifications,
// not as chat messages in the buyer's support chat.
// ---------------------------------------------------------------------------
describe("admin order status update -> notification, not chat", () => {
  test("creates an ORDER_STATUS notification for the buyer and no chat message", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const buyer = await makeUser("customer");
      const product = await Product.create({ name: "Gadget", price: 10, category: "test" });
      const order = await makeOrder(buyer, [product], "pending");

      const r = await request(
        app,
        "PUT",
        `/api/orders/admin/update-order-status/${order._id}`,
        { token: tokenFor(admin), body: { status: "processing" } }
      );
      expect(r.status).toBe(200);
      expect(r.body.success).toBe(true);

      const note = await Notification.findOne({ user: buyer._id, type: "ORDER_STATUS" });
      expect(note).not.toBeNull();
      expect(note.title).toBe("Order status updated");
      expect(note.message).toContain("status updated");
      expect(note.message).toContain("pending → processing");
      expect(String(note.order)).toBe(String(order._id));
      expect(note.read).toBe(false);

      // No bot/chat message for the buyer, and nothing references the order in chat
      expect(await Message.countDocuments({ recipient: buyer._id })).toBe(0);
      expect(await Message.countDocuments({ orderRef: order._id })).toBe(0);
    });
  });

  test("buyer sees it in the notification bell (/user + /unread-count)", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const buyer = await makeUser("customer");
      const product = await Product.create({ name: "Gadget", price: 10, category: "test" });
      const order = await makeOrder(buyer, [product], "pending");

      await request(app, "PUT", `/api/orders/admin/update-order-status/${order._id}`, {
        token: tokenFor(admin),
        body: { status: "processing" },
      });

      const list = await request(app, "GET", "/api/notifications/user", {
        token: tokenFor(buyer),
      });
      expect(list.status).toBe(200);
      expect(
        list.body.notifications.some((n) => n.type === "ORDER_STATUS" && n.title === "Order status updated")
      ).toBe(true);

      const cnt = await request(app, "GET", "/api/notifications/unread-count", {
        token: tokenFor(buyer),
      });
      expect(cnt.status).toBe(200);
      expect(cnt.body.count).toBe(1);
    });
  });
});

describe("seller order status update -> notification, not chat", () => {
  test("creates an ORDER_STATUS notification for the buyer and no chat message", async () => {
    await retryTest(async () => {
      const seller = await makeSeller();
      const admin = await makeUser("admin");
      const buyer = await makeUser("customer");
      const product = await Product.create({
        name: "Gadget",
        price: 10,
        category: "test",
        seller: seller._id,
      });
      const order = await makeOrder(buyer, [product], "pending");

      const r = await request(app, "PUT", `/api/sellers/orders/${order._id}/status`, {
        token: tokenFor(seller),
        body: { status: "processing" },
      });
      expect(r.status).toBe(200);

      const note = await Notification.findOne({ user: buyer._id, type: "ORDER_STATUS" });
      expect(note).not.toBeNull();
      expect(note.title).toBe("Order status updated");
      expect(note.message).toContain("status updated");
      expect(note.message).toContain("pending → processing");
      expect(String(note.order)).toBe(String(order._id));
      expect(note.read).toBe(false);

      expect(await Message.countDocuments({ recipient: buyer._id })).toBe(0);
      expect(await Message.countDocuments({ orderRef: order._id })).toBe(0);

      // Admin side unchanged: the seller event still reaches admins as @admin
      expect(await Message.countDocuments({ sender: seller._id, message: { $regex: "@admin" } })).toBe(1);
    });
  });
});
