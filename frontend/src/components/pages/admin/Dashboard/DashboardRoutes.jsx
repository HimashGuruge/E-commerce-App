import React, { useState, useEffect } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "@/utils/api";
import { getCachedSettings } from "@/utils/siteSettings";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import AddProducts from "@/components/pages/admin/products/AddProducts.jsx";
import AdminAllProductView from "@/components/pages/admin/products/AdminAllProductView.jsx";
import PendingProductApprovals from "@/components/pages/admin/products/PendingProductApprovals.jsx";
import EditProducts from "@/components/pages/admin/products/EditProducts.jsx";
import Notification from "@/components/pages/admin/orders/Notification.jsx";
import StatCard from "@/components/pages/admin/Dashboard/StatCard.jsx";
import OrderedPage from "@/components/pages/admin/Dashboard/AdminOrderedPage.jsx";
import HomeMarketing from "@/components/pages/admin/marketing/HomeMarketing.jsx";
import CouponManagement from "@/components/pages/admin/marketing/CouponManagement.jsx";
import ControllerUsersPrevilegepage from "@/components/pages/admin/users/ControlUsersprivilege.jsx";
import FeedbackManagement from "@/components/pages/admin/marketing/FeedbackManagement.jsx";
import SettingsManagement from "@/components/pages/admin/marketing/SettingsManagement.jsx";
import AdminSellerManagement from "@/components/pages/admin/marketing/AdminSellerManagement.jsx";
import AdminSellerDetail from "@/components/pages/admin/marketing/AdminSellerDetail.jsx";
import AdminSellerPayouts from "@/components/pages/admin/marketing/AdminSellerPayouts.jsx";
import AdminDomexDashboard from "@/components/pages/admin/Dashboard/AdminDomexDashboard.jsx";
import QuestionsManagement from "@/components/pages/admin/marketing/QuestionsManagement.jsx";
import ReturnsManagement from "@/components/pages/admin/returns/ReturnsManagement.jsx";
import { FiPackage, FiUsers, FiDollarSign, FiShoppingCart, FiTrendingUp, FiTrendingDown, FiArrowRight, FiClock } from "react-icons/fi";
import { MdShoppingCart } from "react-icons/md";
import { TbPackage, TbUserOff, TbTrendingUp } from "react-icons/tb";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#14171c",
      titleFont: { family: "'Archivo', system-ui, sans-serif", size: 13, weight: "700" },
      bodyFont: { family: "'IBM Plex Mono', ui-monospace, monospace", size: 12 },
      padding: 12,
      cornerRadius: 10,
      boxPadding: 4,
    },
  },
  scales: {
    x: { grid: { display: false }, border: { display: false }, ticks: { font: { family: "'IBM Plex Mono', ui-monospace, monospace", size: 11 }, color: "#94a3b8" } },
    y: { grid: { color: "#f1f5f9" }, border: { display: false }, ticks: { font: { family: "'IBM Plex Mono', ui-monospace, monospace", size: 11 }, color: "#94a3b8" }, beginAtZero: true },
  },
};

