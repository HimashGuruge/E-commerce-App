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
import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import Feedback from "../models/Feedback.js";
import ReturnRequest from "../models/ReturnRequest.js";
import jwt from "jsonwebtoken";
import { generateReviewReminders, hasFullyReturnedItem } from "../services/reviewReminderService.js";
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

describe("Verified-purchase review submission", () => {
  const app = buildApp();

  beforeAll(async () => {
    await startServer(app);
  });

  afterAll(async () => {
    await stopServer(app);
  });

  const tokenFor = (user) =>
    jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);

  test("a delivered purchase allows a verified review with order ref and approval", async () => {
    const u = await makeUser();
    const p = await makeProduct("Wearable");
    const order = await makeOrder(u, [p], "delivered");
    const token = tokenFor(u);

    const r = await request(app, "POST", "/api/feedback/submit", {
      token,
      body: { productId: String(p._id), rating: 5, comment: "Love it" },
    });
    expect(r.status).toBe(201);
    expect(r.body.success).toBe(true);
    expect(r.body.feedback.isVerifiedPurchase).toBe(true);
    expect(r.body.feedback.status).toBe("approved");
    expect(mongoose.isValidObjectId(r.body.feedback.order)).toBe(true);
    expect(String(r.body.feedback.order)).toBe(String(order._id));
  });

  test("review is rejected without a qualifying purchase of the product", async () => {
    const u = await makeUser();
    const other = await makeUser();
    const p = await makeProduct("Not bought by reviewer");
    await makeOrder(other, [p], "delivered"); // someone else bought it
    const token = tokenFor(u);

    const r = await request(app, "POST", "/api/feedback/submit", {
      token,
      body: { productId: String(p._id), rating: 5, comment: "Hm" },
    });
    expect(r.status).toBe(403);
    expect(await Feedback.countDocuments({})).toBe(0);
  });

  test("a shipped (undelivered) order does not qualify", async () => {
    const u = await makeUser();
    const p = await makeProduct("In transit");
    await makeOrder(u, [p], "shipped");
    const token = tokenFor(u);

    const r = await request(app, "POST", "/api/feedback/submit", {
      token,
      body: { productId: String(p._id), rating: 5, comment: "Waiting" },
    });
    expect(r.status).toBe(403);
  });

  test("only one review per customer per product (409 on second attempt)", async () => {
    const u = await makeUser();
    const p = await makeProduct("Once only");
    await makeOrder(u, [p], "delivered");
    const token = tokenFor(u);

    const first = await request(app, "POST", "/api/feedback/submit", {
      token,
      body: { productId: String(p._id), rating: 4, comment: "first" },
    });
    expect(first.status).toBe(201);

    const second = await request(app, "POST", "/api/feedback/submit", {
      token,
      body: { productId: String(p._id), rating: 5, comment: "again" },
    });
    expect(second.status).toBe(409);
    expect(await Feedback.countDocuments({ user: u, product: p })).toBe(1);
  });

  test("concurrent submissions by the same customer resolve to exactly one review", async () => {
    const u = await makeUser();
    const p = await makeProduct("Race");
    await makeOrder(u, [p], "delivered");
    const token = tokenFor(u);

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        request(app, "POST", "/api/feedback/submit", {
          token,
          body: { productId: String(p._id), rating: 5, comment: "race" },
        })
      )
    );
    const ok = results.filter((r) => r.value.status === 201);
    const dup = results.filter((r) => r.value.status === 409);
    expect(ok.length + dup.length).toBe(5);
    expect(await Feedback.countDocuments({ user: u, product: p })).toBe(1);
  });

  test("two customers can each review the same product independently", async () => {
    const u1 = await makeUser();
    const u2 = await makeUser();
    const p = await makeProduct("Shared");
    await makeOrder(u1, [p], "delivered");
    await makeOrder(u2, [p], "delivered");

    const r1 = await request(app, "POST", "/api/feedback/submit", {
      token: tokenFor(u1),
      body: { productId: String(p._id), rating: 5, comment: "u1" },
    });
    const r2 = await request(app, "POST", "/api/feedback/submit", {
      token: tokenFor(u2),
      body: { productId: String(p._id), rating: 3, comment: "u2" },
    });
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(await Feedback.countDocuments({ product: p })).toBe(2);
  });

  test("submitting a review completes its reminder and drops it from the badge", async () => {
    const u = await makeUser();
    const p = await makeProduct("Remind me");
    const order = await makeOrder(u, [p], "delivered");
    await generateReviewReminders(order);

    expect(
      await Notification.countDocuments({
        user: u,
        type: "REVIEW_REMINDER",
        reviewSubmitted: false,
      })
    ).toBe(1);

    const token = tokenFor(u);
    const before = await request(app, "GET", "/api/notifications/unread-count", { token });
    expect(before.body.count).toBe(1);

    const r = await request(app, "POST", "/api/feedback/submit", {
      token,
      body: { productId: String(p._id), rating: 5, comment: "done" },
    });
    expect(r.status).toBe(201);

    const after = await request(app, "GET", "/api/notifications/unread-count", { token });
    expect(after.body.count).toBe(0);
    const n = await Notification.findOne({ user: u, type: "REVIEW_REMINDER" });
    expect(n.reviewSubmitted).toBe(true);
  });

  test("a fully returned item blocks review submission; the kept sibling still works", async () => {
    const u = await makeUser();
    const p1 = await makeProduct("Fully back");
    const p2 = await makeProduct("Kept");
    const order = await makeOrder(u, [p1, p2], "delivered");
    await ReturnRequest.create({
      order: order._id,
      user: u._id,
      items: [{ product: p1._id, quantity: 1, reason: "defective" }],
      status: "completed",
    });

    expect(await hasFullyReturnedItem(order, order.items[0])).toBe(true);

    const blocked = await request(app, "POST", "/api/feedback/submit", {
      token: tokenFor(u),
      body: { productId: String(p1._id), rating: 5, comment: "returned it" },
    });
    expect(blocked.status).toBe(403);
    expect(await Feedback.countDocuments({})).toBe(0);

    const ok = await request(app, "POST", "/api/feedback/submit", {
      token: tokenFor(u),
      body: { productId: String(p2._id), rating: 4, comment: "kept" },
    });
    expect(ok.status).toBe(201);
  });

  test("invalid payloads are rejected", async () => {
    const u = await makeUser();
    const p = await makeProduct("Valid target");
    await makeOrder(u, [p], "delivered");
    const token = tokenFor(u);

    const badId = await request(app, "POST", "/api/feedback/submit", {
      token,
      body: { productId: "not-an-objectid", rating: 5, comment: "x" },
    });
    expect(badId.status).toBe(400);

    const badRating = await request(app, "POST", "/api/feedback/submit", {
      token,
      body: { productId: String(p._id), rating: 7, comment: "x" },
    });
    expect(badRating.status).toBe(400);

    const noComment = await request(app, "POST", "/api/feedback/submit", {
      token,
      body: { productId: String(p._id), rating: 4 },
    });
    expect(noComment.status).toBe(400);
  });

  test("unauthenticated submissions are rejected", async () => {
    const r = await request(app, "POST", "/api/feedback/submit", {
      body: {
        productId: new mongoose.Types.ObjectId().toHexString(),
        rating: 5,
        comment: "x",
      },
    });
    expect(r.status).toBe(401);
  });
});
