import mongoose from "mongoose";
import logger from "../utils/logger.js";

// Log connection state changes so outages are visible instead of silent.
mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected — requests will fail until it reconnects");
});
mongoose.connection.on("reconnected", () => {
  logger.info("MongoDB reconnected");
});
mongoose.connection.on("error", (err) => {
  logger.error("Mongoose connection error:", err.message);
});

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      compressors: ['zlib'],
      zlibCompressionLevel: 3,
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB initial connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