export default function DashboardRoutes() {
  const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0, totalRevenue: 0, newUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState({ revenue: [], orders: [], labels: [] });
  const [recentOrders, setRecentOrders] = useState([]);
  const [orderStatusData, setOrderStatusData] = useState({ Pending: 0, Processing: 0, Shipped: 0, Delivered: 0, Cancelled: 0 });
  const [categoryData, setCategoryData] = useState([]);
  // Admin panel accent color for the revenue chart. Prefers the admin
  // theme color saved in Settings (from the cached public settings so it
  // is correct on first paint), and follows live Settings updates.
  // Falls back to the store brand color.
  const resolveAccent = (s) => {
    const raw = s && typeof s.adminTheme === "string" ? s.adminTheme.trim() : "";
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
    const root = getComputedStyle(document.documentElement).getPropertyValue("--color-brand").trim();
    return /^#[0-9a-fA-F]{6}$/.test(root) ? root : "#F85606";
  };
  const [brandColor, setBrandColor] = useState(() => resolveAccent(getCachedSettings()));

  useEffect(() => {
    const handler = (e) => setBrandColor(resolveAccent(e.detail));
    window.addEventListener("settingsUpdated", handler);
    return () => window.removeEventListener("settingsUpdated", handler);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [statsRes, orderListRes] = await Promise.all([
          api.get(`/api/admin/stats`),
          api.get(`/api/orders/userplace/orders?limit=10`),
        ]);

        if (statsRes.data.success) {
          setStats({
            totalProducts: statsRes.data.stats.totalProducts,
            totalOrders: statsRes.data.stats.totalOrders,
            totalRevenue: statsRes.data.stats.totalRevenue,
            newUsers: statsRes.data.stats.totalUsers,
          });
          setChartData({
            revenue: statsRes.data.charts.revenue,
            orders: statsRes.data.charts.orders,
            labels: statsRes.data.charts.labels,
          });
          setOrderStatusData({
            Pending: statsRes.data.charts.orderStatus.pending || 0,
            Processing: statsRes.data.charts.orderStatus.processing || 0,
            Shipped: statsRes.data.charts.orderStatus.shipped || 0,
            Delivered: statsRes.data.charts.orderStatus.delivered || 0,
            Cancelled: statsRes.data.charts.orderStatus.cancelled || 0,
          });
          setCategoryData(statsRes.data.categoryData || []);
        }
        setRecentOrders(orderListRes.data?.orders || []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const brandHex = brandColor.startsWith("#") ? brandColor : "#F85606";
  const revenueChartData = {
    labels: chartData.labels,
    datasets: [{
      label: "Revenue",
      data: chartData.revenue,
      borderColor: brandHex,
      backgroundColor: brandHex + "14",
      pointBackgroundColor: brandHex,
      pointBorderColor: "#ffffff",
      pointBorderWidth: 1.5,
      pointRadius: 3,
      pointHoverRadius: 5,
      fill: true,
      tension: 0.4,
      borderWidth: 2.5,
    }],
  };

  const ordersChartData = {
    labels: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
    datasets: [{
      data: [
        orderStatusData.Pending,
        orderStatusData.Processing,
        orderStatusData.Shipped,
        orderStatusData.Delivered,
        orderStatusData.Cancelled,
      ],
      backgroundColor: ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ef4444"],
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  const categoryColors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#84cc16"];
  const categoryChartData = {
    labels: categoryData.map((c) => c.name),
    datasets: [{
      data: categoryData.length > 0 ? categoryData.map((c) => c.count) : [1],
      backgroundColor: categoryData.length > 0
        ? categoryData.map((_, i) => categoryColors[i % categoryColors.length])
        : ["#cbd5e1"],
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  const statusConfig = {
    Pending: { color: "text-amber-700 bg-amber-100" },
    Processing: { color: "text-indigo-700 bg-indigo-100" },
    Shipped: { color: "text-purple-700 bg-purple-100" },
    Delivered: { color: "text-emerald-700 bg-emerald-100" },
    Cancelled: { color: "text-red-700 bg-red-100" },
  };

  // Orders API returns lowercase statuses ("processing") — normalize for lookup
  const statusKey = (status) =>
    status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending";

  // Light personal touch: greet the admin by first name at the right time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  let firstName = "there";
  try {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (storedUser?.name) firstName = storedUser.name.split(" ")[0];
  } catch (_e) { /* fall back to "there" */ }

  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
  };

  return (
    <Routes>
      <Route index element={
        <div className="p-4 md:p-6 space-y-5">
          {/* Hero header */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible"
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-3"
          >
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-slate-400 mb-2">
                Admin Console — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 tracking-tight leading-tight">
                {greeting}, {firstName}
              </h1>
              <p className="text-sm text-slate-500 mt-1.5">Here's what's happening across the store.</p>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500">Live · synced</span>
            </div>
          </motion.div>

          {/* Stat cards */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible"
            transition={{ delay: 0.06 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <StatCard icon={<FiPackage size={24} />} title="Total Products" value={stats.totalProducts} color="text-green-600" />
            <StatCard icon={<MdShoppingCart size={24} />} title="Total Orders" value={stats.totalOrders} color="text-indigo-600" />
            <StatCard icon={<FiDollarSign size={24} />} title="Total Revenue" value={`Rs. ${(stats.totalRevenue || 0).toLocaleString()}`} color="text-amber-600" />
            <StatCard icon={<FiUsers size={24} />} title="Total Users" value={stats.newUsers} color="text-teal-600" />
          </motion.div>

          {/* Revenue + order status */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible"
            transition={{ delay: 0.12 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-5"
          >
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-lg tracking-tight">Revenue Overview</h3>
                  <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-slate-400 mt-1">Monthly performance</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-[11px] text-slate-400 font-mono">{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                  <select className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 cursor-pointer">
                    <option>This Year</option>
                    <option>Last Year</option>
                  </select>
                </div>
              </div>
              <div className="h-64">
                {stats.totalRevenue > 0 ? (
                  <Line data={revenueChartData} options={chartOptions} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <FiTrendingUp className="w-12 h-12 mb-3 text-slate-300" />
                    <p className="text-sm font-medium">No revenue data yet</p>
                    <p className="text-xs mt-1">Start selling to see your earnings</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
              <h3 className="font-display font-bold text-slate-900 text-lg tracking-tight">Orders by Status</h3>
              <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-slate-400 mt-1 mb-5">Pipeline health</p>
              <div className="h-48 flex items-center justify-center">
                {Object.values(orderStatusData).some(v => v > 0) ? (
                  <Doughnut data={ordersChartData} options={{ ...chartOptions, cutout: "65%" }} />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <MdShoppingCart className="w-12 h-12 mb-3 text-slate-300" />
                    <p className="text-sm font-medium">No orders yet</p>
                    <p className="text-xs mt-1">Orders will appear here</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {["Pending", "Processing", "Shipped", "Delivered", "Cancelled"].map((status) => (
                  <div key={status} className="flex items-center gap-2 text-xs">
                    <span className={`w-2.5 h-2.5 rounded-full ${statusConfig[status].color.replace("text-", "bg-").split(" ")[0]}`} />
                    <span className="text-slate-600">{status}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Categories + recent orders */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible"
            transition={{ delay: 0.18 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-5"
          >
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
              <h3 className="font-display font-bold text-slate-900 text-lg tracking-tight">Categories</h3>
              <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-slate-400 mt-1 mb-4">Share of catalog</p>
              <div className="h-48 flex items-center justify-center">
                <Doughnut data={categoryChartData} options={{ ...chartOptions, cutout: "65%" }} />
              </div>
              <div className="space-y-2.5 mt-4">
                {categoryData.length > 0 ? categoryData.map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColors[idx % categoryColors.length] }} />
                      {cat.name}
                    </span>
                    <span className="font-mono font-semibold text-slate-900">{cat.percentage}%</span>
                  </div>
                )) : (
                  <p className="text-center text-slate-400 text-sm">No category data</p>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-lg tracking-tight">Recent Orders</h3>
                  <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-slate-400 mt-1">Latest customer purchases</p>
                </div>
                <Link to="/admin/dashboard/orders" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1 font-medium">
                  View all <FiArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="space-y-2.5">
                {recentOrders.length > 0 ? recentOrders.slice(0, 5).map((order) => {
                  const sKey = statusKey(order.orderStatus);
                  const name = order.user?.name || "Customer";
                  return (
                  <div key={order._id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                      {/* Customer profile photo (initials fallback) */}
                      <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 flex-shrink-0">
                        {order.user?.profileImage ? (
                          <img
                            src={order.user.profileImage}
                            alt={name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                        ) : (
                          <span className="text-white font-bold text-sm">{name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{order.items?.length || 0} items</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-slate-900">Rs. {(order.totalPrice || 0).toLocaleString()}</p>
                      <span className={`text-[11px] px-2 py-0.5 rounded-lg ${statusConfig[sKey]?.color || "bg-slate-100 text-slate-600"} font-medium`}>
                        {order.orderStatus || "Pending"}
                      </span>
                    </div>
                  </div>
                  );
                }) : (
                  <div className="text-center py-8 text-slate-500">
                    <TbPackage className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p>No recent orders</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Quick stat strip */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible"
            transition={{ delay: 0.24 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { label: "Pending Orders", value: stats.pendingOrders || 0, icon: FiClock, color: "text-amber-600" },
              { label: "Low Stock Items", value: stats.lowStockCount || 0, icon: TbPackage, color: "text-red-600" },
              { label: "Avg. Order Value", value: stats.totalOrders > 0 ? `Rs. ${Math.round(stats.totalRevenue / stats.totalOrders).toLocaleString()}` : "Rs. 0", icon: FiDollarSign, color: "text-brand-600" },
              { label: "Pending Reviews", value: stats.pendingReviews || 0, icon: FiTrendingUp, color: "text-purple-600" },
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-400 mb-1.5">{item.label}</p>
                <p className={`text-xl font-display font-bold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </motion.div>
        </div>
      } />

      <Route path="adminviewproducts" element={<AdminAllProductView />} />
      <Route path="pendingproducts" element={<PendingProductApprovals />} />
      <Route path="addproducts" element={<AddProducts />} />
      <Route path="editproducts/:productId" element={<EditProducts />} />
      <Route path="notification" element={<Notification />} />
      <Route path="orders" element={<OrderedPage />} />
      <Route path="domex" element={<AdminDomexDashboard />} />
      <Route path="coupons" element={<CouponManagement />} />
      <Route path="home-marketing" element={<HomeMarketing />} />
      <Route path="user-privileges" element={<ControllerUsersPrevilegepage />} />
      <Route path="feedback" element={<FeedbackManagement />} />
      <Route path="settings" element={<SettingsManagement />} />
      <Route path="sellers" element={<AdminSellerManagement />} />
      <Route path="sellers/:sellerId" element={<AdminSellerDetail />} />
      <Route path="payouts" element={<AdminSellerPayouts />} />
      <Route path="questions" element={<QuestionsManagement />} />
      <Route path="returns" element={<ReturnsManagement />} />
    </Routes>
  );
}
