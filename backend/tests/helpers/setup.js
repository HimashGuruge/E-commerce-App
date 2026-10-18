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

/**
 * Resilience helpers.
 *
 * On some Windows machines a freshly spawned mongod can wedge after a few
 * operations: the process stays alive and accepts TCP connections but never
 * processes them, so driver operations hang indefinitely (the driver's
 * socketTimeoutMS is disabled by default). When detected, the wedged
 * instance is torn down and a fresh one is spawned before retrying. Each
 * operation gets up to MAX_MONGOD_RESTARTS fresh instances.
 */
const WEDGE_WATCHDOG_MS = 12000;
const MAX_MONGOD_RESTARTS = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Await a driver operation with a hard client-side deadline. */
async function raceWithDeadline(promise, ms, label) {
  let timer;
  const watchdog = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label}: test mongod unresponsive after ${ms}ms`)),
      ms
    );
    if (timer.unref) timer.unref();
  });
  try {
    return await Promise.race([promise, watchdog]);
  } finally {
    clearTimeout(timer);
    // The losing promise may reject later (e.g. after the wedged server is
    // killed); swallow it so it can't surface as an unhandled rejection.
    promise.catch(() => {});
  }
}

async function killProcess(proc) {
  if (!proc) return;
  const pid = proc.pid;
  const waitExit = new Promise((resolve) => {
    proc.once("exit", resolve);
  });
  const tk = spawn("taskkill", ["/pid", String(pid), "/t", "/f"], { stdio: "ignore" });
  const tkDone = new Promise((resolve) => {
    tk.once("exit", resolve);
    tk.unref?.();
  });
  try {
    await raceWithDeadline(Promise.race([waitExit, tkDone]), 5000, "wedged mongod exit");
  } catch {
    try {
      proc.kill();
    } catch {}
  }
}

async function disconnectMongoose() {
  try {
    await raceWithDeadline(mongoose.disconnect(), 5000, "mongoose.disconnect");
  } catch {}
  if (mongoose.connection.readyState !== 0) {
    try {
      mongoose.disconnect();
    } catch {}
  }
}

/** Spawn mongod with a fresh random port + temp dir; wires module state. */
async function spawnMongod() {
  dbPort = await freePort();
  dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "mongotest-"));
  const uri = `mongodb://127.0.0.1:${dbPort}/ecom_test`;

  let stderr = "";
  const proc = spawn(MONGOD_EXE, ["--port", String(dbPort), "--dbpath", dbDir], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  proc.stderr?.on("data", (c) => {
    stderr += c.toString();
  });
  proc.on("exit", () => {
    if (process.env.DEBUG_MONGO) console.error(`[setup] test mongod exited:\n${stderr.slice(-2000)}`);
  });
  mongodProc = proc;
  return { proc, uri };
}

/** Drop a spawned instance: clear module state, disconnect, kill, remove its dir. */
async function cleanupProc(proc) {
  if (mongodProc === proc) mongodProc = null;
  const dir = dbDir;
  dbDir = null;
  dbPort = null;
  await disconnectMongoose();
  await killProcess(proc);
  if (dir) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {}
  }
}

/** Try connecting to one instance until it answers a ping (bounded). */
async function tryConnect(uri) {
  const deadline = Date.now() + 15000;
  for (;;) {
    try {
      if (mongoose.connection.readyState !== 0) await disconnectMongoose();
      // timeoutMS is the per-operation deadline: a wedged server then fails a
      // driver op with a quick MongoTimeoutError (~10s) instead of hanging
      // indefinitely, so recovery stays fast and failures are informative.
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 1500,
        connectTimeoutMS: 1500,
        timeoutMS: 10000,
      });
      await raceWithDeadline(mongoose.connection.db.command({ ping: 1 }), 5000, "initial ping");
      return true;
    } catch (err) {
      if (Date.now() > deadline) return false;
      // A connect may have succeeded but the ping failed — drop the stale
      // connection before the next attempt (connect() rejects on an open one).
      if (mongoose.connection.readyState === 1) await disconnectMongoose();
      await sleep(300);
    }
  }
}

/** Spawn fresh instances until one answers a ping (the first may wedge or never start). */
async function ensureFreshDb() {
  let lastErr = null;
  for (let attempt = 1; attempt <= MAX_MONGOD_RESTARTS; attempt++) {
    const { proc, uri } = await spawnMongod();
    if (await tryConnect(uri)) return mongoose.connection;
    lastErr = new Error(`mongod spawn attempt ${attempt}: server unreachable or wedged`);
    await cleanupProc(proc);
  }
  throw lastErr;
}

/** Tear down the current test mongod and replace it with a healthy fresh one. */
async function respawnTestMongod() {
  const old = mongodProc;
  mongodProc = null;
  const dir = dbDir;
  dbDir = null;
  dbPort = null;
  await disconnectMongoose();
  await killProcess(old);
  if (dir) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {}
  }
  return ensureFreshDb();
}

export async function connectDb() {
  process.env.JWT_SECRET = JWT_SECRET;
  if (mongoose.connection.readyState === 1) {
    // Reuse an existing connection, but make sure the server is responsive.
    try {
      await raceWithDeadline(mongoose.connection.db.command({ ping: 1 }), 5000, "connect ping");
      return mongoose.connection;
    } catch (err) {
      console.error(`[setup] existing test DB unresponsive (${err.message}) — spawning a fresh instance`);
      return respawnTestMongod();
    }
  }
  return ensureFreshDb();
}

export async function disconnectDb() {
  if (mongoose.connection.readyState !== 0) await disconnectMongoose();
  if (mongodProc) {
    const proc = mongodProc;
    const dir = dbDir;
    mongodProc = null;
    dbDir = null;
    dbPort = null;
    await killProcess(proc);
    if (dir) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {}
    }
  }
}

export async function resetCollections() {
  const collections = [User, Product, Variant, Order, Feedback, ReturnRequest, Notification];
  const run = async () => {
    for (const M of collections) {
      await M.deleteMany({});
    }
  };
  let lastErr;
  for (let attempt = 1; attempt <= MAX_MONGOD_RESTARTS; attempt++) {
    try {
      await raceWithDeadline(run(), WEDGE_WATCHDOG_MS, `resetCollections (attempt ${attempt})`);
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_MONGOD_RESTARTS) {
        console.error(`[setup] resetCollections attempt ${attempt} failed (${err.message}) — spawning a fresh test mongod`);
        await respawnTestMongod();
      } else {
        // Final failure: don't leave a (possibly wedged) instance behind.
        await cleanupProc(mongodProc);
      }
    }
  }
  throw lastErr;
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
