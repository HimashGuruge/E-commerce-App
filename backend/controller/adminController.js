import asyncHandler from "express-async-handler";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Feedback from "../models/Feedback.js";
import Category from "../models/Category.js";

export const getAdminStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalProducts,
    totalOrders,
    totalUsers,
    categories,
    monthlyOrders,
    lastMonthOrders,
    pendingOrders,
    processingOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    monthlyRevenue,
    lastMonthRevenue,
  ] = await Promise.all([
    Product.countDocuments(),
    Order.countDocuments(),
    User.countDocuments({ role: "customer" }),
    Category.find({ status: "active" }),
    Order.find({ createdAt: { $gte: startOfMonth } }),
    Order.find({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    }),
    Order.countDocuments({ orderStatus: "pending" }),
    Order.countDocuments({ orderStatus: "processing" }),
    Order.countDocuments({ orderStatus: "shipped" }),
    Order.countDocuments({ orderStatus: "delivered" }),
    Order.countDocuments({ orderStatus: "cancelled" }),
    Order.find({ createdAt: { $gte: startOfMonth }, paymentStatus: "paid" }).select("totalPrice"),
    Order.find({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      paymentStatus: "paid",
    }).select("totalPrice"),
  ]);

  const totalRevenue = monthlyRevenue.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const lastMonthTotal = lastMonthRevenue.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  const revenueGrowth = lastMonthTotal > 0 ? ((totalRevenue - lastMonthTotal) / lastMonthTotal * 100).toFixed(1) : 0;

  const revenueLabels = [];
  const revenueData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    revenueLabels.push(label);
    revenueData.push(0);
  }

  monthlyOrders.forEach((order) => {
    const label = order.createdAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const idx = revenueLabels.indexOf(label);
    if (idx !== -1) revenueData[idx] += order.totalPrice || 0;
  });

  const orderLabels = [];
  const orderData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    orderLabels.push(label);
    orderData.push(0);
  }

  monthlyOrders.forEach((order) => {
    const label = order.createdAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const idx = orderLabels.indexOf(label);
    if (idx !== -1) orderData[idx] += 1;
  });

  const categoryData = [];
  for (const cat of categories) {
    const count = await Product.countDocuments({ category: cat.name });
    if (count > 0) categoryData.push({ name: cat.name, count });
  }
  categoryData.sort((a, b) => b.count - a.count);

  res.json({
    success: true,
    stats: {
      totalProducts,
      totalOrders,
      totalRevenue,
      totalUsers,
      revenueGrowth: parseFloat(revenueGrowth),
    },
    charts: {
      revenue: revenueData,
      orders: orderData,
      labels: revenueLabels,
      orderStatus: {
        pending: pendingOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
      },
    },
    categoryData: categoryData.slice(0, 8),
  });
});
