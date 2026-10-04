import express from "express";
import dotenv from "dotenv";
import { createServer } from 'http';
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import logger from "./utils/logger.js";

import userRouter from "./routes/usersRouter.js";
import productRouter from "./routes/productsRouter.js";
import categoryRouter from "./routes/categoryRouter.js";
import orderRouter from "./routes/orderRouter.js";
import paymentRouter from "./routes/paymentRouter.js";
import addressRouter from "./routes/addressRouter.js";
import feedbackRouter from "./routes/feedbackRouter.js";
import messageRouter from "./routes/messageRouter.js";
import notificationRouter from "./routes/notificationRoutes.js";
import adRouter from "./routes/adRoutes.js";
import serviceRouter from "./routes/serviceRoutes.js";
import adminRouter from "./routes/adminRouter.js";
import trendingRouter from "./routes/trendingRouter.js";
import featureRouter from "./routes/featureRoutes.js";
import announcementRouter from "./routes/announcementRoutes.js";
import settingsRouter from "./routes/settingsRoutes.js";
import sellersRouter from "./routes/sellersRouter.js";
import questionRouter from "./routes/questionRouter.js";
import sliderRouter from "./routes/sliderRoutes.js";
import uploadRouter from "./routes/uploadRoutes.js";
import { handleStripeWebhook } from "./controller/paymentController.js";
import { startTrackingCron } from "./services/trackingService.js";

dotenv.config();
connectDB();
startTrackingCron();

const app = express();
let PORT = process.env.PORT || 4000;

// Simple port check - try current port, then fallback to +1
app.listen(PORT, async (err) => {
  if (err && err.code === 'EADDRINUSE') {
    PORT += 1;
    console.log(`Default port ${PORT-1} in use, falling back to ${PORT}`);
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait briefly
    app.close();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } else {
    console.log(`Server running on port ${PORT}`);
  }
});


app.use(cors());

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/users/login", authLimiter);
app.use("/api/messages/sendmessage", rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, error: "Too many messages, please slow down" },
}));

// Stripe webhook needs raw body - must be before express.json()
app.post("/api/payment/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.get("/api/test", (req, res) => res.json({ ok: true, msg: "Server works" }));
app.get("/api/categories/test", (req, res) => res.json({ ok: true, msg: "Category router works" }));

app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

