import { describe, test, expect, beforeEach, afterAll, afterEach, jest } from "@jest/globals";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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
import Product from "../models/Product.js";
import Seller from "../models/Seller.js";
import CODCollection from "../models/CODCollection.js";
import SellerPayout from "../models/SellerPayout.js";
import CommissionPayment from "../models/CommissionPayment.js";
import Notification from "../models/Notification.js";
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

const makeSeller = async (commissionRate = 10, commissionMode = "deduct") => {
  const user = await makeUser("seller");
  const seller = await Seller.create({
    user: user._id,
    shopName: `Shop ${Date.now()}`,
    ownerName: "Owner",
    ownerPhone: "0771234567",
    status: "approved",
    commissionRate,
    commissionMode,
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
 * immutable per-seller commission snapshot at placement time. */
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

const verifyCollection = async (admin, row, gross = 100) => {
  const r = await request(
    app,
    "POST",
    `/api/sellers/admin/payouts/collections/${row._id}/verify`,
    {
      token: tokenFor(admin),
      body: { grossCollected: gross, courier: "TestCo", settlementRef: `ST-${Date.now()}` },
    }
  );
  expect(r.status).toBe(200);
  return r.body.collection;
};

/** Fresh period: last 30 days ending today (ISO date only, like the UI sends). */
const periodDates = () => {
  const now = new Date();
  const from = addCalendarDaysUTC(now, -30);
  return {
    periodFrom: from.toISOString().slice(0, 10),
    periodTo: now.toISOString().slice(0, 10),
  };
};

/** Make a collection directly (admin-verified numbers, no order needed). */
const directCollection = (sellerUserId, { grossCollected, commissionAmount, receivedDaysAgo = 1 } = {}) => {
  const receivedAt = addCalendarDaysUTC(new Date(), -receivedDaysAgo);
  return CODCollection.create({
    order: new mongoose.Types.ObjectId(),
    seller: sellerUserId,
    type: "collection",
    status: "collected",
    expectedAmount: grossCollected,
    grossCollected,
    commissionRate: 10,
    commissionAmount,
    receivedAt,
    payoutDueAt: addCalendarDaysUTC(receivedAt, 10),
    verifiedBy: new mongoose.Types.ObjectId(),
  });
};

/** A reversal row matching what reversalService stores (negative amounts). */
const directReversal = (sellerUserId, { grossCollected, commissionAmount, receivedDaysAgo = 1 } = {}) =>
  CODCollection.create({
    order: new mongoose.Types.ObjectId(),
    seller: sellerUserId,
    type: "reversal",
    status: "reversed",
    expectedAmount: grossCollected,
    grossCollected,
    commissionRate: 10,
    commissionAmount,
    receivedAt: addCalendarDaysUTC(new Date(), -receivedDaysAgo),
  });

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use("/api/sellers", sellersRouter);
  app.use("/api/orders", orderRouter);
  app.use("/api/feedback", feedbackRouter);
  app.use((err, req, res, next) => {
    const status = res.statusCode >= 400 ? res.statusCode : err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  });
  await startServer(app);
  await connectDb();
});

beforeEach(async () => {
  await resetCollections();
  await Promise.all([
    Seller.deleteMany({}),
    CODCollection.deleteMany({}),
    SellerPayout.deleteMany({}),
    CommissionPayment.deleteMany({}),
  ]);
  // Partial unique indexes may be missing on a freshly spawned mongod's db
  await Promise.all([
    CODCollection.syncIndexes(),
    SellerPayout.syncIndexes(),
    CommissionPayment.syncIndexes(),
  ]);
});

afterAll(async () => {
  await stopServer(app);
  await disconnectDb();
});

describe("commission mode defaults and seller endpoints", () => {
  test("commissionMode defaults to deduct and the balance endpoint works for a seller", async () => {
    await retryTest(async () => {
      const { user, seller } = await makeSeller(10);
      expect(seller.commissionMode).toBe("deduct");

      const r = await request(app, "GET", "/api/sellers/commission/balance", {
        token: tokenFor(user),
      });
      expect(r.status).toBe(200);
      expect(r.body.balance).toEqual({
        grossDue: 0,
        eligibleCommission: 0,
        deductedPaid: 0,
        verifiedPaid: 0,
        balance: 0,
        credit: false,
      });
    });
  });

  test("a seller cannot hit admin commission routes and an admin cannot hit seller routes", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { user } = await makeSeller(10, "seller_pays");

      const sellerAsAdmin = await request(app, "GET", "/api/sellers/commission/balance", {
        token: tokenFor(admin),
      });
      expect(sellerAsAdmin.status).toBe(403);

      const adminAsSeller = await request(app, "GET", "/api/sellers/admin/commission/payments", {
        token: tokenFor(user),
      });
      expect(adminAsSeller.status).toBe(403);
    });
  });

  test("commission routes reject a customer token", async () => {
    await retryTest(async () => {
      const buyer = await makeUser("customer");
      const r = await request(app, "GET", "/api/sellers/commission/balance", {
        token: tokenFor(buyer),
      });
      expect(r.status).toBe(403);
    });
  });
});

