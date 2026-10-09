import { describe, test, expect, jest } from "@jest/globals";
import authMiddleware, { adminOnly } from "../middleware/authMiddleware.js";

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  return res;
};

describe("authMiddleware", () => {
  test("rejects request with no Authorization header", async () => {
    const req = { headers: {} };
    const res = makeRes();
    const next = jest.fn();
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  test("rejects non-Bearer Authorization header", async () => {
    const req = { headers: { authorization: "Basic abc" } };
    const res = makeRes();
    const next = jest.fn();
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("adminOnly", () => {
  test("fails fast on an invalid token before any role check", async () => {
    const req = { headers: { authorization: "Bearer invalid.token.here" } };
    const res = makeRes();
    const next = jest.fn();
    await adminOnly(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
