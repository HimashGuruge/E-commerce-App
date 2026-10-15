import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { emitToUser, emitToAdmins } from "../services/socketService.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Notification from "../models/Notification.js";
import Feedback from "../models/Feedback.js";
import Seller from "../models/Seller.js";

export const getUserNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const notifications = await Notification.find({ user: req.user._id })
    .populate("product", "name images")
    .sort({ createdAt: -1 })
    .limit(limit);
  res.json({ success: true, notifications });
});

export const getNotificationById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid notification id");
  }
  const notification = await Notification.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).populate("product", "name images");
  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }
  res.json({ success: true, notification });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    user: req.user._id,
    read: false,
    reviewSubmitted: false,
  });
  res.json({ success: true, count });
});

export const markAsRead = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid notification id");
  }
  // Scope to the requesting user; reading is separate from review completion.
  const result = await Notification.updateOne(
    { _id: req.params.id, user: req.user._id },
    { $set: { read: true } }
  );
  if (result.matchedCount === 0) {
    res.status(404);
    throw new Error("Notification not found");
  }
  res.json({ success: true });
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, read: false },
    { $set: { read: true } }
  );
  res.json({ success: true });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid notification id");
  }
  const result = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!result) {
    res.status(404);
    throw new Error("Notification not found");
  }
  res.json({ success: true });
});

export const clearAllNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ user: req.user._id });
  res.json({ success: true });
});

export const getReviewEligibility = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.isValidObjectId(productId)) {
    res.status(400);
    throw new Error("Invalid product id");
  }
  // Eligible = owns a DELIVERED order containing the product.
  const qualifyingOrder = await Order.findOne({
    user: req.user._id,
    orderStatus: "delivered",
    "items.product": productId,
  });
  const alreadyReviewed = Boolean(
    qualifyingOrder &&
    (await Feedback.exists({ user: req.user._id, product: productId }))
  );
  res.json({
    success: true,
    eligible: !!qualifyingOrder,
    canReview: !!qualifyingOrder && !alreadyReviewed,
    alreadyReviewed,
  });
});

export const getAdminNotifications = asyncHandler(async (req, res) => {
  const users = await Message.aggregate([
    { $match: { isAdmin: false, message: /@admin/i } },
    {
      $lookup: {
        from: "users",
        localField: "sender",
        foreignField: "_id",
        as: "userData",
      },
    },
    { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$sender",
        userId: { $first: "$sender" },
        userName: { $first: { $ifNull: ["$userData.name", "Unknown User"] } },
        userEmail: { $first: { $ifNull: ["$userData.email", ""] } },
        userImage: { $first: { $ifNull: ["$userData.profileImage", null] } },
        message: { $last: "$message" },
        imageUrl: { $last: "$imageUrl" },
        isRead: { $last: "$adminRead" },
        sentAt: { $last: "$createdAt" },
        lastMessage: { $last: "$$ROOT" },
        count: { $sum: 1 },
      },
    },
    { $sort: { sentAt: -1 } },
  ]);
  res.json({ success: true, data: users });
});

export const getAdminUnreadCount = asyncHandler(async (req, res) => {
  const messageCount = await Message.countDocuments({
    isAdmin: false,
    adminRead: false,
    message: /@admin/i,
  });
  res.json({ success: true, count: messageCount });
});

export const markAdminNotificationAsRead = asyncHandler(async (req, res) => {
  await Message.findByIdAndUpdate(req.params.id, { adminRead: true });
  res.json({ success: true });
});

export const markAllAdminNotificationsAsRead = asyncHandler(async (req, res) => {
  await Message.updateMany(
    { isAdmin: false, adminRead: false, message: /@admin/i },
    { $set: { adminRead: true } }
  );
  res.json({ success: true });
});

export const getChat = asyncHandler(async (req, res) => {
  const uid = req.params.userId;
  const messages = await Message.find({
    $or: [
      { sender: uid, isAdmin: false },
      { recipient: uid, isAdmin: true },
      { sender: uid, isAdmin: true },
    ],
  })
    .sort({ createdAt: 1 })
    .lean();

  const enriched = await Promise.all(messages.map(async (msg) => {
    const obj = msg.toObject ? msg.toObject() : { ...msg };
    if (!obj.isAdmin && obj.sender) {
      try {
        const user = await User.findById(obj.sender).select("name profileImage").lean();
        if (user) {
          obj.userName = user.name;
          obj.userImage = user.profileImage;
        }
      } catch (_) {}
    }
    return obj;
  }));

  res.json(enriched);
});

export const replyToUser = asyncHandler(async (req, res) => {
  const { message, imageUrl } = req.body;
  const msg = await Message.create({
    sender: req.user._id,
    recipient: req.params.userId,
    // Allow image-only replies (same fallback as user messages)
    message: message || (imageUrl ? "Sent an image" : ""),
    imageUrl: imageUrl || null,
    senderType: "admin",
    isAdmin: true,
    userRead: false,
    adminRead: true,
    // If the recipient is a seller, count it as an unread message in
    // their Messages page badge
    sellerRead: false,
  });
  // Real-time: push the reply straight to the user's open chat + badge
  emitToUser(req.params.userId, "chat:new-message", msg);
  // If the recipient is a seller, also refresh their Messages page live
  emitToUser(req.params.userId, "seller:new-message", msg);
  res.status(201).json({ success: true, message: msg });
});