describe("submit / list / cancel (seller side)", () => {
  test("a deduct-mode seller cannot submit a commission payment", async () => {
    await retryTest(async () => {
      const { user } = await makeSeller(10, "deduct");
      const r = await request(app, "POST", "/api/sellers/commission/payments", {
        token: tokenFor(user),
        body: { ...periodDates(), paidAmount: 10 },
      });
      expect(r.status).toBe(400);
      expect(r.body.error).toMatch(/deducted from payouts automatically/);
    });
  });

  test("submit without Supabase configured fails cleanly (400) when a file is present", async () => {
    await retryTest(async () => {
      const { user, seller } = await makeSeller(10, "seller_pays");
      // Simulate a file reaching the controller by inserting the doc directly is
      // not possible through HTTP multipart here without a file; instead verify
      // the no-file path works and that the upload path guards when Supabase is off
      // by checking the service throws via a direct call with a fake file.
      const { submitCommissionPayment } = await import("../services/commissionService.js");
      const fakeFile = {
        originalname: "proof.png",
        mimetype: "image/png",
        buffer: Buffer.from([137, 80, 78, 71]),
        size: 4,
      };
      let threw = false;
      try {
        // Dates as Date objects (service accepts both)
        const d = periodDates();
        await submitCommissionPayment(
          seller.user,
          { periodFrom: new Date(d.periodFrom), periodTo: new Date(d.periodTo), paidAmount: 10 },
          fakeFile
        );
      } catch (e) {
        threw = true;
        expect(e.message).toMatch(/Supabase is not configured/);
      }
      expect(threw).toBe(true);
      // No partial document should have been created.
      expect(await CommissionPayment.countDocuments({ seller: seller.user })).toBe(0);
    });
  });

  test("a seller_pays seller can submit without a file; list shows hasProof=false and no proofPath", async () => {
    await retryTest(async () => {
      const { user, seller } = await makeSeller(10, "seller_pays");
      const p = periodDates();
      const r = await request(app, "POST", "/api/sellers/commission/payments", {
        token: tokenFor(user),
        body: {
          ...p,
          paidAmount: 25.5,
          paymentMethod: "bank transfer",
          paymentRef: "TRF-1",
          note: "hello",
        },
      });
      expect(r.status).toBe(201);
      const payment = r.body.payment;
      expect(payment.status).toBe("pending");
      expect(payment.paidAmount).toBe(25.5);
      expect(payment.paymentMethod).toBe("bank transfer");
      expect(payment.seller.toString()).toBe(seller.user.toString());

      const list = await request(app, "GET", "/api/sellers/commission/payments", {
        token: tokenFor(user),
      });
      expect(list.status).toBe(200);
      expect(list.body.payments.length).toBe(1);
      expect(list.body.payments[0].hasProof).toBe(false);
      expect(list.body.payments[0].proofPath).toBeUndefined();
    });
  });

  test("missing period, bad period, and bad amounts are rejected", async () => {
    await retryTest(async () => {
      const { user } = await makeSeller(10, "seller_pays");
      const p = periodDates();

      const noPeriod = await request(app, "POST", "/api/sellers/commission/payments", {
        token: tokenFor(user),
        body: { paidAmount: 10 },
      });
      expect(noPeriod.status).toBe(400);

      const reversed = await request(app, "POST", "/api/sellers/commission/payments", {
        token: tokenFor(user),
        body: { ...p, periodFrom: p.periodTo, periodTo: p.periodFrom, paidAmount: 10 },
      });
      expect(reversed.status).toBe(400);

      const badAmounts = await request(app, "POST", "/api/sellers/commission/payments", {
        token: tokenFor(user),
        body: { ...p, paidAmount: -1 },
      });
      expect(badAmounts.status).toBe(400);
    });
  });

  test("only the owner can view or cancel their submissions", async () => {
    await retryTest(async () => {
      const { user: u1 } = await makeSeller(10, "seller_pays");
      const { user: u2 } = await makeSeller(10, "seller_pays");

      const p = periodDates();
      const r = await request(app, "POST", "/api/sellers/commission/payments", {
        token: tokenFor(u1),
        body: { ...p, paidAmount: 5 },
      });
      const id = r.body.payment._id;

      const otherList = await request(app, "GET", "/api/sellers/commission/payments", {
        token: tokenFor(u2),
      });
      expect(otherList.body.payments.length).toBe(0);

      const otherProof = await request(app, "GET", `/api/sellers/commission/my-proof/${id}`, {
        token: tokenFor(u2),
      });
      expect(otherProof.status).toBe(404);

      const otherCancel = await request(app, "DELETE", `/api/sellers/commission/payments/${id}`, {
        token: tokenFor(u2),
      });
      expect(otherCancel.status).toBe(404);

      // Owner cancels their own pending submission.
      const cancel = await request(app, "DELETE", `/api/sellers/commission/payments/${id}`, {
        token: tokenFor(u1),
      });
      expect(cancel.status).toBe(200);
      expect(cancel.body.payment.status).toBe("cancelled");

      // Cancelling again is a 404 (no longer pending).
      const again = await request(app, "DELETE", `/api/sellers/commission/payments/${id}`, {
        token: tokenFor(u1),
      });
      expect(again.status).toBe(404);
    });
  });

  test("proof URL endpoints return 404 when there is no proof", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { user } = await makeSeller(10, "seller_pays");
      const r = await request(app, "POST", "/api/sellers/commission/payments", {
        token: tokenFor(user),
        body: { ...periodDates(), paidAmount: 5 },
      });
      const id = r.body.payment._id;

      const mine = await request(app, "GET", `/api/sellers/commission/my-proof/${id}`, {
        token: tokenFor(user),
      });
      expect(mine.status).toBe(404);

      const adminUrl = await request(app, "GET", `/api/sellers/admin/commission/proof/${id}`, {
        token: tokenFor(admin),
      });
      expect(adminUrl.status).toBe(404);
    });
  });
});

