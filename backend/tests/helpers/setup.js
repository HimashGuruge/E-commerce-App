// Test utilities: a dedicated, disposable mongod instance (never the
// developer's live database) + a minimal Express app wired with the real
// auth middleware and routers under test.
//
// The in-memory-server binary download is unreliable here, so we spawn the
// system mongod (MongoDB 8.2 install at C:\Program Files\MongoDB) with a
// private temp data dir and random port.
import express from "express";
import mongoose from "mongoose";
import fs from "fs";
import os from "os";
import path from "path";
import net from "net";
import { spawn } from "child_process";
import jwt from "jsonwebtoken";

import User from "../../models/User.js";
import Product from "../../models/Product.js";
import Variant from "../../models/Variant.js";
import Order from "../../models/Order.js";
import Feedback from "../../models/Feedback.js";
import ReturnRequest from "../../models/ReturnRequest.js";
import Notification from "../../models/Notification.js";

import authMiddleware from "../../middleware/authMiddleware.js";
import feedbackRouter from "../../routes/feedbackRouter.js";
import notificationRouter from "../../routes/notificationRouter.js";
import orderRouter from "../../routes/orderRouter.js";

export const JWT_SECRET = "test-jwt-secret";

const MONGOD_EXE =
  process.env.TEST_MONGOD_EXE || "C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe";

let mongodProc = null;
let dbPort = null;
let dbDir = null;

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

export async function connectDb() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  process.env.JWT_SECRET = JWT_SECRET;

  dbPort = await freePort();
  dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "mongotest-"));
  const uri = `mongodb://127.0.0.1:${dbPort}/ecom_test`;

  mongodProc = spawn(MONGOD_EXE, ["--port", String(dbPort), "--dbpath", dbDir], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  mongodProc.stderr?.on("data", (c) => {
    stderr += c.toString();
  });
  mongodProc.on("exit", () => {
    if (process.env.DEBUG_MONGO) console.error(stderr);
  });

  // Wait until the server accepts connections.
  const deadline = Date.now() + 30000;
  for (;;) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 1500 });
      break;
    } catch (err) {
      if (Date.now() > deadline) throw new Error(`mongod not ready: ${stderr.slice(-2000)}`);
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return mongoose.connection;
}

export async function disconnectDb() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (mongodProc) {
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        try { mongodProc.kill(); } catch {}
        resolve();
      }, 5000);
      mongodProc.on("exit", () => {
        clearTimeout(t);
        resolve();
      });
      try { mongodProc.kill(); } catch {}
    });
    mongodProc = null;
  }
  if (dbDir) {
    try {
      fs.rmSync(dbDir, { recursive: true, force: true });
    } catch {}
    dbDir = null;
  }
}

export async function resetCollections() {
  const collections = [User, Product, Variant, Order, Feedback, ReturnRequest, Notification];
  for (const M of collections) {
    await M.deleteMany({});
  }
}

/** Build an Express app that mirrors production route wiring. */
export function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/feedback", feedbackRouter);
  app.use("/api/notifications", notificationRouter);
  app.use("/api/orders", orderRouter);
  return app;
}

/** Start the app on an ephemeral port; the handle is kept on app.server. */
export async function startServer(app) {
  app.server = await new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1");
    server.once("listening", () => resolve(server));
  });
  return app;
}

export async function stopServer(app) {
  if (app?.server) {
    await new Promise((resolve) => app.server.close(resolve));
    app.server = null;
  }
}

export const serverUrl = (app) => `http://127.0.0.1:${app.server?.address()?.port}`;

/** Supertest-style request against a running app: returns { status, body }. */
export async function request(app, method, path, { token, body, query } = {}) {
  const url = new URL(path, serverUrl(app));
  if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let parsed;
  const text = await res.text();
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  return { status: res.status, body: parsed };
}

export const makeUser = async (role = "customer") => {
  const u = await User.create({
    name: `Test ${role}`,
    email: `${role}${Date.now()}${Math.random().toString(16).slice(2)}@example.com`,
    password: "password123",
    role,
  });
  return u;
};

export const makeProduct = async (name = "Product") =>
  Product.create({
    name,
    description: "desc",
    price: 100,
    category: "test",
    stock: 10,
  });

export const makeOrder = async (user, products, status = "delivered") => {
  return Order.create({
    user,
    items: products.map((p, i) => ({
      product: p._id,
      name: p.name,
      image: "",
      quantity: 1,
      price: p.price,
      sku: `SKU-${i}`,
    })),
    shippingAddress: { fullName: "T", address: "A", city: "C", state: "S", zip: "1", phone: "0" },
    paymentMethod: "cod",
    paymentStatus: "paid",
    orderStatus: status,
    totalPrice: products.length * 100,
  });
};
