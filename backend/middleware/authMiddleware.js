import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";

const authMiddleware = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        res.status(401);
        throw new Error("Not authorized, user not found");
      }
      next();
    } catch (error) {
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

export const adminOnly = asyncHandler(async (req, res, next) => {
  await authMiddleware(req, res, () => {
    if (req.user && req.user.role === "admin") {
      next();
    } else {
      res.status(403);
      throw new Error("Not authorized as admin");
    }
  });
});

export const sellerOnly = asyncHandler(async (req, res, next) => {
  await authMiddleware(req, res, () => {
    if (req.user && req.user.role === "seller") {
      next();
    } else {
      res.status(403);
      throw new Error("Not authorized as seller");
    }
  });
});

export const sellerOrAdmin = asyncHandler(async (req, res, next) => {
  await authMiddleware(req, res, () => {
    if (req.user && (req.user.role === "seller" || req.user.role === "admin")) {
      next();
    } else {
      res.status(403);
      throw new Error("Not authorized");
    }
  });
});

export default authMiddleware;
