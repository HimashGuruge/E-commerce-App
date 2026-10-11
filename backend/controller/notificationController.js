import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { emitToUser } from "../services/socketService.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Notification from "../models/Notification.js";
import Feedback from "../models/Feedback.js";

export const getUserNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const notifications = await Notification.find({ user: req.user._id })
    .populate("product", "name images")
    .sort({ createdAt: -1 })
    .limit(limit);
  res.json({ success: true, notifications });
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
    message: message || "",
    imageUrl: imageUrl || null,
    senderType: "admin",
    isAdmin: true,
    userRead: false,
    adminRead: true,
  });
  // Real-time: push the reply straight to the user's open chat + badge
  emitToUser(req.params.userId, "chat:new-message", msg);
  res.status(201).json({ success: true, message: msg });
});

export const markUserChatAsRead = asyncHandler(async (req, res) => {
  await Message.updateMany(
    { sender: req.params.userId, adminRead: false },
    { $set: { adminRead: true } }
  );
  res.json({ success: true });
});
