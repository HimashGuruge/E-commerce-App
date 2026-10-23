import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";

let socketIo = null;

// Reject connections without a valid token (no trusting client-supplied identity)
const verifySocketAuth = (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("unauthorized"));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.userId = decoded.id;
    socket.data.role = decoded.role;
    next();
  } catch (err) {
    next(new Error("unauthorized"));
  }
};

// Initialize Socket.IO on the existing HTTP server
export const initSocket = (server) => {
  socketIo = new SocketIOServer(server, {
    cors: {
      origin: [process.env.FRONTEND_URL || "http://localhost:3001"],
      methods: ["GET", "POST"],
    },
  });

  socketIo.use(verifySocketAuth);

  // Join personal rooms so users only receive their own events
  socketIo.on("connection", (socket) => {
    if (socket.data.userId) socket.join(`user:${socket.data.userId}`);
    if (socket.data.role === "admin") socket.join("admins");
  });

  return socketIo;
};

// Push an event to one user's connected clients
export const emitToUser = (userId, event, payload) => {
  if (!socketIo || !userId) return;
  socketIo.to(`user:${userId}`).emit(event, payload);
};

// Push an event to all connected admins
export const emitToAdmins = (event, payload) => {
  if (!socketIo) return;
  socketIo.to("admins").emit(event, payload);
};

// Push an event to every connected client (e.g. site settings changed)
export const emitToAll = (event, payload) => {
  if (!socketIo) return;
  socketIo.emit(event, payload);
};
