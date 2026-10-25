import { describe, test, expect, jest } from "@jest/globals";
import express from "express";
import jwt from "jsonwebtoken";

// The test-harness mongod can wedge mid-run on some Windows machines; the
// setup helper detects that and respawns a fresh instance (up to 3 per
// reset). Allow room for the recovery path so a single wedge doesn't
// cascade into hook timeouts.
jest.setTimeout(180_000);
import {
  connectDb,
  disconnectDb,
  resetCollections,
  startServer,
  stopServer,
  request,
  makeUser,
  makeOrder,
  JWT_SECRET,
  retryTest,
} from "./helpers/setup.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Seller from "../models/Seller.js";
import CODCollection from "../models/CODCollection.js";
import SellerPayout from "../models/SellerPayout.js";
import sellersRouter from "../routes/sellersRouter.js";
import orderRouter from "../routes/orderRouter.js";
import feedbackRouter from "../routes/feedbackRouter.js";
import {
  addCalendarDaysUTC,
  processPayoutCron,
  computeCommissionSnapshot,
} from "../services/payoutService.js";

let app;

const tokenFor = (user) => jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);

const makeSeller = async (commissionRate = 10) => {
  const user = await makeUser("seller");
  const seller = await Seller.create({
    user: user._id,
    shopName: `Shop ${Date.now()}`,
    ownerName: "Owner",
    ownerPhone: "0771234567",
    status: "approved",
    commissionRate,
  });
  const product = await Product.create({
    name: `Widget ${Date.now()}`,
    description: "d",
    price: 100,
    category: "test",
    stock: 10,
    seller: user._id,
  });
  return { user, seller, product };
};

/** Place a COD order the same way checkout does: the order record stores an
 * immutable per-seller commission snapshot at placement time (both real
 * Order.create sites do this in paymentController). */
const placeCODDelivered = async (admin, buyer, { user, product }) => {
  const order = await makeOrder(buyer, [product], "pending");
  order.commissionSnapshot = await computeCommissionSnapshot(order);
  await order.save();
  for (const status of ["processing", "shipped", "delivered"]) {
    const r = await request(
      app,
      "PUT",
      `/api/orders/admin/update-order-status/${order._id}`,
      { token: tokenFor(admin), body: { status } }
    );
    expect(r.status).toBe(200);
  }
  return order;
};

const findCollection = async (orderId) =>
  CODCollection.findOne({ order: orderId, type: "collection" });

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use("/api/sellers", sellersRouter);
  app.use("/api/orders", orderRouter);
  app.use("/api/feedback", feedbackRouter);
  // Same global error mapping as server.js: res.status set in a handler
  // wins over err.status; otherwise err.status (or 500).
  app.use((err, req, res, next) => {
    const status = res.statusCode >= 400 ? res.statusCode : err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  });
  await startServer(app);
  await connectDb();
});

afterAll(async () => {
  await stopServer(app);
  await disconnectDb();
});

beforeEach(async () => {
  await resetCollections();
  await Promise.all([
    Seller.deleteMany({}),
    CODCollection.deleteMany({}),
    SellerPayout.deleteMany({}),
  ]);
  // Partial unique indexes may be missing on a freshly spawned mongod's db
  await Promise.all([CODCollection.syncIndexes(), SellerPayout.syncIndexes()]);
});

describe("commission snapshot", () => {
  test("delivery stores a pending_collection row with the placement-time snapshot", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { user, product } = await makeSeller(10);
      const buyer = await makeUser("customer");

      const order = await placeCODDelivered(admin, buyer, { user, product });

      const row = await findCollection(order._id);
      expect(row).not.toBeNull();
      expect(row.status).toBe("pending_collection");
      expect(row.seller.toString()).toBe(user._id.toString());
      expect(row.expectedAmount).toBe(100);
      expect(row.commissionRate).toBe(10);
      expect(row.commissionAmount).toBe(10);
      expect(row.snapshotSource).toBe("order");
      expect(row.grossCollected).toBe(0);
      expect(row.payoutDueAt).toBeUndefined(); // no receivedAt yet
    });
  });

  test("changing the rate later never rewrites an existing snapshot", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { user, seller, product } = await makeSeller(10);
      const buyer = await makeUser("customer");

      const orderA = await placeCODDelivered(admin, buyer, { user, product });
      const rowA = await findCollection(orderA._id);

      const setRes = await request(app, "PUT", `/api/sellers/admin/${seller._id}/commission`, {
        token: tokenFor(admin),
        body: { commissionRate: 50 },
      });
      expect(setRes.status).toBe(200);

      const orderB = await placeCODDelivered(admin, buyer, { user, product });
      const rowB = await findCollection(orderB._id);

      expect(rowB.commissionRate).toBe(50);
      expect(rowB.commissionAmount).toBe(50);
      const rA = await findCollection(orderA._id);
      expect(rA.commissionRate).toBe(10);
      expect(rA.commissionAmount).toBe(10);
    });
  });

  test("commission rate is validated 0-100 server-side", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { seller } = await makeSeller(10);

      const bad1 = await request(app, "PUT", `/api/sellers/admin/${seller._id}/commission`, {
        token: tokenFor(admin),
        body: { commissionRate: -5 },
      });
      const bad2 = await request(app, "PUT", `/api/sellers/admin/${seller._id}/commission`, {
        token: tokenFor(admin),
        body: { commissionRate: 101 },
      });
      const good = await request(app, "PUT", `/api/sellers/admin/${seller._id}/commission`, {
        token: tokenFor(admin),
        body: { commissionRate: 100 },
      });
      expect(bad1.status).toBe(400);
      expect(bad2.status).toBe(400);
      expect(good.status).toBe(200);
      expect(good.body.seller.commissionRate).toBe(100);
    });
  });
});

