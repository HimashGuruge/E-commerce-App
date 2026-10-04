import express from 'express';
import {
  // User notifications
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getUnreadCount,
  
  // Admin notifications
  getAdminNotifications,
  markAdminNotificationAsRead,
  markAllAdminNotificationsAsRead,
  getAdminUnreadCount,
  
  // Chat controllers (you need to add these imports)
  getChat,
  replyToUser,
  markUserChatAsRead
} from '../controller/notificationController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// ========== USER NOTIFICATION ROUTES ==========
// These are for regular users (customers)
router.get('/user', authMiddleware, getUserNotifications);                    // Get user notifications
router.get('/unread-count', authMiddleware, getUnreadCount);                  // Get unread count
router.post('/mark-all-read', authMiddleware, markAllAsRead);                 // Mark all as read
router.delete('/clear-all', authMiddleware, clearAllNotifications);           // Clear all notifications
router.patch('/:id/read', authMiddleware, markAsRead);                        // Mark specific as read
router.delete('/:id', authMiddleware, deleteNotification);                    // Delete specific notification

// ========== ADMIN NOTIFICATION ROUTES ==========
// These are for admin dashboard
router.get('/admin/all', authMiddleware, getAdminNotifications);              // Get all user chats for admin
router.get('/admin/unread-count', authMiddleware, getAdminUnreadCount);       // Get admin unread count
router.post('/admin/mark-all-read', authMiddleware, markAllAdminNotificationsAsRead); // Mark all admin as read
router.patch('/admin/:id/read', authMiddleware, markAdminNotificationAsRead); // Mark specific admin notification as read

// ========== CHAT MANAGEMENT ROUTES ==========
// These routes are for admin to interact with specific users
router.get('/admin/chat/:userId', authMiddleware, getChat);                   // Get full chat history with a specific user
router.post('/admin/reply/:userId', authMiddleware, replyToUser);             // Admin reply to a specific user
router.patch('/admin/mark-read/:userId', authMiddleware, markUserChatAsRead); // Mark entire user chat as read

export default router;