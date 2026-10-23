import { io } from "socket.io-client";

// Shared Socket.IO client for real-time events (chat, notifications, order updates).
// The backend emits to per-user rooms, so each browser session connects once
// and authenticates with the stored JWT payload (userId + role).

let socket = null;

export const getSocket = () => socket;

const connectSocket = () => {
  if (socket) return socket;

  const token = localStorage.getItem("token");
  if (!token) return null;

  // Decode without verifying (the token was issued by our own backend)
  let payload = {};
  try {
    const part = token.split(".")[1];
    payload = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
  } catch (_) {
    return null;
  }

  const url = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
  const s = io(url, {
    auth: { token, userId: payload.id, role: payload.role },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 3,
  });

  // Server verifies the token on connect; drop the singleton on rejection
  // (e.g. token invalidated) so a later initSocket() can re-create it.
  s.on("connect_error", (err) => {
    if (err?.message === "unauthorized") {
      s.disconnect();
      if (socket === s) socket = null;
    }
  });

  socket = s;
  return s;
};

// Connect when a user logs in. Safe to call repeatedly.
export const initSocket = () => connectSocket();

// Disconnect on logout and drop the singleton.
export const destroySocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Subscribe to one or more events; returns an unsubscribe function.
export const onSocketEvent = (events, handler) => {
  const s = connectSocket();
  if (!s) return () => {};
  const list = Array.isArray(events) ? events : [events];
  list.forEach((event) => s.on(event, handler));
  return () => list.forEach((event) => s.off(event, handler));
};
