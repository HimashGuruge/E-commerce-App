import express from 'express';
import {
  // User notifications
  getUserNotifications,
  replyToSellerAlert,
  getNotificationById,
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
  markUserChatAsRead,
  getReviewEligibility,

  // Admin -> Seller alerts
  adminSendSellerAlert,
  getSellerAlerts,
  markSellerAlertRead,
  markAllSellerAlertsRead
} from '../controller/notificationController.js';
import authMiddleware, { adminOnly, sellerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// ========== USER NOTIFICATION ROUTES ==========
router.get('/user', authMiddleware, getUserNotifications);                    // Get user notifications
router.get('/review-eligibility/:productId', authMiddleware, getReviewEligibility); // Check review eligibility
router.get('/unread-count', authMiddleware, getUnreadCount);                  // Get unread count
router.get('/seller', sellerOnly, getSellerAlerts);                          // Seller's alerts, newest first
router.get('/:id', authMiddleware, getNotificationById);                      // Get single notification (own docs only)
router.post('/mark-all-read', authMiddleware, markAllAsRead);                 // Mark all as read
router.delete('/clear-all', authMiddleware, clearAllNotifications);           // Clear all notifications
router.patch('/:id/read', authMiddleware, markAsRead);                        // Mark specific as read
router.delete('/:id', authMiddleware, deleteNotification);                    // Delete specific notification

// ========== ADMIN -> SELLER ALERT ROUTES ==========
router.post('/admin/seller/:userId', adminOnly, adminSendSellerAlert);        // Admin sends an alert to a specific seller
router.post('/seller/reply/:id', sellerOnly, replyToSellerAlert);             // Seller replies to one own alert (shows in admin Notification center)
router.post('/seller/mark-all-read', sellerOnly, markAllSellerAlertsRead);    // Seller marks all own alerts read
router.patch('/seller/read/:id', sellerOnly, markSellerAlertRead);            // Seller marks one own alert read
router.get('/seller', sellerOnly, getSellerAlerts);                          // Seller's alerts, newest first

// ========== ADMIN NOTIFICATION ROUTES ==========
// These are for admin dashboard
router.get('/admin/all', adminOnly, getAdminNotifications);              // Get all user chats for admin
router.get('/admin/unread-count', adminOnly, getAdminUnreadCount);       // Get admin unread count
router.post('/admin/mark-all-read', adminOnly, markAllAdminNotificationsAsRead); // Mark all admin as read
router.patch('/admin/:id/read', adminOnly, markAdminNotificationAsRead); // Mark specific admin notification as read

// ========== CHAT MANAGEMENT ROUTES ==========
// These routes are for admin to interact with specific users
router.get('/admin/chat/:userId', adminOnly, getChat);                   // Get full chat history with a specific user
router.post('/admin/reply/:userId', adminOnly, replyToUser);             // Admin reply to a specific user
router.patch('/admin/mark-read/:userId', adminOnly, markUserChatAsRead); // Mark entire user chat as read

export default router;