describe("courier verification and due date", () => {
  test("verify sets receivedAt and payoutDueAt = receivedAt UTC date + 10 calendar days at 00:00Z", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { user, product } = await makeSeller(10);
      const buyer = await makeUser("customer");
      const order = await placeCODDelivered(admin, buyer, { user, product });
      const row = await findCollection(order._id);

      const r = await request(app, "POST", `/api/sellers/admin/payouts/collections/${row._id}/verify`, {
        token: tokenFor(admin),
        body: { grossCollected: 100, courier: "Domex", settlementRef: "DMX-001" },
      });
      expect(r.status).toBe(200);
      expect(r.body.collection.status).toBe("collected");
      expect(r.body.collection.grossCollected).toBe(100);

      const db = await CODCollection.findById(row._id);
      expect(db.receivedAt).toBeInstanceOf(Date);
      const expectedDue = addCalendarDaysUTC(new Date(db.receivedAt), 10);
      expect(db.payoutDueAt.getTime()).toBe(expectedDue.getTime());
      // The due time is exactly midnight UTC
      expect(db.payoutDueAt.getUTCHours()).toBe(0);
      expect(db.payoutDueAt.getUTCMinutes()).toBe(0);
      // And it is strictly in the future (10 days out)
      expect(db.payoutDueAt.getTime()).toBeGreaterThan(db.receivedAt.getTime());
    });
  });

  test("a second verify of the same collection is rejected (409) and keeps the first record", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { user, product } = await makeSeller(10);
      const buyer = await makeUser("customer");
      const order = await placeCODDelivered(admin, buyer, { user, product });
      const row = await findCollection(order._id);

      const first = await request(app, "POST", `/api/sellers/admin/payouts/collections/${row._id}/verify`, {
        token: tokenFor(admin),
        body: { grossCollected: 100, courier: "Domex", settlementRef: "DMX-FIRST" },
      });
      expect(first.status).toBe(200);

      const second = await request(app, "POST", `/api/sellers/admin/payouts/collections/${row._id}/verify`, {
        token: tokenFor(admin),
        body: { grossCollected: 1, courier: "Fake", settlementRef: "DMX-HACK" },
      });
      expect(second.status).toBe(409);

      const db = await CODCollection.findById(row._id);
      expect(db.settlementRef).toBe("DMX-FIRST");
      expect(db.grossCollected).toBe(100);
    });
  });

  test("verify requires a valid amount and a settlement reference", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { user, product } = await makeSeller(10);
      const buyer = await makeUser("customer");
      const order = await placeCODDelivered(admin, buyer, { user, product });
      const row = await findCollection(order._id);

      const badAmount = await request(app, "POST", `/api/sellers/admin/payouts/collections/${row._id}/verify`, {
        token: tokenFor(admin),
        body: { grossCollected: -5, settlementRef: "X" },
      });
      const noRef = await request(app, "POST", `/api/sellers/admin/payouts/collections/${row._id}/verify`, {
        token: tokenFor(admin),
        body: { grossCollected: 10 },
      });
      expect(badAmount.status).toBe(400);
      expect(noRef.status).toBe(400);
    });
  });
});

