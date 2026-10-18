import { describe, it, expect, beforeAll, beforeEach, afterAll, jest } from "@jest/globals";
import express from "express";
import crypto from "crypto";

// The test-harness mongod can wedge mid-run on some Windows machines; the
// setup helper detects that and respawns a fresh instance (up to 3 per
// reset). Allow room for the recovery path so a single wedge doesn't
// cascade into hook timeouts.
jest.setTimeout(90_000);

import User from "../models/User.js";

import {
  connectDb,
  disconnectDb,
  resetCollections,
  buildApp,
  startServer,
  stopServer,
  request,
} from "./helpers/setup.js";

// ---------------------------------------------------------------------------
// Mailer mock — MUST be registered before the router is imported, because the
// users controller statically imports sendEmail/sendLoginAlert. The mock lets
// us capture the reset link (and thus the plaintext token) without any real
// SMTP delivery, and simulate delivery failures on demand.
// ---------------------------------------------------------------------------
const emailCalls = [];
let failNext = false;

const mailerMock = {
  sendEmail: (opts) => {
    emailCalls.push(opts);
    if (failNext) {
      failNext = false;
      return Promise.reject(new Error("SMTP connection refused"));
    }
    return Promise.resolve({ accepted: [opts.to] });
  },
  sendLoginAlert: () => Promise.resolve(),
};

jest.unstable_mockModule("../utils/mailer.js", () =>
  Promise.resolve(mailerMock)
);

// The env config reads JWT_SECRET at module load time; pin it to the same
// value the test harness uses before the controller graph is imported.
process.env.JWT_SECRET = "test-jwt-secret";

const { default: userRouter } = await import("../routes/usersRouter.js");

const FORGOT_MESSAGE =
  "If this email address is registered, a password reset link has been sent to it.";

let app = null;

beforeAll(async () => {
  await connectDb();
  app = buildTestApp();
  await startServer(app);
});

beforeEach(async () => {
  await resetCollections();
  emailCalls.length = 0;
  failNext = false;
});

afterAll(async () => {
  if (app) await stopServer(app);
  await disconnectDb();
});

function buildTestApp() {
  const a = express();
  a.use(express.json());
  a.use("/api/users", userRouter);
  // Mirror server.js's JSON error handler: controllers set res.status()
  // before throwing, so that status wins over err.status, and the body
  // key is "error" (not "message").
  a.use((err, _req, res, _next) => {
    const status = res.statusCode >= 400 ? res.statusCode : err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  });
  return a;
}

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

async function makeLocalUser(overrides = {}) {
  return User.create({
    name: "Reset User",
    email: `forgot${Date.now()}${Math.random().toString(16).slice(2)}@example.com`,
    password: "OldPass123!",
    ...overrides,
  });
}

/** Request a reset and pull the plaintext token out of the emailed link. */
async function issueReset(email) {
  const res = await request(app, "post", "/api/users/forgot-password", {
    body: { email },
  });
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ success: true, message: FORGOT_MESSAGE });
  const link = emailCalls.find((c) => c.to === email);
  const match = link?.html?.match(/reset-password\/([a-f0-9]{40})\?expires=\d+/);
  if (!match) throw new Error("expected a reset link in the captured email");
  return match[1];
}

