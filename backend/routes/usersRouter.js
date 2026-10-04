import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
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

// Admin routes (require authMiddleware)
userRouter.get("/stats/summary", authMiddleware, getUserStats);
userRouter.post("/bulk-action", authMiddleware, bulkUserActions);
userRouter.get("/", authMiddleware, getAllUsers);

// Dynamic routes (must come after specific routes)
userRouter.patch("/:userId/role", authMiddleware, updateUserRole);
userRouter.patch("/:userId/status", authMiddleware, updateUserStatus);
userRouter.put("/:userId", authMiddleware, updateUserInfo);
userRouter.delete("/:userId", authMiddleware, deleteUser);
userRouter.get("/:userId", authMiddleware, getUserByIdHandler);

export default userRouter;