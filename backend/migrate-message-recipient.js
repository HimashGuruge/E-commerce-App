import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import Message from "./models/Message.js";
import Order from "./models/Order.js";
import User from "./models/User.js";

dotenv.config();

// One-time migration: backfill Message.recipient so user-facing messages
// are scoped to the right person instead of being shared by isAdmin:true.
const run = async () => {
  await connectDB();

  // Pass 1 (deterministic): bot messages tied to an order -> the order's user.
  const withOrderRef = await Message.find({ recipient: null, orderRef: { $ne: null } });
  const orderIdToUser = new Map();
  const refs = [...new Set(withOrderRef.map((m) => m.orderRef.toString()))];
  const orders = await Order.find({ _id: { $in: refs } }).select("user");
  for (const o of orders) {
    if (o.user) orderIdToUser.set(o._id.toString(), o.user);
  }

  let orderFilled = 0;
  for (const m of withOrderRef) {
    const user = orderIdToUser.get(m.orderRef.toString());
    if (user) {
      m.recipient = user;
      await m.save();
      orderFilled++;
    }
  }
  console.log(`[Pass 1] Backfilled recipient for ${orderFilled} order-bound messages.`);

  // Pass 2 (best-effort): admin/bot replies with no orderRef -> pair each to the
  // latest regular-user message that precedes it (the conversation owner).
  const adminIds = new Set(
    (await User.find({ role: "admin" }).select("_id").lean()).map((u) => u._id.toString())
  );

  const userMsgs = await Message.find({
    isAdmin: false,
    senderType: "user",
  })
    .select("sender createdAt")
    .sort({ createdAt: 1 })
    .lean();

  // Keep only messages from real (non-admin) users.
  const validUserMsgs = userMsgs
    .filter((m) => m.sender && !adminIds.has(m.sender.toString()))
    .map((m) => ({ senderId: m.sender, createdAt: m.createdAt }));

  const pending = await Message.find({
    recipient: null,
    isAdmin: true,
  })
    .select("sender createdAt _id")
    .sort({ createdAt: 1 })
    .lean();

  let replyFilled = 0;
  let pointer = 0;
  for (const p of pending) {
    // Advance pointer to the latest user message created at/before this admin msg.
    while (pointer < validUserMsgs.length && validUserMsgs[pointer].createdAt <= p.createdAt) {
      pointer++;
    }
    if (pointer > 0) {
      const ownerId = validUserMsgs[pointer - 1].senderId;
      const r = await Message.updateOne({ _id: p._id, recipient: null }, { $set: { recipient: ownerId } });
      replyFilled += r.modifiedCount;
    }
  }
  console.log(`[Pass 2] Backfilled recipient for ${replyFilled} admin/bot replies.`);

  const remaining = await Message.countDocuments({ recipient: null, isAdmin: true });
  console.log(`[Done] ${remaining} admin/bot messages still have no recipient (kept as-is).`);

  await mongoose.connection.close();
};

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