describe("payout batches", () => {
  test("unverified collections cannot be put into a payout", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { user, product } = await makeSeller(10);
      const buyer = await makeUser("customer");
      const order = await placeCODDelivered(admin, buyer, { user, product });
      const row = await findCollection(order._id);

      const r = await request(app, "POST", "/api/sellers/admin/payouts", {
        token: tokenFor(admin),
        body: { seller: user._id, collectionIds: [row._id] },
      });
      expect(r.status).toBe(400);
      expect(await SellerPayout.countDocuments({})).toBe(0);
      const db = await findCollection(order._id);
      expect(db.status).toBe("pending_collection");
    });
  });

  test("a batch groups verified collections; due date is the latest included due date", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { user, product } = await makeSeller(10);
      const buyer = await makeUser("customer");

      const o1 = await placeCODDelivered(admin, buyer, { user, product });
      const o2 = await placeCODDelivered(admin, buyer, { user, product });
      const r1 = await findCollection(o1._id);
      const r2 = await findCollection(o2._id);

      const v1 = await request(app, "POST", `/api/sellers/admin/payouts/collections/${r1._id}/verify`, {
        token: tokenFor(admin),
        body: { grossCollected: 100, settlementRef: "D1" },
      });
      const v2 = await request(app, "POST", `/api/sellers/admin/payouts/collections/${r2._id}/verify`, {
        token: tokenFor(admin),
        body: { grossCollected: 120, settlementRef: "D2" },
      });
      expect(v1.status).toBe(200);
      expect(v2.status).toBe(200);

      const created = await request(app, "POST", "/api/sellers/admin/payouts", {
        token: tokenFor(admin),
        body: { seller: user._id, collectionIds: [r1._id, r2._id], deductions: 10 },
      });
      expect(created.status).toBe(201);
      const pay = created.body.payout;
      expect(pay.status).toBe("processing");
      expect(pay.grossCollected).toBe(220);
      // Commission is the per-order snapshot total: 10% of 100 + 10% of 100
      expect(pay.commissionAmount).toBe(20);
      expect(pay.deductions).toBe(10);
      expect(pay.netPayable).toBe(190);
      expect(new Date(pay.payoutDueAt).getTime()).toBe(
        Math.max(new Date(v1.body.collection.payoutDueAt).getTime(), new Date(v2.body.collection.payoutDueAt).getTime())
      );

      // Both rows are allocated to the payout
      for (const id of [r1._id, r2._id]) {
        const db = await CODCollection.findById(id);
        expect(db.allocatedPayout.toString()).toBe(pay._id);
      }
    });
  });

  test("an allocated collection cannot go into a second batch (409) and the first batch wins", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { user, product } = await makeSeller(10);
      const buyer = await makeUser("customer");
      const o = await placeCODDelivered(admin, buyer, { user, product });
      const row = await findCollection(o._id);
      await request(app, "POST", `/api/sellers/admin/payouts/collections/${row._id}/verify`, {
        token: tokenFor(admin),
        body: { grossCollected: 100, settlementRef: "D1" },
      });

      const b1 = await request(app, "POST", "/api/sellers/admin/payouts", {
        token: tokenFor(admin),
        body: { seller: user._id, collectionIds: [row._id] },
      });
      expect(b1.status).toBe(201);

      const b2 = await request(app, "POST", "/api/sellers/admin/payouts", {
        token: tokenFor(admin),
        body: { seller: user._id, collectionIds: [row._id] },
      });
      expect(b2.status).toBe(409);
      expect(await SellerPayout.countDocuments({})).toBe(1);
    });
  });

  test("mark-paid requires a reference and eligibility; paid state is final", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { user, product } = await makeSeller(10);
      const buyer = await makeUser("customer");
      const o = await placeCODDelivered(admin, buyer, { user, product });
      const row = await findCollection(o._id);
      const v = await request(app, "POST", `/api/sellers/admin/payouts/collections/${row._id}/verify`, {
        token: tokenFor(admin),
        body: { grossCollected: 100, settlementRef: "D1" },
      });
      const created = await request(app, "POST", "/api/sellers/admin/payouts", {
        token: tokenFor(admin),
        body: { seller: user._id, collectionIds: [row._id] },
      });
      const payId = created.body.payout._id;

      // No ref -> 400
      const noRef = await request(app, "PUT", `/api/sellers/admin/payouts/${payId}/mark-paid`, {
        token: tokenFor(admin),
        body: {},
      });
      expect(noRef.status).toBe(400);

      // Still processing (due date 10 days out) -> 409
      const early = await request(app, "PUT", `/api/sellers/admin/payouts/${payId}/mark-paid`, {
        token: tokenFor(admin),
        body: { paymentRef: "BANK-001" },
      });
      expect(early.status).toBe(409);

      // Cron makes it eligible once the due date has passed
      const db = await SellerPayout.findById(payId);
      await SellerPayout.updateOne({ _id: payId }, { $set: { payoutDueAt: new Date() } });
      await processPayoutCron();
      const afterCron = await SellerPayout.findById(payId);
      expect(afterCron.status).toBe("eligible_for_payout");

      const paid = await request(app, "PUT", `/api/sellers/admin/payouts/${payId}/mark-paid`, {
        token: tokenFor(admin),
        body: { paymentRef: "BANK-001" },
      });
      expect(paid.status).toBe(200);
      expect(paid.body.payout.status).toBe("paid");
      expect(paid.body.payout.paymentRef).toBe("BANK-001");
      expect(paid.body.payout.paidAt).toBeTruthy();

      // The collections inherit the paid state, records unchanged
      const dbRow = await findCollection(o._id);
      expect(dbRow.status).toBe("paid");
      expect(dbRow.grossCollected).toBe(100);

      // Duplicate confirmation -> 409, original ref preserved
      const dup = await request(app, "PUT", `/api/sellers/admin/payouts/${payId}/mark-paid`, {
        token: tokenFor(admin),
        body: { paymentRef: "BANK-EVIL" },
      });
      expect(dup.status).toBe(409);
      const final = await SellerPayout.findById(payId);
      expect(final.paymentRef).toBe("BANK-001");
      expect(final.status).toBe("paid");
      expect(final.auditLog.length).toBe(2); // created + marked_paid (dup rejected)
    });
  });

  test("a failed payout frees its collections for a new batch and audit-logs the reason", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { user, product } = await makeSeller(10);
      const buyer = await makeUser("customer");
      const o = await placeCODDelivered(admin, buyer, { user, product });
      const row = await findCollection(o._id);
      await request(app, "POST", `/api/sellers/admin/payouts/collections/${row._id}/verify`, {
        token: tokenFor(admin),
        body: { grossCollected: 100, settlementRef: "D1" },
      });
      const b1 = await request(app, "POST", "/api/sellers/admin/payouts", {
        token: tokenFor(admin),
        body: { seller: user._id, collectionIds: [row._id] },
      });
      const payId = b1.body.payout._id;

      const noReason = await request(app, "PUT", `/api/sellers/admin/payouts/${payId}/mark-failed`, {
        token: tokenFor(admin),
        body: {},
      });
      expect(noReason.status).toBe(400);

      const failed = await request(app, "PUT", `/api/sellers/admin/payouts/${payId}/mark-failed`, {
        token: tokenFor(admin),
        body: { reason: "Bank rejected transfer" },
      });
      expect(failed.status).toBe(200);
      expect(failed.body.payout.status).toBe("failed");

      const dbRow = await findCollection(o._id);
      expect(dbRow.allocatedPayout).toBeNull();

      // The same collection can now be grouped again
      const b2 = await request(app, "POST", "/api/sellers/admin/payouts", {
        token: tokenFor(admin),
        body: { seller: user._id, collectionIds: [row._id] },
      });
      expect(b2.status).toBe(201);
    });
  });
});

