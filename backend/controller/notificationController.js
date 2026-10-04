import asyncHandler from "express-async-handler";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Order from "../models/Order.js";

export const getUserNotifications = asyncHandler(async (req, res) => {
  const messages = await Message.find({ sender: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20);
  res.json({ success: true, notifications: messages });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Message.countDocuments({
    sender: { $ne: req.user._id },
    userRead: false,
  });
  res.json({ success: true, count });
});

export const markAsRead = asyncHandler(async (req, res) => {
  await Message.findByIdAndUpdate(req.params.id, { userRead: true });
  res.json({ success: true });
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  await Message.updateMany(
    { sender: { $ne: req.user._id }, userRead: false },
    { $set: { userRead: true } }
  );
  res.json({ success: true });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  await Message.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export const clearAllNotifications = asyncHandler(async (req, res) => {
  await Message.deleteMany({ sender: req.user._id });
  res.json({ success: true });
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
  const [messageCount, orderCount] = await Promise.all([
    Message.countDocuments({ isAdmin: false, adminRead: false, message: /@admin/i }),
    Order.countDocuments({ seenByAdmin: false }),
  ]);
  res.json({ success: true, count: messageCount + orderCount });
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
  const messages = await Message.find({
    $or: [
      { sender: req.params.userId, isAdmin: false },
      { sender: { $ne: req.params.userId }, isAdmin: true },
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
    message: message || "",
    imageUrl: imageUrl || null,
    senderType: "admin",
    isAdmin: true,
    userRead: false,
    adminRead: true,
  });
  res.status(201).json({ success: true, message: msg });
});

export const markUserChatAsRead = asyncHandler(async (req, res) => {
  await Message.updateMany(
    { sender: req.params.userId, adminRead: false },
    { $set: { adminRead: true } }
  );
  res.json({ success: true });
});