describe("duplicate period protection", () => {
  test("a second live submission for the same period is rejected; after rejection a new one is allowed", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { user, seller } = await makeSeller(10, "seller_pays");
      const p = periodDates();

      const first = await request(app, "POST", "/api/sellers/commission/payments", {
        token: tokenFor(user),
        body: { ...p, paidAmount: 10 },
      });
      expect(first.status).toBe(201);

      const dup = await request(app, "POST", "/api/sellers/commission/payments", {
        token: tokenFor(user),
        body: { ...p, paidAmount: 20 },
      });
      expect(dup.status).toBe(409);

      // Admin rejects so the period opens up again.
      const reject = await request(
        app,
        "POST",
        `/api/sellers/admin/commission/payments/${first.body.payment._id}/reject`,
        { token: tokenFor(admin), body: { reason: "amount mismatch" } }
      );
      expect(reject.status).toBe(200);

      const second = await request(app, "POST", "/api/sellers/commission/payments", {
        token: tokenFor(user),
        body: { ...p, paidAmount: 10 },
      });
      expect(second.status).toBe(201);

      // Partial unique index still holds: only one live doc per period.
      const live = await CommissionPayment.countDocuments({
        seller: seller.user,
        periodFrom: first.body.payment.periodFrom,
        periodTo: first.body.payment.periodTo,
        status: { $in: ["pending", "verified"] },
      });
      expect(live).toBe(1);
    });
  });
});

