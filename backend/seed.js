import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import User from "./models/User.js";
import Trending from "./models/Trending.js";

dotenv.config();

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log("Connected to database...");

    const adminUserId = new mongoose.Types.ObjectId("69f48421dbf4d5ee2e09e613");
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.warn(
        "ADMIN_PASSWORD not set in backend/.env — skipping admin user creation."
      );
    } else {
      const existingAdmin = await User.findById(adminUserId);
      if (!existingAdmin) {
        await User.create({
          _id: adminUserId,
          name: "Admin User",
          email: adminEmail,
          password: adminPassword,
          role: "admin",
          // This account is the single trusted Main Admin.
          isMainAdmin: true,
        });
        console.log(`Created admin user: ${adminEmail} (password from ADMIN_PASSWORD)`);
      } else {
        // Keep the trusted Main Admin designation if it was ever lost.
        if (!existingAdmin.isMainAdmin) {
          existingAdmin.isMainAdmin = true;
          await existingAdmin.save();
          console.log("Restored isMainAdmin flag on the seeded admin user");
        } else {
          console.log("Admin user already exists");
        }
      }
    }

    const trendingTerms = [
      { name: "iPhone", icon: "📱", order: 1, status: "active" },
      { name: "AirPods", icon: "🎧", order: 2, status: "active" },
      { name: "Smart Watch", icon: "⌚", order: 3, status: "active" },
      { name: "Laptop", icon: "💻", order: 4, status: "active" },
      { name: "Headphones", icon: "🎧", order: 5, status: "active" },
      { name: "Speaker", icon: "🔊", order: 6, status: "active" },
    ];

    for (const term of trendingTerms) {
      await Trending.findOneAndUpdate(
        { name: term.name },
        term,
        { upsert: true, new: true }
      );
    }
    console.log("Trending terms seeded");

    console.log("Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
