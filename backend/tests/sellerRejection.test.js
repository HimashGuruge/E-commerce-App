import { describe, test, expect } from "@jest/globals";
import express from "express";
import jwt from "jsonwebtoken";
import {
  connectDb,
  disconnectDb,
  resetCollections,
  startServer,
  stopServer,
  request,
  makeUser,
  JWT_SECRET,
} from "./helpers/setup.js";
import User from "../models/User.js";
import Seller from "../models/Seller.js";
import sellersRouter from "../routes/sellersRouter.js";

let app;

const tokenFor = (user) => jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);

const makeSeller = async (role = "seller") => {
  const user = await makeUser(role);
  const seller = await Seller.create({
    user: user._id,
    shopName: `Shop ${role} ${Date.now()}`,
    ownerName: `Owner ${role}`,
    ownerPhone: "0771234567",
  });
  return { user, seller };
};

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use("/api/sellers", sellersRouter);
  await startServer(app);
  await connectDb();
});

afterAll(async () => {
  await stopServer(app);
  await disconnectDb();
});

beforeEach(async () => {
  await resetCollections();
  await Seller.deleteMany({});
});

describe("PUT /api/sellers/admin/:id/reject (business logic)", () => {
  test("admin can reject a seller: status stays rejected and reason is stored", async () => {
    const admin = await makeUser("admin");
    const { seller } = await makeSeller("seller");

    const r = await request(app, "PUT", `/api/sellers/admin/${seller._id}/reject`, {
      token: tokenFor(admin),
      body: { reason: "Policy violation" },
    });

    expect(r.status).toBe(200);
    const db = await Seller.findById(seller._id);
    expect(db.status).toBe("rejected");
    expect(db.rejectionReason).toBe("Policy violation");
  });

  test("non-admin cannot reject a seller (403)", async () => {
    const sellerUser = await makeSeller("seller");
    const r = await request(app, "PUT", `/api/sellers/admin/${sellerUser.seller._id}/reject`, {
      token: tokenFor(sellerUser.user),
      body: { reason: "hax" },
    });
    expect(r.status).toBe(403);
  });
});

describe("rejected seller access control (security)", () => {
  test("a rejected seller is blocked from seller-only routes (403)", async () => {
    const admin = await makeUser("admin");
    const { user, seller } = await makeSeller("seller");

    const rejectRes = await request(app, "PUT", `/api/sellers/admin/${seller._id}/reject`, {
      token: tokenFor(admin),
      body: { reason: "Policy violation" },
    });
    expect(rejectRes.status).toBe(200);

    const r = await request(app, "GET", "/api/sellers/dashboard", { token: tokenFor(user) });
    expect(r.status).toBe(403);
  });

  test("a rejected seller's role is downgraded to customer in the DB", async () => {
    const admin = await makeUser("admin");
    const { user, seller } = await makeSeller("seller");

    await request(app, "PUT", `/api/sellers/admin/${seller._id}/reject`, {
      token: tokenFor(admin),
      body: { reason: "Policy violation" },
    });

    const dbUser = await User.findById(user._id);
    expect(dbUser.role).toBe("customer");
  });

  test("a rejected seller cannot update an order status (403)", async () => {
    const admin = await makeUser("admin");
    const { user, seller } = await makeSeller("seller");

    await request(app, "PUT", `/api/sellers/admin/${seller._id}/reject`, {
      token: tokenFor(admin),
      body: { reason: "Policy violation" },
    });

    const r = await request(app, "PUT", "/api/sellers/orders/abc123/status", {
      token: tokenFor(user),
      body: { orderStatus: "shipped" },
    });
    expect(r.status).toBe(403);
  });
});

describe("unchanged behavior for normal users", () => {
  test("an approved seller can still access seller-only routes (200)", async () => {
    const admin = await makeUser("admin");
    const { user, seller } = await makeSeller("customer");

    const approveRes = await request(app, "PUT", `/api/sellers/admin/${seller._id}/approve`, {
      token: tokenFor(admin),
    });
    expect(approveRes.status).toBe(200);

    const r = await request(app, "GET", "/api/sellers/dashboard", { token: tokenFor(user) });
    expect(r.status).toBe(200);
  });

  test("a suspended seller is still blocked from seller-only routes (403)", async () => {
    const admin = await makeUser("admin");
    const { user, seller } = await makeSeller("seller");

    await request(app, "PUT", `/api/sellers/admin/${seller._id}/suspend`, {
      token: tokenFor(admin),
    });

    const r = await request(app, "GET", "/api/sellers/dashboard", { token: tokenFor(user) });
    expect(r.status).toBe(403);
  });

  test("a normal customer is blocked from seller-only routes (403)", async () => {
    const customer = await makeUser("customer");
    const r = await request(app, "GET", "/api/sellers/dashboard", { token: tokenFor(customer) });
    expect(r.status).toBe(403);
  });

  test("an unauthenticated request to a seller-only route is rejected (403 - project convention)", async () => {
    const r = await request(app, "GET", "/api/sellers/dashboard");
    expect(r.status).toBe(403);
  });
});
