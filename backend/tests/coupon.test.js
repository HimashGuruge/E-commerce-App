import { evaluateCoupon } from "../utils/couponService.js";
import { validateCouponPayload } from "../controller/couponController.js";
import {
  connectDb,
  disconnectDb,
  resetCollections,
  buildApp,
  startServer,
  stopServer,
  request,
  makeProduct,
  retryTest,
} from "./helpers/setup.js";

import Coupon from "../models/Coupon.js";
import Order from "../models/Order.js";
import { recordCouponUse } from "../utils/couponService.js";
import { jest } from "@jest/globals";

// The test-harness mongod can wedge mid-run on some Windows machines; the
// setup helper detects that and respawns a fresh instance (up to 3 per
// reset). Allow room for the recovery path so a single wedge doesn't
// cascade into hook timeouts.
jest.setTimeout(180_000);

const mkCoupon = (overrides = {}) => ({
  code: "TEST",
  discountType: "percent",
  discountValue: 10,
  maxDiscountAmount: 0,
  minOrderAmount: 0,
  maxUses: 0,
  usedCount: 0,
  expiresAt: null,
  active: true,
  ...overrides,
});

describe("evaluateCoupon (pure math)", () => {
  test("percent without cap", async () => {
    await retryTest(async () => {
      expect(evaluateCoupon(mkCoupon(), 1000, 330)).toEqual({
        ok: true,
        discount: 100,
        shippingDiscount: 0,
      });
    });
  });

  test("percent capped by maxDiscountAmount", async () => {
    await retryTest(async () => {
      expect(
        evaluateCoupon(mkCoupon({ discountValue: 50, maxDiscountAmount: 200 }), 1000)
      ).toEqual({ ok: true, discount: 200, shippingDiscount: 0 });
    });
  });

  test("percent never exceeds subtotal", async () => {
    await retryTest(async () => {
      expect(evaluateCoupon(mkCoupon({ discountValue: 90 }), 100)).toEqual({
        ok: true,
        discount: 90,
        shippingDiscount: 0,
      });
    });
  });

  test("fixed value without cap", async () => {
    await retryTest(async () => {
      expect(
        evaluateCoupon(mkCoupon({ discountType: "fixed", discountValue: 300 }), 1000)
      ).toEqual({ ok: true, discount: 300, shippingDiscount: 0 });
    });
  });

  test("fixed value capped at subtotal", async () => {
    await retryTest(async () => {
      expect(
        evaluateCoupon(mkCoupon({ discountType: "fixed", discountValue: 500 }), 200)
      ).toEqual({ ok: true, discount: 200, shippingDiscount: 0 });
    });
  });

  test("freeshipping waives the shipping cost", async () => {
    await retryTest(async () => {
      expect(
        evaluateCoupon(mkCoupon({ discountType: "freeshipping" }), 1000, 330)
      ).toEqual({ ok: true, discount: 0, shippingDiscount: 330 });
    });
  });

  test("inactive coupon rejected", async () => {
    await retryTest(async () => {
      expect(evaluateCoupon(mkCoupon({ active: false }), 1000).ok).toBe(false);
    });
  });

  test("expired coupon rejected", async () => {
    await retryTest(async () => {
      expect(
        evaluateCoupon(mkCoupon({ expiresAt: new Date(Date.now() - 60000) }), 1000).ok
      ).toBe(false);
    });
  });

  test("coupon at usage limit rejected", async () => {
    await retryTest(async () => {
      const r = evaluateCoupon(mkCoupon({ maxUses: 5, usedCount: 5 }), 1000);
      expect(r.ok).toBe(false);
      expect(r.message).toMatch(/usage limit/i);
    });
  });

  test("minimum order amount enforced", async () => {
    await retryTest(async () => {
      const r = evaluateCoupon(mkCoupon({ minOrderAmount: 1000 }), 300);
      expect(r.ok).toBe(false);
      expect(r.message).toMatch(/Minimum order amount/i);
    });
  });

  test("missing coupon rejected", async () => {
    await retryTest(async () => {
      expect(evaluateCoupon(null, 1000).ok).toBe(false);
    });
  });
});