export const markUserChatAsRead = asyncHandler(async (req, res) => {
  await Message.updateMany(
    { sender: req.params.userId, adminRead: false },
    { $set: { adminRead: true } }
  );
  res.json({ success: true });
});

// ---- Admin -> Seller alerts ----

// @desc    Send an alert to a specific seller (admin only)
// @route   POST /api/notifications/admin/seller/:userId
export const adminSendSellerAlert = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { title, message } = req.body || {};

  if (!mongoose.isValidObjectId(userId)) {
    res.status(400);
    throw new Error("Invalid seller id");
  }
  if (!title || !String(title).trim()) {
    res.status(400);
    throw new Error("Title is required");
  }
  if (!message || !String(message).trim()) {
    res.status(400);
    throw new Error("Message is required");
  }

  const seller = await Seller.findOne({ user: userId });
  if (!seller) {
    res.status(404);
    throw new Error("Recipient is not a registered seller");
  }

  const notification = await Notification.create({
    user: userId,
    type: "SELLER_ALERT",
    title: String(title).trim(),
    message: String(message).trim(),
    read: false,
  });

  // Real-time: push to the seller's open dashboard (no-op if offline)
  emitToUser(userId, "seller:alert", notification);

  res.status(201).json({ success: true, notification });
});

// @desc    Get the seller's alerts, newest first (with unread count)
// @route   GET /api/notifications/seller
export const getSellerAlerts = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id, type: "SELLER_ALERT" };
  const [alerts, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(500),
    Notification.countDocuments({ ...filter, read: false }),
  ]);
  res.json({ success: true, unreadCount, alerts });
});

// @desc    Mark one seller alert as read (own alerts only)
// @route   PATCH /api/notifications/seller/read/:id
export const markSellerAlertRead = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid alert id");
  }
  const result = await Notification.updateOne(
    { _id: req.params.id, user: req.user._id, type: "SELLER_ALERT" },
    { $set: { read: true } }
  );
  if (result.matchedCount === 0) {
    res.status(404);
    throw new Error("Alert not found");
  }
  res.json({ success: true });
});

// @desc    Mark all of the seller's alerts as read
// @route   POST /api/notifications/seller/mark-all-read
export const markAllSellerAlertsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { user: req.user._id, type: "SELLER_ALERT", read: false },
    { $set: { read: true } }
  );
  res.json({ success: true, updatedCount: result.modifiedCount });
});

// @desc    Seller replies to one of the admin's alerts (appears in the admin
//          Notification center as a conversation with the seller, same as @admin
//          escalations so the admin can reply back through the existing chat)
// @route   POST /api/notifications/seller/reply/:id
export const replyToSellerAlert = asyncHandler(async (req, res) => {
  const { text } = req.body || {};
  if (!text || !String(text).trim()) {
    res.status(400);
    throw new Error("Message is required");
  }

  // Locate the alert and mark it read (own alerts only)
  const alert = await Notification.findOneAndUpdate(
    {
      _id: req.params.id,
      user: req.user._id,
      type: "SELLER_ALERT",
    },
    { $set: { read: true } },
    { new: true }
  );
  if (!alert) {
    res.status(404);
    throw new Error("Alert not found");
  }

  const body = `About alert "${alert.title}": ${String(text).trim()}`;
  const admins = await User.find({ role: "admin" }, "_id");
  if (!admins.length) {
    res.status(201).json({ success: true, alert });
    return;
  }

  for (const admin of admins) {
    await Message.create({
      sender: req.user._id,
      recipient: admin._id,
      message: `@admin ${body}`,
      senderType: "user",
      isAdmin: false,
      adminRead: false,
      userRead: true,
    });
  }

  // Real-time: refresh admins' Notification center + sidebar badge instantly
  emitToAdmins("chat:unseen-user", {
    userId: req.user._id,
    userName: req.user.name || "A seller",
  });

  res.status(201).json({ success: true, alert });
});

// @desc    Notify all admins of a seller activity event (appears in the
//          admin Notification center + unread badge, same as @admin escalations)
export const notifyAdminsOfSellerEvent = async (sellerUser, text) => {
  try {
    if (!sellerUser) return;
    const admins = await User.find({ role: "admin" }, "_id");
    for (const admin of admins) {
      await Message.create({
        sender: sellerUser._id,
        message: `@admin ${text}`,
        senderType: "user",
        isAdmin: false,
        adminRead: false,
        userRead: true,
      });
    }
    // Real-time: refresh admins' Notification center + sidebar badge instantly
    emitToAdmins("chat:unseen-user", {
      userId: sellerUser._id,
      userName: sellerUser.name || "A seller",
    });
  } catch (err) {
    console.error("Failed to notify admins of seller event:", err);
  }
};
