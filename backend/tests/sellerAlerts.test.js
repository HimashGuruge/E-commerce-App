import {
  connectDb,
  disconnectDb,
  resetCollections,
  startServer,
  stopServer,
  buildApp,
  request,
  makeUser,
  JWT_SECRET,
  retryTest,
} from "./helpers/setup.js";
import Notification from "../models/Notification.js";
import Seller from "../models/Seller.js";
import jwt from "jsonwebtoken";
import { jest } from "@jest/globals";

// The test-harness mongod can wedge mid-run on some Windows machines; the
// setup helper detects that and respawns a fresh instance (up to 3 per
// reset). Allow room for the recovery path so a single wedge doesn't
// cascade into hook timeouts.
jest.setTimeout(180_000);

let app;

const tokenFor = (user) => jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);

beforeAll(async () => {
  app = buildApp();
  await startServer(app);
  await connectDb();
});

afterAll(async () => {
  await stopServer(app);
  await disconnectDb();
});

beforeEach(async () => {
  await resetCollections();
});

// Helpers
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

// ---------------------------------------------------------------------------
// Access control on POST /api/notifications/admin/seller/:userId
// ---------------------------------------------------------------------------
describe("POST /api/notifications/admin/seller/:userId (admin only)", () => {
  test("unauthenticated request is rejected (403 - project convention for adminOnly)", async () => {
    await retryTest(async () => {
      const r = await request(app, "POST", "/api/notifications/admin/seller/123", {
        body: { title: "T", message: "M" },
      });
      expect(r.status).toBe(403);
    });
  });

  test("buyer (customer) token is rejected (403)", async () => {
    await retryTest(async () => {
      const buyer = await makeUser("customer");
      const r = await request(app, "POST", "/api/notifications/admin/seller/123", {
        token: tokenFor(buyer),
        body: { title: "T", message: "M" },
      });
      expect(r.status).toBe(403);
    });
  });

  test("seller token cannot send admin alerts (403)", async () => {
    await retryTest(async () => {
      const seller = await makeSeller("seller");
      const r = await request(app, "POST", "/api/notifications/admin/seller/123", {
        token: tokenFor(seller),
        body: { title: "T", message: "M" },
      });
      expect(r.status).toBe(403);
    });
  });
});

// ---------------------------------------------------------------------------
// Validation on the admin endpoint
// ---------------------------------------------------------------------------
describe("admin alert validation", () => {
  test("invalid seller id (not an ObjectId) -> 400", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const r = await request(app, "POST", "/api/notifications/admin/seller/not-an-id", {
        token: tokenFor(admin),
        body: { title: "T", message: "M" },
      });
      expect(r.status).toBe(400);
    });
  });

  test("valid ObjectId but user is not a registered seller -> 404", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const plainUser = await makeUser("customer");
    const r = await request(app, "POST", `/api/notifications/admin/seller/${plainUser._id}`, {
        token: tokenFor(admin),
        body: { title: "T", message: "M" },
      });
      expect(r.status).toBe(404);
    });
  });

  test("missing title -> 400", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const seller = await makeSeller("seller");
    const r = await request(app, "POST", `/api/notifications/admin/seller/${seller._id}`, {
        token: tokenFor(admin),
        body: { message: "M" },
      });
      expect(r.status).toBe(400);
    });
  });

  test("empty/whitespace title or message -> 400", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const seller = await makeSeller("seller");
    const rTitle = await request(app, "POST", `/api/notifications/admin/seller/${seller._id}`, {
        token: tokenFor(admin),
        body: { title: "   ", message: "M" },
      });
    const rMsg = await request(app, "POST", `/api/notifications/admin/seller/${seller._id}`, {
        token: tokenFor(admin),
        body: { title: "T", message: "" },
      });
      expect(rTitle.status).toBe(400);
      expect(rMsg.status).toBe(400);
    });
  });
});