describe("validateCouponPayload (admin input)", () => {
  test("accepts a valid percent payload and normalises code", async () => {
    await retryTest(async () => {
      const data = { code: "save10", discountType: "percent", discountValue: "10" };
      expect(validateCouponPayload(data)).toEqual([]);
      expect(data.code).toBe("SAVE10");
      expect(data.discountValue).toBe(10);
    });
  });

  test("rejects invalid code characters/length", async () => {
    await retryTest(async () => {
      expect(validateCouponPayload({ code: "ab", discountType: "percent", discountValue: 10 }).length).toBeGreaterThan(0);
      expect(validateCouponPayload({ code: "SAVE 10!", discountType: "percent", discountValue: 10 }).length).toBeGreaterThan(0);
    });
  });

  test("rejects percent out of range", async () => {
    await retryTest(async () => {
      expect(validateCouponPayload({ code: "TEST", discountType: "percent", discountValue: 150 }).length).toBeGreaterThan(0);
      expect(validateCouponPayload({ code: "TEST", discountType: "percent", discountValue: 0 }).length).toBeGreaterThan(0);
    });
  });

  test("rejects bad discountType", async () => {
    await retryTest(async () => {
      expect(validateCouponPayload({ code: "TEST", discountType: "bogus" }).length).toBeGreaterThan(0);
    });
  });

  test("fixed type requires a positive value", async () => {
    await retryTest(async () => {
      expect(validateCouponPayload({ code: "TEST", discountType: "fixed", discountValue: 0 }).length).toBeGreaterThan(0);
      const data = { code: "TEST", discountType: "fixed", discountValue: "250" };
      expect(validateCouponPayload(data)).toEqual([]);
      expect(data.discountValue).toBe(250);
    });
  });

  test("freeshipping forces discountValue to 0", async () => {
    await retryTest(async () => {
      const data = { code: "TEST", discountType: "freeshipping", discountValue: 123 };
      expect(validateCouponPayload(data)).toEqual([]);
      expect(data.discountValue).toBe(0);
    });
  });
});