describe("balance math (server-side, from verified rows only)", () => {
  test("reversals reduce both grossDue and eligible; rejected/cancelled submissions never count", async () => {
    await retryTest(async () => {
      const { user, seller } = await makeSeller(10, "seller_pays");

      // The balance is lifetime-cumulative (all verified rows, any dates).
      await directCollection(seller.user, { grossCollected: 50, commissionAmount: 5, receivedDaysAgo: 5 });
      await directCollection(seller.user, { grossCollected: 30, commissionAmount: 3, receivedDaysAgo: 10 });
      await directCollection(seller.user, { grossCollected: 99, commissionAmount: 9, receivedDaysAgo: 60 });

      // A reversal (negative).
      await directReversal(seller.user, { grossCollected: -10, commissionAmount: -1, receivedDaysAgo: 3 });

      // A rejected submission (should NOT count toward verifiedPaid).
      const admin = await makeUser("admin");
      const sub = await request(app, "POST", "/api/sellers/commission/payments", {
        token: tokenFor(user),
        body: { ...periodDates(), paidAmount: 77 },
      });
      expect(sub.status).toBe(201);
      const rej = await request(
        app,
        "POST",
        `/api/sellers/admin/commission/payments/${sub.body.payment._id}/reject`,
        { token: tokenFor(admin), body: { reason: "no" } }
      );
      expect(rej.status).toBe(200);

      const r = await request(app, "GET", "/api/sellers/commission/balance", {
        token: tokenFor(user),
      });
      expect(r.status).toBe(200);
      expect(r.body.balance).toEqual({
        grossDue: 169, // 50 + 30 + 99 - 10 (lifetime)
        eligibleCommission: 17, // 5 + 3 + 9 (collections only; reversal rows never count toward the cap)
        deductedPaid: 0,
        verifiedPaid: 0,
        balance: 169,
        credit: false,
      });
    });
  });

  test("verified submissions cap at the eligible commission (no negative balance from overpayment)", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { user, seller } = await makeSeller(10, "seller_pays");

      await directCollection(seller.user, { grossCollected: 40, commissionAmount: 4, receivedDaysAgo: 5 });

      // Overpayment: verify two submissions, one paying 4 and one paying 10.
      const p = periodDates();
      const a = await request(app, "POST", "/api/sellers/commission/payments", {
        token: tokenFor(user),
        body: { ...p, paidAmount: 4 },
      });
      const p2 = { periodFrom: "2020-01-01", periodTo: "2020-01-31" }; // different period, no rows in it
      const b = await request(app, "POST", "/api/sellers/commission/payments", {
        token: tokenFor(user),
        body: { ...p2, paidAmount: 10 },
      });
      expect(a.status).toBe(201);
      expect(b.status).toBe(201);

      const va = await request(app, "POST", `/api/sellers/admin/commission/payments/${a.body.payment._id}/verify`, {
        token: tokenFor(admin),
      });
      const vb = await request(app, "POST", `/api/sellers/admin/commission/payments/${b.body.payment._id}/verify`, {
        token: tokenFor(admin),
      });
      expect(va.status).toBe(200);
      expect(vb.status).toBe(200);

      const r = await request(app, "GET", "/api/sellers/commission/balance", {
        token: tokenFor(user),
      });
      // grossDue 40, eligible 4; verifiedPaid capped at 4 (4+10=14 > 4).
      expect(r.body.balance).toEqual({
        grossDue: 40,
        eligibleCommission: 4,
        deductedPaid: 0,
        verifiedPaid: 4,
        balance: 36,
        credit: false,
      });
    });
  });

  test("deducted-paid commissions reduce the balance (no double charge)", async () => {
    await retryTest(async () => {
      const { user, seller } = await makeSeller(10, "seller_pays");

      await directCollection(seller.user, { grossCollected: 100, commissionAmount: 10, receivedDaysAgo: 5 });

      // A paid SellerPayout that withheld 10 in commission.
      await SellerPayout.create({
        seller: seller.user,
        grossCollected: 100,
        commissionRate: 10,
        commissionAmount: 10,
        deductions: 0,
        netPayable: 90,
        payoutDueAt: new Date(),
        status: "paid",
        paidAt: new Date(),
        paymentRef: "BANK-1",
      });

      const r = await request(app, "GET", "/api/sellers/commission/balance", {
        token: tokenFor(user),
      });
      expect(r.body.balance).toEqual({
        grossDue: 100,
        eligibleCommission: 10,
        deductedPaid: 10,
        verifiedPaid: 0,
        balance: 90,
        credit: false,
      });
    });
  });

  test("refunds can push the balance negative -> credit flag", async () => {
    await retryTest(async () => {
      const { user, seller } = await makeSeller(10, "seller_pays");

      // Huge reversal inside the period pushes grossDue and commission negative.
      await directReversal(seller.user, { grossCollected: -200, commissionAmount: -20, receivedDaysAgo: 2 });

      const r = await request(app, "GET", "/api/sellers/commission/balance", {
        token: tokenFor(user),
      });
      expect(r.body.balance).toEqual({
        grossDue: -200,
        eligibleCommission: 0, // reversal rows never count toward the eligible commission cap
        deductedPaid: 0,
        verifiedPaid: 0,
        balance: -200,
        credit: true,
      });
    });
  });
});

