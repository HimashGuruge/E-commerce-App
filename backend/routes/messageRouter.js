import express from "express";
import {
  sendUserMessage,
  getUserMessages,
  initializeChat,
  getUserUnreadCount,
  markAdminNotificationsAsRead,
  markUserMessagesAsRead,
  getAdminUnreadCount,
  testGetOrderStatus,
  getSellerConversation,
  sendSellerChatMessage,
} from "../controller/messageController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ User routes
router.post("/sendmessage", authMiddleware, sendUserMessage);
router.get("/getmessages", authMiddleware, getUserMessages);
router.get("/initialize", authMiddleware, initializeChat); // Initialize chat

// ✅ User notification routes
router.get("/admin-unread-count", authMiddleware, getAdminUnreadCount);
router.get("/unread-chat-count", authMiddleware, getUserUnreadCount);
router.post("/mark-admin-read", authMiddleware, markAdminNotificationsAsRead);
router.put("/mark-user-read", authMiddleware, markUserMessagesAsRead);

// ✅ Buyer<->seller chat ("Chat Now" on the product page)
router.get("/seller-conversation/:sellerId", authMiddleware, getSellerConversation);
router.post("/seller/:sellerId", authMiddleware, sendSellerChatMessage);

router.get("/test-order-status", authMiddleware, testGetOrderStatus);

export default router;