describe("coupon endpoint + recordCouponUse (integration)", () => {
  let app;

  beforeAll(async () => {
    await connectDb();
    await resetCollections();
  });

  beforeEach(async () => {
    await Coupon.deleteMany({});
    await Order.deleteMany({});
  });

  afterAll(async () => {
    await stopServer(app);
    await disconnectDb();
  });

  const makeQuoteApp = async () => {
    app = await startServer(buildApp());
    return app;
  };

  const createCoupon = async (overrides = {}) => {
    return Coupon.create(mkCoupon({ code: `C${Date.now()}${Math.floor(Math.random() * 1e6)}`, ...overrides }));
  };

  test("quote without coupon: totals + shipping (fallback rates)", async () => {
    await retryTest(async () => {
      const product = await makeProduct(); // price 100
      app = await makeQuoteApp();
      const res = await request(app, "POST", "/api/orders/quote", {
        body: { orderedItems: [{ productId: String(product._id), qty: 3 }] },
      });
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(300);
      expect(res.body.shipping).toBe(330); // 300 < 10000 threshold
      expect(res.body.coupon).toBeNull();
      expect(res.body.couponError).toBeNull();
      expect(res.body.orderedItems).toHaveLength(1);
    });
  });

  test("quote applies a percent coupon with the cap", async () => {
    await retryTest(async () => {
      const product = await makeProduct(); // price 100
      const coupon = await createCoupon({ code: "SAVE10", discountValue: 10 });
      app = await makeQuoteApp();
      const res = await request(app, "POST", "/api/orders/quote", {
        body: { orderedItems: [{ productId: String(product._id), qty: 3 }], couponCode: "save10" },
      });
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(270); // 300 - 30
      expect(res.body.shipping).toBe(330);
      expect(res.body.coupon).toMatchObject({ code: "SAVE10", discountAmount: 30 });
      expect(res.body.couponError).toBeNull();
      expect(coupon).toBeDefined();
    });
  });

  test("quote with freeshipping coupon zeroes shipping and records the waiver", async () => {
    await retryTest(async () => {
      const product = await makeProduct(); // price 100
      await createCoupon({ code: "FREESHIP", discountType: "freeshipping" });
      app = await makeQuoteApp();
      const res = await request(app, "POST", "/api/orders/quote", {
        body: { orderedItems: [{ productId: String(product._id), qty: 3 }], couponCode: "FREESHIP" },
      });
      expect(res.body.total).toBe(300);
      expect(res.body.shipping).toBe(0);
      expect(res.body.coupon.discountAmount).toBe(330); // waived standard cost
    });
  });

  test("quote with invalid code still returns a valid quote plus couponError", async () => {
    await retryTest(async () => {
      const product = await makeProduct();
      app = await makeQuoteApp();
      const res = await request(app, "POST", "/api/orders/quote", {
        body: { orderedItems: [{ productId: String(product._id), qty: 3 }], couponCode: "NOPE" },
      });
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(300);
      expect(res.body.coupon).toBeNull();
      expect(res.body.couponError).toMatch(/Invalid coupon code/);
    });
  });

  test("quote rejects expired coupon", async () => {
    await retryTest(async () => {
      const product = await makeProduct();
      await createCoupon({ code: "OLD", expiresAt: new Date(Date.now() - 60000) });
      app = await makeQuoteApp();
      const res = await request(app, "POST", "/api/orders/quote", {
        body: { orderedItems: [{ productId: String(product._id), qty: 3 }], couponCode: "OLD" },
      });
      expect(res.body.total).toBe(300);
      expect(res.body.couponError).toMatch(/expired/i);
    });
  });

  test("quote rejects coupon below min order amount", async () => {
    await retryTest(async () => {
      const product = await makeProduct();
      await createCoupon({ code: "BIG50", discountValue: 50, minOrderAmount: 1000 });
      app = await makeQuoteApp();
      const res = await request(app, "POST", "/api/orders/quote", {
        body: { orderedItems: [{ productId: String(product._id), qty: 3 }], couponCode: "BIG50" },
      });
      expect(res.body.total).toBe(300);
      expect(res.body.couponError).toMatch(/Minimum order amount/i);
    });
  });

  test("quote accepts the admin items+quantity fallback shape", async () => {
    await retryTest(async () => {
      const product = await makeProduct();
      app = await makeQuoteApp();
      const res = await request(app, "POST", "/api/orders/quote", {
        body: { items: [{ productId: String(product._id), quantity: 2 }] },
      });
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(200);
    });
  });

  test("recordCouponUse increments usedCount exactly once (race-safe)", async () => {
    await retryTest(async () => {
      const coupon = await createCoupon({ code: "COUNT", maxUses: 10 });
      const user = await makeUserForTest();
      const order = await Order.create({
        user: user._id,
        items: [{ quantity: 1, price: 100 }],
        shippingAddress: {},
        paymentMethod: "cod",
        totalPrice: 100,
        coupon: { _id: coupon._id, code: coupon.code, discountType: "percent", discountValue: 10, discountAmount: 10 },
        couponCounted: false,
      });

      expect(await recordCouponUse(order)).toBe(true);
      expect(await recordCouponUse(order)).toBe(false); // second call must be a no-op

      const fresh = await Order.findById(order._id);
      expect(fresh.couponCounted).toBe(true);
      expect((await Coupon.findById(coupon._id)).usedCount).toBe(1);
    });
  });

  test("recordCouponUse respects maxUses headroom", async () => {
    await retryTest(async () => {
      const coupon = await createCoupon({ code: "LIMIT", maxUses: 1, usedCount: 1 });
      const user = await makeUserForTest();
      const order = await Order.create({
        user: user._id,
        items: [{ quantity: 1, price: 100 }],
        shippingAddress: {},
        paymentMethod: "cod",
        totalPrice: 100,
        coupon: { _id: coupon._id, code: coupon.code, discountType: "percent", discountValue: 10, discountAmount: 10 },
      });
      await recordCouponUse(order);
      expect((await Coupon.findById(coupon._id)).usedCount).toBe(1); // no increment past the limit
    });
  });
});

// Local helper so we avoid importing makeUser (needs the User model chain) in beforeAll order
async function makeUserForTest() {
  const { makeUser } = await import("./helpers/setup.js");
  return makeUser("customer");
}