describe("POST /api/users/forgot-password", () => {
  it("issues a hashed 10-minute token and emails the reset link for a local-password account", async () => {
    const user = await makeLocalUser();
    const token = await issueReset(user.email);

    const stored = await User.findById(user._id);
    // Only the SHA-256 hash of the emailed token is stored — never plaintext.
    expect(stored.resetPasswordToken).toBe(sha256(token));
    expect(stored.resetPasswordToken).toMatch(/^[a-f0-9]{64}$/);

    const now = Date.now();
    const expireMs = new Date(stored.resetPasswordExpire).getTime();
    expect(expireMs).toBeGreaterThan(now);
    expect(expireMs).toBeLessThanOrEqual(now + 10 * 60 * 1000 + 2000);
  });

  it("answers identically for an unknown email (no account enumeration, no email)", async () => {
    const countBefore = await User.countDocuments();
    emailCalls.length = 0;

    const res = await request(app, "post", "/api/users/forgot-password", {
      body: { email: "nobody-known@nowhere.test" },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: FORGOT_MESSAGE });
    expect(emailCalls).toHaveLength(0);
    expect(await User.countDocuments()).toBe(countBefore);
  });

  it("answers identically for a Google-only account without storing any token", async () => {
    const user = await User.create({
      name: "Google User",
      email: `google${Date.now()}@example.com`,
      googleId: "google-id-123",
      // no password field
    });

    const res = await request(app, "post", "/api/users/forgot-password", {
      body: { email: user.email },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: FORGOT_MESSAGE });
    expect(emailCalls).toHaveLength(0);

    const stored = await User.findById(user._id);
    expect(stored.resetPasswordToken ?? null).toBeNull();
    expect(stored.resetPasswordExpire ?? null).toBeNull();
  });

  it("still answers successfully and keeps the token when email delivery fails", async () => {
    const user = await makeLocalUser();
    failNext = true;

    const res = await request(app, "post", "/api/users/forgot-password", {
      body: { email: user.email },
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: FORGOT_MESSAGE });

    const stored = await User.findById(user._id);
    expect(stored.resetPasswordToken).toMatch(/^[a-f0-9]{64}$/);
    expect(new Date(stored.resetPasswordExpire).getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects a missing/empty email", async () => {
    for (const body of [{}, { email: "" }, { email: "   " }]) {
      const res = await request(app, "post", "/api/users/forgot-password", { body });
      expect(res.status).toBe(400);
    }
  });
});

describe("PUT /api/users/reset-password/:token", () => {
  it("resets the password, stores a bcrypt hash, and makes login work with the new password only", async () => {
    const user = await makeLocalUser(); // password: OldPass123!
    const token = await issueReset(user.email);

    const res = await request(app, "put", `/api/users/reset-password/${token}`, {
      body: { password: "BrandNew99!" },
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: "Password reset successful" });

    const stored = await User.findById(user._id);
    expect(stored.password).toMatch(/^\$2[aby]\$/); // stored as a bcrypt hash
    expect(stored.resetPasswordToken ?? null).toBeNull(); // token invalidated
    expect(stored.resetPasswordExpire ?? null).toBeNull();

    const oldLogin = await request(app, "post", "/api/users/login", {
      body: { email: user.email, password: "OldPass123!" },
    });
    expect(oldLogin.status).toBe(401); // old password no longer works

    const newLogin = await request(app, "post", "/api/users/login", {
      body: { email: user.email, password: "BrandNew99!" },
    });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.token).toBeDefined();
  });

  it("rejects a reused token", async () => {
    const user = await makeLocalUser();
    const token = await issueReset(user.email);

    const first = await request(app, "put", `/api/users/reset-password/${token}`, {
      body: { password: "FirstPass99!" },
    });
    expect(first.status).toBe(200);

    const second = await request(app, "put", `/api/users/reset-password/${token}`, {
      body: { password: "SecondPass99!" },
    });
    expect(second.status).toBe(400);
    expect(second.body.error).toBe("Invalid or expired token");
  });

  it("rejects an expired token", async () => {
    const user = await makeLocalUser();
    const token = "e".repeat(40);
    await User.updateOne(
      { _id: user._id },
      {
        resetPasswordToken: sha256(token),
        resetPasswordExpire: new Date(Date.now() - 60 * 1000),
      }
    );

    const res = await request(app, "put", `/api/users/reset-password/${token}`, {
      body: { password: "ExpiredPass99!" },
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid or expired token");
  });

  it("rejects a garbage token", async () => {
    const res = await request(app, "put", "/api/users/reset-password/not-a-token", {
      body: { password: "AnyPass999!" },
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid or expired token");
  });

  it("rejects weak new passwords", async () => {
    const user = await makeLocalUser();
    const token = await issueReset(user.email);

    for (const password of ["short", "lowercaseonly", "password1111", "ALLCAPS1111"]) {
      const res = await request(app, "put", `/api/users/reset-password/${token}`, {
        body: { password },
      });
      expect(res.status).toBe(400);
    }
  });

  it("rejects a missing password", async () => {
    const user = await makeLocalUser();
    const token = await issueReset(user.email);

    const res = await request(app, "put", `/api/users/reset-password/${token}`, {
      body: {},
    });
    expect(res.status).toBe(400);
  });

  it("exposes no password or token data in responses", async () => {
    const user = await makeLocalUser();
    // issueReset already asserts the forgot-password response keys
    // (["message", "success"] only) before returning the plaintext token.
    const token = await issueReset(user.email);

    const resetRes = await request(app, "put", `/api/users/reset-password/${token}`, {
      body: { password: "Exposed999!" },
    });
    expect(resetRes.status).toBe(200);
    expect(Object.keys(resetRes.body).sort()).toEqual(["message", "success"]);
    expect(JSON.stringify(resetRes.body)).not.toContain("resetPasswordToken");
  });

  it("preserves role, status, and Main Admin designation after a reset", async () => {
    const user = await User.create({
      name: "Main Admin",
      email: `mainadmin${Date.now()}@example.com`,
      password: "AdminPass1!",
      role: "admin",
      status: "active",
      isMainAdmin: true,
    });

    const token = await issueReset(user.email);
    await request(app, "put", `/api/users/reset-password/${token}`, {
      body: { password: "Rotated999!" },
    });

    const stored = await User.findById(user._id);
    expect(stored.role).toBe("admin");
    expect(stored.status).toBe("active");
    expect(stored.isMainAdmin).toBe(true);
  });
});