describe("refunds and reversals", () => {
  test("completing a COD return creates one idempotent negative reversal row", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { user, product } = await makeSeller(10);
      const buyer = await makeUser("customer");
      const order = await placeCODDelivered(admin, buyer, { user, product });
      const row = await findCollection(order._id);

      // Buyer starts a return for the whole order
      const init = await request(app, "POST", "/api/feedback/returns/initiate", {
        token: tokenFor(buyer),
        body: {
          order: order._id,
          items: [{ product: product._id, quantity: 1, reason: "defective" }],
        },
      });
      expect(init.status).toBe(201);
      const rrId = init.body.returnRequest._id;

      await request(app, "PUT", `/api/feedback/returns/${rrId}/approve`, { token: tokenFor(admin) });
      await request(app, "PUT", `/api/feedback/returns/${rrId}/process-refund`, {
        token: tokenFor(admin),
        body: { refundAmount: 50 },
      });

      const done = await request(app, "PUT", `/api/feedback/returns/${rrId}/complete`, {
        token: tokenFor(admin),
        body: { refundMethod: "manual" },
      });
      expect(done.status).toBe(200);

      const rev = await CODCollection.findOne({ type: "reversal", returnRequest: rrId });
      expect(rev).not.toBeNull();
      expect(rev.status).toBe("reversed");
      expect(rev.grossCollected).toBe(-50);
      expect(rev.commissionAmount).toBe(-5); // 10% of 50, negative
      expect(rev.reversalOf.toString()).toBe(row._id.toString());
      expect(rev.seller.toString()).toBe(user._id.toString());

      // Re-processing the same return does not duplicate the row
      await request(app, "PUT", `/api/feedback/returns/${rrId}/complete`, {
        token: tokenFor(admin),
        body: { refundMethod: "manual" },
      });
      expect(await CODCollection.countDocuments({ type: "reversal", returnRequest: rrId })).toBe(1);
    });
  });

  test("a reversal auto-reduces the batch that includes its collection", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { user, product } = await makeSeller(10);
      const buyer = await makeUser("customer");
      const order = await placeCODDelivered(admin, buyer, { user, product });
      const row = await findCollection(order._id);

      await request(app, "POST", `/api/sellers/admin/payouts/collections/${row._id}/verify`, {
        token: tokenFor(admin),
        body: { grossCollected: 100, settlementRef: "D1" },
      });

      // Buyer returns the order; admin refunds 50
      const init = await request(app, "POST", "/api/feedback/returns/initiate", {
        token: tokenFor(buyer),
        body: {
          order: order._id,
          items: [{ product: product._id, quantity: 1, reason: "defective" }],
        },
      });
      const rrId = init.body.returnRequest._id;
      await request(app, "PUT", `/api/feedback/returns/${rrId}/approve`, { token: tokenFor(admin) });
      await request(app, "PUT", `/api/feedback/returns/${rrId}/process-refund`, {
        token: tokenFor(admin),
        body: { refundAmount: 50 },
      });
      await request(app, "PUT", `/api/feedback/returns/${rrId}/complete`, {
        token: tokenFor(admin),
        body: { refundMethod: "manual" },
      });

      const created = await request(app, "POST", "/api/sellers/admin/payouts", {
        token: tokenFor(admin),
        body: { seller: user._id, collectionIds: [row._id] },
      });
      expect(created.status).toBe(201);
      const pay = created.body.payout;
      expect(pay.collections.length).toBe(2); // collection + its reversal
      expect(pay.grossCollected).toBe(50); // 100 - 50
      expect(pay.commissionAmount).toBe(5); // 10 - 5
      expect(pay.netPayable).toBe(45);
    });
  });
});