describe("admin verify / reject", () => {
  test("verify is pending-only, writes audit + alert, and cannot be repeated", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { user, seller } = await makeSeller(10, "seller_pays");

      const sub = await request(app, "POST", "/api/sellers/commission/payments", {
        token: tokenFor(user),
        body: { ...periodDates(), paidAmount: 12 },
      });
      const id = sub.body.payment._id;

      const v = await request(app, "POST", `/api/sellers/admin/commission/payments/${id}/verify`, {
        token: tokenFor(admin),
        body: { note: "looks good" },
      });
      expect(v.status).toBe(200);
      expect(v.body.payment.status).toBe("verified");
      expect(v.body.payment.verifiedBy.toString()).toBe(String(admin._id));
      expect(v.body.payment.auditLog.some((a) => a.action === "verified" && a.note === "looks good")).toBe(true);

      // Seller alert stored with the uppercase type the widget expects.
      const alert = await Notification.findOne({ user: seller.user, type: "SELLER_ALERT", title: "Commission payment verified" });
      expect(alert).toBeTruthy();

      // Re-verify -> 409.
      const again = await request(app, "POST", `/api/sellers/admin/commission/payments/${id}/verify`, {
        token: tokenFor(admin),
      });
      expect(again.status).toBe(409);

      // Reject on a verified doc -> 409.
      const rej = await request(app, "POST", `/api/sellers/admin/commission/payments/${id}/reject`, {
        token: tokenFor(admin),
        body: { reason: "too late" },
      });
      expect(rej.status).toBe(409);
    });
  });

  test("reject requires a reason and is pending-only", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { user } = await makeSeller(10, "seller_pays");

      const sub = await request(app, "POST", "/api/sellers/commission/payments", {
        token: tokenFor(user),
        body: { ...periodDates(), paidAmount: 12 },
      });
      const id = sub.body.payment._id;

      const noReason = await request(app, "POST", `/api/sellers/admin/commission/payments/${id}/reject`, {
        token: tokenFor(admin),
        body: {},
      });
      expect(noReason.status).toBe(400);

      const r = await request(app, "POST", `/api/sellers/admin/commission/payments/${id}/reject`, {
        token: tokenFor(admin),
        body: { reason: "amount does not match" },
      });
      expect(r.status).toBe(200);
      expect(r.body.payment.status).toBe("rejected");
      expect(r.body.payment.rejectReason).toBe("amount does not match");
      expect(r.body.payment.auditLog.some((a) => a.action === "rejected")).toBe(true);

      const again = await request(app, "POST", `/api/sellers/admin/commission/payments/${id}/reject`, {
        token: tokenFor(admin),
        body: { reason: "again" },
      });
      expect(again.status).toBe(409);
    });
  });

  test("admin list returns rows with hasProof (never proofPath) and seller info; filter by status", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const { user, seller } = await makeSeller(10, "seller_pays");

      const sub = await request(app, "POST", "/api/sellers/commission/payments", {
        token: tokenFor(user),
        body: { ...periodDates(), paidAmount: 12 },
      });

      const all = await request(app, "GET", "/api/sellers/admin/commission/payments", {
        token: tokenFor(admin),
      });
      expect(all.status).toBe(200);
      expect(all.body.payments.length).toBe(1);
      const row = all.body.payments[0];
      expect(row.proofPath).toBeUndefined();
      expect(row.hasProof).toBe(false);
      expect(row.sellerInfo.shopName).toBe(seller.shopName);
      expect(row.sellerInfo.commissionMode).toBe("seller_pays");

      const filtered = await request(app, "GET", "/api/sellers/admin/commission/payments", {
        token: tokenFor(admin),
        query: { status: "verified" },
      });
      expect(filtered.body.payments.length).toBe(0);

      const pending = await request(app, "GET", "/api/sellers/admin/commission/payments", {
        token: tokenFor(admin),
        query: { status: "pending" },
      });
      expect(pending.body.payments.length).toBe(1);
    });
  });

  test("verify on a missing document is a 404", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const ghost = new (await import("../models/CommissionPayment.js")).default.schema.objTypes.ObjectId();
      const r = await request(app, "POST", `/api/sellers/admin/commission/payments/${ghost}/verify`, {
        token: tokenFor(admin),
      });
      expect(r.status).toBe(404);
    });
  });
});

