import {
  connectDb,
  disconnectDb,
  resetCollections,
  startServer,
  stopServer,
  buildApp,
  request,
  makeUser,
  makeProduct,
  makeOrder,
} from "./helpers/setup.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Notification from "../models/Notification.js";
import Feedback from "../models/Feedback.js";
import ReturnRequest from "../models/ReturnRequest.js";
import jwt from "jsonwebtoken";
import { generateReviewReminders } from "../services/reviewReminderService.js";
import { adminUpdateOrderStatus } from "../controller/orderController.js";
import { jest } from "@jest/globals";

// The test-harness mongod can wedge mid-run on some Windows machines; the
// setup helper detects that and respawns a fresh instance (up to 3 per
// reset). Allow room for the recovery path so a single wedge doesn't
// cascade into hook timeouts.
jest.setTimeout(90_000);

beforeAll(async () => {
  await connectDb();
});

afterAll(async () => {
  await disconnectDb();
});

beforeEach(async () => {
  await resetCollections();
});

// ---------------------------------------------------------------------------
// Reminder generation service
// ---------------------------------------------------------------------------
describe("Automatic review reminder generation", () => {
  test("admin marking an order delivered creates a reminder per eligible product", async () => {
    const user = await makeUser();
    const p1 = await makeProduct("A");
    const p2 = await makeProduct("B");
    let order = await makeOrder(user, [p1, p2], "shipped");
    const admin = await makeUser("admin");

    const req = {
      params: { orderId: order._id },
      body: { status: "delivered" },
      user: { _id: admin._id, role: admin.role },
      headers: { authorization: `Bearer ${jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET)}` },
    };
    const res = {};
    await adminUpdateOrderStatus(req, res, () => {});
    order = await Order.findById(order._id);

    const reminders = await Notification.find({ user: user._id, type: "REVIEW_REMINDER" });
    expect(reminders).toHaveLength(2);
    const products = reminders.map((n) => String(n.product)).sort();
    expect(products).toEqual([String(p1._id), String(p2._id)].sort());
    reminders.forEach((n) => {
      expect(String(n.order)).toBe(String(order._id));
      expect(n.read).toBe(false);
      expect(n.reviewSubmitted).toBe(false);
      expect(n.title).toBeTruthy();
      expect(n.message).toBeTruthy();
    });
    expect(order.orderStatus).toBe("delivered");
  });

  test("an undelivered (shipped) order creates no reminders", async () => {
    const user = await makeUser();
    const p = await makeProduct("A");
    const order = await makeOrder(user, [p], "shipped");
    const created = await generateReviewReminders(order);
    expect(created).toHaveLength(0);
    expect(await Notification.countDocuments({})).toBe(0);
  });

  test("reprocessing the same delivery does not duplicate reminders", async () => {
    const user = await makeUser();
    const p = await makeProduct("A");
    const order = await makeOrder(user, [p], "delivered");

    await generateReviewReminders(order);
    await generateReviewReminders(order); // tracking cron re-runs
    await generateReviewReminders(order);

    const count = await Notification.countDocuments({ user: user._id, type: "REVIEW_REMINDER" });
    expect(count).toBe(1);
  });

  test("concurrent generation for the same product is deduped by the DB index", async () => {
    const user = await makeUser();
    const p = await makeProduct("A");
    const order = await makeOrder(user, [p], "delivered");

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => generateReviewReminders(order))
    );
    results.forEach((r) => expect(r.status).toBe("fulfilled"));
    expect(await Notification.countDocuments({ type: "REVIEW_REMINDER" })).toBe(1);
  });

  test("no reminder when the customer already reviewed the product", async () => {
    const user = await makeUser();
    const p = await makeProduct("A");
    await makeOrder(user, [p], "delivered");
    await Feedback.create({ user, product: p, rating: 5, comment: "old review" });

    const order = await Order.findOne({ user: user._id });
    await generateReviewReminders(order);
    expect(await Notification.countDocuments({})).toBe(0);
  });

  test("cancelled orders produce no reminders", async () => {
    const user = await makeUser();
    const p = await makeProduct("A");
    const order = await makeOrder(user, [p], "cancelled");
    await generateReviewReminders(order);
    expect(await Notification.countDocuments({})).toBe(0);
  });

  test("fully refunded product gets no reminder; partially returned sibling still does", async () => {
    const user = await makeUser();
    const p1 = await makeProduct("Returned fully");
    const p2 = await makeProduct("Kept");
    const order = await makeOrder(user, [p1, p2], "delivered");

    await ReturnRequest.create({
      order: order._id,
      user: user._id,
      items: [{ product: p1._id, quantity: 1, reason: "defective" }],
      status: "refunded",
    });

    await generateReviewReminders(order);
    const reminders = await Notification.find({ user: user._id, type: "REVIEW_REMINDER" });
    expect(reminders).toHaveLength(1);
    expect(String(reminders[0].product)).toBe(String(p2._id));
  });
});

