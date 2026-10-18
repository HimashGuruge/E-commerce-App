import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { initSocket } from "./services/socketService.js";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import connectDB from "./config/db.js";
import { rateLimitConfig } from "./config/env.js";
import logger from "./utils/logger.js";

import userRouter from "./routes/usersRouter.js";
import productRouter from "./routes/productsRouter.js";
import categoryRouter from "./routes/categoryRouter.js";
import orderRouter from "./routes/orderRouter.js";
import paymentRouter from "./routes/paymentRouter.js";
import addressRouter from "./routes/addressRouter.js";
import feedbackRouter from "./routes/feedbackRouter.js";
import messageRouter from "./routes/messageRouter.js";
import notificationRouter from "./routes/notificationRouter.js";
import adRouter from "./routes/adRouter.js";
import serviceRouter from "./routes/serviceRouter.js";
import adminRouter from "./routes/adminRouter.js";
import trendingRouter from "./routes/trendingRouter.js";
import featureRouter from "./routes/featureRouter.js";
import announcementRouter from "./routes/announcementRouter.js";
import settingsRouter from "./routes/settingsRouter.js";
import sellersRouter from "./routes/sellersRouter.js";
import questionRouter from "./routes/questionRouter.js";
import sliderRouter from "./routes/sliderRouter.js";
import uploadRouter from "./routes/uploadRouter.js";
import couponRouter from "./routes/couponRouter.js";
import { handleStripeWebhook } from "./controller/paymentController.js";
import { startTrackingCron, stopTrackingCron } from "./services/trackingService.js";
import mongoose from "mongoose";

dotenv.config();

// Fail fast if required environment variables are missing
const missingEnv = ["MONGO_URI", "JWT_SECRET"].filter((k) => !process.env[k]);
if (missingEnv.length > 0) {
  logger.error(`Missing required env vars: ${missingEnv.join(", ")}. Check backend/.env`);
  process.exit(1);
}

connectDB();
startTrackingCron();

const app = express();
const server = createServer(app);
let PORT = process.env.PORT || 4000;

// Socket.IO real-time events (chat, notifications, order status)
const socketIo = initSocket(server);

// --- Graceful shutdown & crash handling -------------------------------------

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception:", err);
  process.exit(1);
});

const shutdown = async (signal) => {
  logger.warn(`${signal} received — starting graceful shutdown`);
  stopTrackingCron();
  try {
    if (socketIo) {
      socketIo.disconnectSockets?.();
      socketIo.close();
    }
  } catch {}
  // Stop accepting new connections; let in-flight requests finish
  await new Promise((resolve) => server.close(resolve));
  try {
    await mongoose.connection.close();
  } catch {}
  logger.info("Shutdown complete — bye");
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Simple port check - try current port, then fallback to +1
server.listen(PORT, (err) => {
  if (err && err.code === 'EADDRINUSE') {
    const fallbackPort = PORT + 1;
    logger.warn(`Port ${PORT} in use, falling back to ${fallbackPort}`);
    server.listen(fallbackPort, () => logger.info(`Server running on port ${fallbackPort}`));
  } else {
    logger.info(`Server running on port ${PORT}`);
  }
});


// REST API — CORS restricted to the frontend origin
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3001",
}));

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

// Rate limiting — skipped entirely outside production so dev/test traffic
// (rapid uploads, polling, retries) never hits the in-memory budget.
const skipWhenNotProd = (req) => process.env.NODE_ENV !== "production";
const authLimiter = rateLimit({
  windowMs: rateLimitConfig.loginWindowMin * 60 * 1000,
  max: rateLimitConfig.loginMax,
  skip: skipWhenNotProd,
  message: { success: false, error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/users/login", authLimiter);
app.use("/api/messages/sendmessage", rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  skip: skipWhenNotProd,
  message: { success: false, error: "Too many messages, please slow down" },
}));

// Global safety net for all other API routes
// 2K/15min sits well above real client polling load (~60-120 req/min across
// Navbar/Footer/ChatBot/Admin panels) yet still stops runaway loops. The
// dedicated auth + chat-send limiters above stay stricter.
app.use("/api", rateLimit({
  windowMs: rateLimitConfig.apiWindowMin * 60 * 1000,
  max: rateLimitConfig.apiMax,
  skip: skipWhenNotProd,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later" },
}));

// Stripe webhook needs raw body - must be before express.json()
app.post("/api/payment/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(compression());

// Light request logging (method, path, status, duration)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

app.get("/health", (req, res) => {
  res.json({
    status: mongoose.connection.readyState === 1 ? "healthy" : "unhealthy",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime: process.uptime(),
  });
});

app.use("/api/users", userRouter);
app.use("/api/products", productRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/orders", orderRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/addresses", addressRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/messages", messageRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/ads", adRouter);
app.use("/api/services", serviceRouter);
app.use("/api/admin", adminRouter);
app.use("/api/trending", trendingRouter);
app.use("/api/features", featureRouter);
app.use("/api/announcements", announcementRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/sellers", sellersRouter);
app.use("/api/questions", questionRouter);
app.use("/api/slider", sliderRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/coupons", couponRouter);

// Serve uploaded files publicly (local storage only)
if (process.env.STORAGE !== 'supabase') {
  app.use('/uploads', express.static('public/uploads'));
  // Also serve at /public/uploads for backward compatibility with old MongoDB URLs
  app.use('/public/uploads', express.static('public/uploads'));

  // Return transparent pixel for missing images instead of HTML 404 (prevents CORB)
  const transparentPixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  app.use(['/uploads/*', '/public/uploads/*'], (req, res) => {
    res.type('gif').send(transparentPixel);
  });
}

app.use((err, req, res, next) => {
  // Multer file-size limit -> clear 413 instead of a generic 500
  if (err && err.name === "MulterError" && err.code === "LIMIT_FILE_SIZE") {
    const maxMb = (parseInt(process.env.MAX_UPLOAD_MB, 10) || 15);
    logger.warn(`Upload rejected: file exceeds ${maxMb} MB`);
    return res.status(413).json({
      success: false,
      error: `File too large — max upload size is ${maxMb} MB`,
    });
  }
  // Controllers set res.status(...) before throwing, so that code wins over err.status
  const status = res.statusCode >= 400 ? res.statusCode : err.status || 500;
  logger.error(err.stack);
  res.status(status).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});