describe("payout mode gate (no double charge)", () => {
  test("seller_pays payouts keep the full gross (commission 0); deduct mode still deducts", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const buyer = await makeUser("customer");
      const sp = await makeSeller(10, "seller_pays");
      const dd = await makeSeller(10, "deduct");

      const o1 = await placeCODDelivered(admin, buyer, { user: sp.user, product: sp.product });
      const c1 = await findCollection(o1._id);
      expect(c1.commissionAmount).toBe(10);
      await verifyCollection(admin, c1, 100);

      const o2 = await placeCODDelivered(admin, buyer, { user: dd.user, product: dd.product });
      const c2 = await findCollection(o2._id);
      expect(c2.commissionAmount).toBe(10);
      await verifyCollection(admin, c2, 100);

      const p1 = await request(app, "POST", "/api/sellers/admin/payouts", {
        token: tokenFor(admin),
        body: { seller: sp.user._id, collectionIds: [c1._id] },
      });
      expect(p1.status).toBe(201);
      expect(p1.body.payout.commissionAmount).toBe(0);
      expect(p1.body.payout.netPayable).toBe(100);

      const p2 = await request(app, "POST", "/api/sellers/admin/payouts", {
        token: tokenFor(admin),
        body: { seller: dd.user._id, collectionIds: [c2._id] },
      });
      expect(p2.status).toBe(201);
      expect(p2.body.payout.commissionAmount).toBe(10);
      expect(p2.body.payout.netPayable).toBe(90);
    });
  });

  test("seller_pays payout summary does not deduct commission from eligible totals", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const buyer = await makeUser("customer");
      const sp = await makeSeller(10, "seller_pays");

      const o1 = await placeCODDelivered(admin, buyer, { user: sp.user, product: sp.product });
      const c1 = await findCollection(o1._id);
      await verifyCollection(admin, c1, 100);

      // Cron flips to eligible_for_payout once due.
      await SellerPayout.updateOne({ seller: sp.user }, {});
      const row = await CODCollection.findOne({ _id: c1._id });
      row.payoutDueAt = new Date(Date.now() - 1000);
      await row.save();
      await processPayoutCron();

      const summary = await request(app, "GET", "/api/sellers/payouts", {
        token: tokenFor(sp.user),
      });
      expect(summary.status).toBe(200);
      expect(summary.body.payout.commissionMode).toBe("seller_pays");
      // Full gross remains eligible (no commission deduction).
      expect(summary.body.payout.eligibleUnallocated.netTotal).toBe(100);
    });
  });

  test("a paid seller_pays batch does not count toward deductedPaid", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const buyer = await makeUser("customer");
      const sp = await makeSeller(10, "seller_pays");

      const o1 = await placeCODDelivered(admin, buyer, { user: sp.user, product: sp.product });
      const c1 = await findCollection(o1._id);
      await verifyCollection(admin, c1, 100);

      const p1 = await request(app, "POST", "/api/sellers/admin/payouts", {
        token: tokenFor(admin),
        body: { seller: sp.user._id, collectionIds: [c1._id] },
      });
      expect(p1.status).toBe(201);
      expect(p1.body.payout.commissionAmount).toBe(0);

      // Force due + mark paid.
      await SellerPayout.updateOne({ _id: p1.body.payout._id }, { $set: { payoutDueAt: new Date() } });
      await processPayoutCron();
      const mp = await request(app, "PUT", `/api/sellers/admin/payouts/${p1.body.payout._id}/mark-paid`, {
        token: tokenFor(admin),
        body: { paymentRef: "BANK-9" },
      });
      expect(mp.status).toBe(200);

      const bal = await request(app, "GET", "/api/sellers/commission/balance", {
        token: tokenFor(sp.user),
      });
      // grossDue 100, deductedPaid stays 0 even though the payout is paid,
      // so the seller's separate commission obligation is untouched.
      expect(bal.body.balance.deductedPaid).toBe(0);
      expect(bal.body.balance.grossDue).toBe(100);
    });
  });
});

describe("admin commission mode gate on submit", () => {
  test("switching a seller to deduct blocks new submissions even after prior seller_pays use", async () => {
    await retryTest(async () => {
      const { user, seller } = await makeSeller(10, "seller_pays");
      await request(app, "POST", "/api/sellers/commission/payments", {
        token: tokenFor(user),
        body: { ...periodDates(), paidAmount: 5 },
      });
      seller.commissionMode = "deduct";
      await seller.save();

      const r = await request(app, "POST", "/api/sellers/commission/payments", {
        token: tokenFor(user),
        body: { ...periodDates(), paidAmount: 5, note: "dup period but deduct mode" },
      });
      expect(r.status).toBe(400);
    });
  });
});