// ---------------------------------------------------------------------------
// Customer-facing notification endpoints
// ---------------------------------------------------------------------------
describe("Customer notification APIs", () => {
  const app = buildApp();

  beforeAll(async () => {
    await startServer(app);
  });

  afterAll(async () => {
    await stopServer(app);
  });

  const tokenFor = (user) =>
    jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);

  const seedReminder = async (userId, opts = {}) => {
    const u = await User.findById(userId);
    const p = await makeProduct("P");
    const o = await makeOrder(u, [p], "delivered");
    return Notification.create({
      user: userId,
      type: "REVIEW_REMINDER",
      title: "How was your purchase?",
      message: "Rate your product.",
      product: p._id,
      order: o._id,
      ...opts,
    });
  };

  test("users receive only their own notifications", async () => {
    const u1 = await makeUser();
    const u2 = await makeUser();
    await seedReminder(u1._id);
    await seedReminder(u2._id);

    const r = await request(app, "GET", "/api/notifications/user", { token: tokenFor(u1) });
    expect(r.status).toBe(200);
    expect(r.body.notifications).toHaveLength(1);
    expect(String(r.body.notifications[0].user)).toBe(String(u1._id));
  });

  test("unread count covers only own unread, not-yet-completed reminders", async () => {
    const u = await makeUser();
    await seedReminder(u._id);
    await seedReminder(u._id);
    await seedReminder(u._id, { reviewSubmitted: true }); // completed review → excluded

    const r = await request(app, "GET", "/api/notifications/unread-count", { token: tokenFor(u) });
    expect(r.status).toBe(200);
    expect(r.body.count).toBe(2);
  });

  test("marking read sets read only, never reviewSubmitted", async () => {
    const u = await makeUser();
    const n = await seedReminder(u._id);
    const token = tokenFor(u);

    const r = await request(app, "PATCH", `/api/notifications/${n._id}/read`, { token });
    expect(r.status).toBe(200);
    const after = await Notification.findById(n._id);
    expect(after.read).toBe(true);
    expect(after.reviewSubmitted).toBe(false);

    const count = await request(app, "GET", "/api/notifications/unread-count", { token });
    expect(count.body.count).toBe(0);
  });

  test("cannot read or delete another user's notification", async () => {
    const u1 = await makeUser();
    const u2 = await makeUser();
    const n = await seedReminder(u2._id);
    const t1 = tokenFor(u1);

    const r1 = await request(app, "PATCH", `/api/notifications/${n._id}/read`, { token: t1 });
    expect(r1.status).toBe(404);
    const r2 = await request(app, "DELETE", `/api/notifications/${n._id}`, { token: t1 });
    expect(r2.status).toBe(404);
    expect(await Notification.findById(n._id)).not.toBeNull();
  });

  test("mark all read clears the unread count", async () => {
    const u = await makeUser();
    await seedReminder(u._id);
    await seedReminder(u._id);
    const token = tokenFor(u);

    const r = await request(app, "POST", "/api/notifications/mark-all-read", { token });
    expect(r.status).toBe(200);
    const count = await request(app, "GET", "/api/notifications/unread-count", { token });
    expect(count.body.count).toBe(0);
  });

  test("review eligibility reflects delivery state and existing reviews", async () => {
    const u = await makeUser();
    const delivered = await makeProduct("Delivered");
    const pending = await makeProduct("Pending");
    await makeOrder(u, [delivered], "delivered");
    await makeOrder(u, [pending], "shipped");
    const token = tokenFor(u);

    const ok = await request(app, "GET", `/api/notifications/review-eligibility/${delivered._id}`, { token });
    expect(ok.status).toBe(200);
    expect(ok.body.eligible).toBe(true);
    expect(ok.body.canReview).toBe(true);

    const notYet = await request(app, "GET", `/api/notifications/review-eligibility/${pending._id}`, { token });
    expect(notYet.body.eligible).toBe(false);

    await Feedback.create({ user: u, product: delivered, rating: 4, comment: "x" });
    const after = await request(app, "GET", `/api/notifications/review-eligibility/${delivered._id}`, { token });
    expect(after.body.alreadyReviewed).toBe(true);
    expect(after.body.canReview).toBe(false);
  });

  test("unauthenticated requests are rejected", async () => {
    const r = await request(app, "GET", "/api/notifications/unread-count");
    expect(r.status).toBe(401);
  });
});