// ---------------------------------------------------------------------------
// Delivery + persistence
// ---------------------------------------------------------------------------
describe("admin alert delivery to the seller", () => {
  test("admin creates an alert; it is persisted and appears in the seller's list only", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const target = await makeSeller("seller");
      const other = await makeSeller("seller");

    const r = await request(app, "POST", `/api/notifications/admin/seller/${target._id}`, {
        token: tokenFor(admin),
        body: { title: "Stock check", message: "Please restock item X" },
      });
      expect(r.status).toBe(201);
      expect(r.body.success).toBe(true);
      expect(r.body.notification._id).toBeDefined();

      const dbDoc = await Notification.findOne({ _id: r.body.notification._id });
      expect(String(dbDoc.user)).toBe(String(target._id));
      expect(dbDoc.type).toBe("SELLER_ALERT");
      expect(dbDoc.read).toBe(false);

      // Intended seller sees it
      const targetList = await request(app, "GET", "/api/notifications/seller", {
        token: tokenFor(target),
      });
      expect(targetList.status).toBe(200);
      expect(targetList.body.unreadCount).toBe(1);
      expect(targetList.body.alerts).toHaveLength(1);
      expect(targetList.body.alerts[0].title).toBe("Stock check");

      // A different seller does NOT see it
      const otherList = await request(app, "GET", "/api/notifications/seller", {
        token: tokenFor(other),
      });
      expect(otherList.status).toBe(200);
      expect(otherList.body.alerts).toHaveLength(0);
      expect(otherList.body.unreadCount).toBe(0);

      // A plain buyer cannot even list seller alerts
      const buyer = await makeUser("customer");
      const buyerList = await request(app, "GET", "/api/notifications/seller", {
        token: tokenFor(buyer),
      });
      expect(buyerList.status).toBe(403);
    });
  });

  test("alert persists across reconnection (DB-backed)", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const target = await makeSeller("seller");
    const r = await request(app, "POST", `/api/notifications/admin/seller/${target._id}`, {
        token: tokenFor(admin),
        body: { title: "Offline", message: "Sent while seller offline" },
      });
      expect(r.status).toBe(201);

      // "Reconnect" = a fresh GET afterwards
      const list = await request(app, "GET", "/api/notifications/seller", {
        token: tokenFor(target),
      });
      expect(list.body.unreadCount).toBe(1);
      expect(list.body.alerts[0].message).toBe("Sent while seller offline");
    });
  });
});

