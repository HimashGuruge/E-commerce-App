import express from "express";
import authMiddleware, { adminOnly } from "../middleware/authMiddleware.js";
import {
  changePassword,
  createNewUser,
  forgotPassword,
  getAllUsers,
  getCurrentUserHandler,
  getUserByIdHandler,
  handleGoogleAuth,
  Loginuser,
  resetPassword,
  updateUserInfo,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getUserStats,
  bulkUserActions,
} from "../controller/usersController.js";

const userRouter = express.Router();

// Public routes
userRouter.post("/login", Loginuser);
userRouter.post("/", createNewUser);
userRouter.post("/forgot-password", forgotPassword);
userRouter.put("/reset-password/:token", resetPassword);

// Google OAuth — server-side redirect flow
userRouter.get("/google", handleGoogleAuth);

// Protected routes
userRouter.get("/me", authMiddleware, getCurrentUserHandler);
userRouter.put("/me", authMiddleware, updateUserInfo);
userRouter.put("/me/password", authMiddleware, changePassword);

// Admin routes (require the acting user to actually be an admin)
userRouter.get("/stats/summary", adminOnly, getUserStats);
userRouter.post("/bulk-action", adminOnly, bulkUserActions);
userRouter.get("/", adminOnly, getAllUsers);

// Dynamic routes (must come after specific routes)
userRouter.patch("/:userId/role", adminOnly, updateUserRole);
userRouter.patch("/:userId/status", adminOnly, updateUserStatus);
userRouter.put("/:userId", adminOnly, updateUserInfo);
userRouter.delete("/:userId", adminOnly, deleteUser);
userRouter.get("/:userId", adminOnly, getUserByIdHandler);

export default userRouter;