describe("access control", () => {
  test("a seller cannot use admin payout routes (403)", async () => {
    await retryTest(async () => {
      const { user } = await makeSeller(10);
      const r = await request(app, "GET", "/api/sellers/admin/payouts", { token: tokenFor(user) });
      expect(r.status).toBe(403);
    });
  });

  test("unauthenticated payout requests are rejected (401/403)", async () => {
    await retryTest(async () => {
      const r1 = await request(app, "GET", "/api/sellers/payouts");
      const r2 = await request(app, "GET", "/api/sellers/admin/payouts/board");
      // The auth middleware returns 401 for missing tokens; the role
      // middleware's follow-up callback ends at 403, which wins in the app.
      for (const r of [r1, r2]) {
        expect([401, 403]).toContain(r.status);
      }
    });
  });

  test("a seller can read their own payout summary", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { user, product } = await makeSeller(10);
      const buyer = await makeUser("customer");
      const order = await placeCODDelivered(admin, buyer, { user, product });
      const row = await findCollection(order._id);
      await request(app, "POST", `/api/sellers/admin/payouts/collections/${row._id}/verify`, {
        token: tokenFor(admin),
        body: { grossCollected: 100, settlementRef: "D1" },
      });

      const r = await request(app, "GET", "/api/sellers/payouts", { token: tokenFor(user) });
      expect(r.status).toBe(200);
      expect(r.body.payout.commissionRate).toBe(10);
      expect(r.body.payout.verifiedNotPaid.count).toBe(1);
      expect(r.body.payout.verifiedNotPaid.grossTotal).toBe(100);
      expect(r.body.payout.pendingCollection.count).toBe(0);
    });
  });
});

describe("payout board", () => {
  test("admin payout board lists sellers with their settlement state", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { user, product } = await makeSeller(10);
      const buyer = await makeUser("customer");
      const order = await placeCODDelivered(admin, buyer, { user, product });

      const r = await request(app, "GET", "/api/sellers/admin/payouts/board", { token: tokenFor(admin) });
      expect(r.status).toBe(200);
      const me = r.body.board.find((b) => b.seller === user._id.toString());
      expect(me).toBeTruthy();
      expect(me.pending.count).toBe(1);
      expect(me.pending.expectedTotal).toBe(100);
      expect(me.commissionRate).toBe(10);
    });
  });
});