// ---------------------------------------------------------------------------
// Mark read: own alerts only
// ---------------------------------------------------------------------------
describe("marking seller alerts read", () => {
  test("another seller cannot read/modify the alert", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const target = await makeSeller("seller");
      const other = await makeSeller("seller");

    const r = await request(app, "POST", `/api/notifications/admin/seller/${target._id}`, {
        token: tokenFor(admin),
        body: { title: "T", message: "M" },
      });
      const id = r.body.notification._id;

    const rOther = await request(app, "PATCH", `/api/notifications/seller/read/${id}`, {
        token: tokenFor(other),
      });
      expect(rOther.status).toBe(404);

      const doc = await Notification.findById(id);
      expect(doc.read).toBe(false);
    });
  });

  test("admin cannot mark seller alerts read via the seller endpoint (403)", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const target = await makeSeller("seller");
    const r = await request(app, "POST", `/api/notifications/admin/seller/${target._id}`, {
        token: tokenFor(admin),
        body: { title: "T", message: "M" },
      });
    const rAdmin = await request(app, "PATCH", `/api/notifications/seller/read/${r.body.notification._id}`, {
        token: tokenFor(admin),
      });
      expect(rAdmin.status).toBe(403);
    });
  });

  test("owner marks one alert read: unread count drops from 2 to 1, then mark-all-read to 0", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const target = await makeSeller("seller");

    const r1 = await request(app, "POST", `/api/notifications/admin/seller/${target._id}`, {
        token: tokenFor(admin),
        body: { title: "One", message: "M1" },
      });
    const r2 = await request(app, "POST", `/api/notifications/admin/seller/${target._id}`, {
        token: tokenFor(admin),
        body: { title: "Two", message: "M2" },
      });

      const before = await request(app, "GET", "/api/notifications/seller", {
        token: tokenFor(target),
      });
      expect(before.body.unreadCount).toBe(2);

    const rRead = await request(app, "PATCH", `/api/notifications/seller/read/${r1.body.notification._id}`, {
        token: tokenFor(target),
      });
      expect(rRead.status).toBe(200);

      const after = await request(app, "GET", "/api/notifications/seller", {
        token: tokenFor(target),
      });
      expect(after.body.unreadCount).toBe(1);
      expect(after.body.alerts.find((a) => a.title === "One").read).toBe(true);
      expect(after.body.alerts.find((a) => a.title === "Two").read).toBe(false);

      const rAll = await request(app, "POST", "/api/notifications/seller/mark-all-read", {
        token: tokenFor(target),
      });
      expect(rAll.status).toBe(200);

      const final = await request(app, "GET", "/api/notifications/seller", {
        token: tokenFor(target),
      });
      expect(final.body.unreadCount).toBe(0);
      expect(final.body.alerts.every((a) => a.read)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Dedupe: one open alert per seller per title+text
// ---------------------------------------------------------------------------
describe("duplicate open seller alerts are deduplicated", () => {
  test("same title + message twice -> no second row; response flags deduplicated", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const target = await makeSeller("seller");

      const r1 = await request(app, "POST", `/api/notifications/admin/seller/${target._id}`, {
        token: tokenFor(admin),
        body: { title: "Restock", message: "Please restock item X" },
      });
      expect(r1.status).toBe(201);
      expect(r1.body.deduplicated).toBe(false);

      const r2 = await request(app, "POST", `/api/notifications/admin/seller/${target._id}`, {
        token: tokenFor(admin),
        body: { title: "Restock", message: "Please restock item X" },
      });
      expect(r2.status).toBe(201);
      expect(r2.body.deduplicated).toBe(true);
      expect(String(r2.body.notification._id)).toBe(String(r1.body.notification._id));

      const list = await request(app, "GET", "/api/notifications/seller", {
        token: tokenFor(target),
      });
      expect(list.body.unreadCount).toBe(1);
      expect(list.body.alerts).toHaveLength(1);
    });
  });

  test("different text under the same title -> both alerts kept", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const target = await makeSeller("seller");

      const a = await request(app, "POST", `/api/notifications/admin/seller/${target._id}`, {
        token: tokenFor(admin),
        body: { title: "Product Rejected", message: `Your product "A" was rejected and removed from the marketplace.` },
      });
      const b = await request(app, "POST", `/api/notifications/admin/seller/${target._id}`, {
        token: tokenFor(admin),
        body: { title: "Product Rejected", message: `Your product "B" was rejected and removed from the marketplace.` },
      });
      expect(a.body.deduplicated).toBe(false);
      expect(b.body.deduplicated).toBe(false);
      expect(String(a.body.notification._id)).not.toBe(String(b.body.notification._id));

      const list = await request(app, "GET", "/api/notifications/seller", {
        token: tokenFor(target),
      });
      expect(list.body.unreadCount).toBe(2);
    });
  });

  test("after the alert is read, the same title + message can be sent again", async () => {
    await retryTest(async () => {
      const admin = await makeUser("admin");
      const target = await makeSeller("seller");

      const r1 = await request(app, "POST", `/api/notifications/admin/seller/${target._id}`, {
        token: tokenFor(admin),
        body: { title: "Restock", message: "Please restock item X" },
      });

      const rRead = await request(app, "PATCH", `/api/notifications/seller/read/${r1.body.notification._id}`, {
        token: tokenFor(target),
      });
      expect(rRead.status).toBe(200);

      const r2 = await request(app, "POST", `/api/notifications/admin/seller/${target._id}`, {
        token: tokenFor(admin),
        body: { title: "Restock", message: "Please restock item X" },
      });
      expect(r2.status).toBe(201);
      expect(r2.body.deduplicated).toBe(false);
    });
  });
});
