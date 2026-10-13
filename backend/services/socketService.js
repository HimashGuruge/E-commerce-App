import { Server as SocketIOServer } from "socket.io";

let socketIo = null;

// Initialize Socket.IO on the existing HTTP server
export const initSocket = (server) => {
  socketIo = new SocketIOServer(server, {
    cors: {
      origin: [process.env.FRONTEND_URL || "http://localhost:3001"],
      methods: ["GET", "POST"],
    },
  });

  // Join personal rooms so users only receive their own events
  socketIo.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId;
    if (userId) socket.join(`user:${userId}`);
    if (socket.handshake.auth?.role === "admin") socket.join("admins");
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
