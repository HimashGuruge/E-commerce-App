import { describe, it, expect, beforeAll, beforeEach, afterAll, jest } from "@jest/globals";
import express from "express";
import jwt from "jsonwebtoken";

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

// Router is imported here (not statically) so the test app owns its wiring;
// the controller's own imports are unaffected by this ordering.
import userRouter from "../routes/usersRouter.js";

let app = null;

beforeAll(async () => {
  await connectDb();
  app = buildTestApp();
  await startServer(app);
});

beforeEach(async () => {
  await resetCollections();
});

afterAll(async () => {
  if (app) await stopServer(app);
  await disconnectDb();
});

function buildTestApp() {
  const a = buildApp();
  a.use("/api/users", userRouter);
  // Mirror server.js's JSON error handler (status set by the controller wins).
  a.use((err, _req, res, _next) => {
    const status = res.statusCode >= 400 ? res.statusCode : err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  });
  return a;
}

// createNewUser hashes on save, so we can mint a real JWT straight from the
// model without going through the login endpoint.
async function makeUserWithToken(overrides = {}) {
  const user = await User.create({
    name: "Change PW User",
    email: `changepw${Date.now()}${Math.random().toString(16).slice(2)}@example.com`,
    password: "OldPass123!",
    ...overrides,
  });
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  return { user, token };
}

const PUT = "/api/users/me/password";

describe("PUT /api/users/me/password", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app, "put", PUT, {
      body: { currentPassword: "OldPass123!", newPassword: "NewPass999!", confirmPassword: "NewPass999!" },
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(String(res.body.error)).toBeTruthy();
  });

  it("rejects missing fields", async () => {
    const { token } = await makeUserWithToken();
    const res = await request(app, "put", PUT, { token, body: { newPassword: "NewPass999!" } });
    expect(res.status).toBe(400);
  });

  it("rejects a weak new password (fewer than 6 characters)", async () => {
    const { token } = await makeUserWithToken();
    const res = await request(app, "put", PUT, {
      token,
      body: { currentPassword: "OldPass123!", newPassword: "abc", confirmPassword: "abc" },
    });
    expect(res.status).toBe(400);
  });

  it("rejects a non-matching confirm password", async () => {
    const { token } = await makeUserWithToken();
    const res = await request(app, "put", PUT, {
      token,
      body: { currentPassword: "OldPass123!", newPassword: "NewPass999!", confirmPassword: "OtherPass777!" },
    });
    expect(res.status).toBe(400);
  });

  it("rejects a wrong current password and leaves the password untouched", async () => {
    const { user, token } = await makeUserWithToken();
    const before = (await User.findById(user._id)).password;

    const res = await request(app, "put", PUT, {
      token,
      body: { currentPassword: "WrongPass1!", newPassword: "NewPass999!", confirmPassword: "NewPass999!" },
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Current password is incorrect");
    expect((await User.findById(user._id)).password).toBe(before);
  });

  it("rejects keeping the same password", async () => {
    const { token } = await makeUserWithToken();
    const res = await request(app, "put", PUT, {
      token,
      body: { currentPassword: "OldPass123!", newPassword: "OldPass123!", confirmPassword: "OldPass123!" },
    });
    expect(res.status).toBe(400);
  });

  it("changes the password for a local-password account and stores a new bcrypt hash", async () => {
    const { user, token } = await makeUserWithToken();
    const before = (await User.findById(user._id)).password;

    const res = await request(app, "put", PUT, {
      token,
      body: { currentPassword: "OldPass123!", newPassword: "NewPass999!", confirmPassword: "NewPass999!" },
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: "Password changed successfully" });

    const stored = await User.findById(user._id);
    expect(stored.password).toMatch(/^\$2[aby]\$/);
    expect(stored.password).not.toBe(before);
    expect(await stored.matchPassword("NewPass999!")).toBe(true);
    expect(await stored.matchPassword("OldPass123!")).toBe(false);
  });

  it("works for the Main Admin, sellers, and other roles (token-identified user only)", async () => {
    for (const extra of [
      { role: "admin", isMainAdmin: true },
      { role: "seller" },
    ]) {
      const { user, token } = await makeUserWithToken(extra);

      const res = await request(app, "put", PUT, {
        token,
        body: { currentPassword: "OldPass123!", newPassword: "FreshPass88!", confirmPassword: "FreshPass88!" },
      });
      expect(res.status).toBe(200);

      const stored = await User.findById(user._id);
      expect(await stored.matchPassword("FreshPass88!")).toBe(true);
      expect(stored.role).toBe(extra.role);
      if (extra.isMainAdmin) expect(stored.isMainAdmin).toBe(true);
    }
  });

  it("refuses Google-only accounts with a clear message and changes nothing", async () => {
    const user = await User.create({
      name: "Google Only",
      email: `googlonly${Date.now()}@example.com`,
      googleId: "google-id-456",
    });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

    const res = await request(app, "put", PUT, {
      token,
      body: { currentPassword: "AnyCurrent1", newPassword: "NewPass999!", confirmPassword: "NewPass999!" },
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("This account uses Google sign-in and has no password to change");

    const stored = await User.findById(user._id);
    expect(stored.password ?? null).toBeNull();
  });

  it("returns no password or hash in the response body", async () => {
    const { token } = await makeUserWithToken();
    const res = await request(app, "put", PUT, {
      token,
      body: { currentPassword: "OldPass123!", newPassword: "Leaky99999!", confirmPassword: "Leaky99999!" },
    });
    expect(res.status).toBe(200);
    const json = JSON.stringify(res.body);
    expect(Object.keys(res.body).sort()).toEqual(["message", "success"]);
    // No password value, hash, or token field may leak out of the response.
    expect(json).not.toContain("Leaky99999!");
    expect(json).not.toContain("OldPass123!");
    expect(json).not.toMatch(/\$2[aby]\$/);
    expect(json).not.toContain("resetPasswordToken");
  });

  it("allows a subsequent change using the new password (no double-hash breakage)", async () => {
    const { user, token } = await makeUserWithToken();
    await request(app, "put", PUT, {
      token,
      body: { currentPassword: "OldPass123!", newPassword: "StepOne999!", confirmPassword: "StepOne999!" },
    });
    const res = await request(app, "put", PUT, {
      token,
      body: { currentPassword: "StepOne999!", newPassword: "StepTwo888!", confirmPassword: "StepTwo888!" },
    });
    expect(res.status).toBe(200);
    const stored = await User.findById(user._id);
    expect(await stored.matchPassword("StepTwo888!")).toBe(true);
  });
});

// Sanity check on the hashing pipeline used by the model hook: a bcrypt hash
// is produced by save, and bcrypt.compare works on it.
it("User model hashes passwords once on save (bcrypt, 10 rounds)", async () => {
  const user = await User.create({
    name: "Hook User",
    email: `hook${Date.now()}@example.com`,
    password: "HookPass1!",
  });
  expect(user.password).toMatch(/^\$2[aby]\$10\$/);
  expect(await user.matchPassword("HookPass1!")).toBe(true);
  // A second save that changes other fields (but not the password) must not
  // re-hash the stored value.
  user.name = "Hook User Renamed";
  await user.save();
  expect(user.password).toMatch(/^\$2[aby]\$10\$/);
  expect(await user.matchPassword("HookPass1!")).toBe(true);
});


