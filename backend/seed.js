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
    const existingAdmin = await User.findById(adminUserId);

    if (!existingAdmin) {
      await User.create({
        _id: adminUserId,
        name: "Admin User",
        email: "admin@example.com",
        password: "Admin123!",
        role: "admin",
      });
      console.log("Created admin user: admin@example.com / Admin123!");
    } else {
      console.log("Admin user already exists");
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
