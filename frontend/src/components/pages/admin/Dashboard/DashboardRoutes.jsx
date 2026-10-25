import React, { useState, useEffect } from "react";
import { Routes, Route, Link } from "react-router-dom";
import api from "@/utils/api";
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
      backgroundColor: "#1e293b",
      titleFont: { size: 13, weight: "bold" },
      bodyFont: { size: 12 },
      padding: 12,
      cornerRadius: 8,
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: { grid: { color: "#f1f5f9" }, ticks: { font: { size: 11 } }, beginAtZero: true },
  },
};

export default function DashboardRoutes() {
  const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0, totalRevenue: 0, newUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState({ revenue: [], orders: [], labels: [] });
  const [recentOrders, setRecentOrders] = useState([]);
  const [orderStatusData, setOrderStatusData] = useState({ Pending: 0, Processing: 0, Shipped: 0, Delivered: 0, Cancelled: 0 });
  const [categoryData, setCategoryData] = useState([]);

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

  const revenueChartData = {
    labels: chartData.labels,
    datasets: [{
      label: "Revenue",
      data: chartData.revenue,
      borderColor: "#10b981",
      backgroundColor: "rgba(16, 185, 129, 0.1)",
      fill: true,
      tension: 0.4,
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
    }],
  };

  const statusConfig = {
    Pending: { color: "text-amber-600 bg-amber-100", label: "Pending" },
    Processing: { color: "text-brand-600 bg-brand-100", label: "Processing" },
    Shipped: { color: "text-purple-600 bg-purple-100", label: "Shipped" },
    Delivered: { color: "text-brand-600 bg-brand-100", label: "Delivered" },
    Cancelled: { color: "text-red-600 bg-red-100", label: "Cancelled" },
  };

  return (
    <Routes>
      <Route index element={
        <div className="p-4 md:p-6 space-y-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<FiPackage size={24} />} title="Total Products" value={stats.totalProducts} color="text-green-600" />
            <StatCard icon={<MdShoppingCart size={24} />} title="Total Orders" value={stats.totalOrders} color="text-indigo-600" />
            <StatCard icon={<FiDollarSign size={24} />} title="Total Revenue" value={`Rs. ${(stats.totalRevenue || 0).toLocaleString()}`} color="text-amber-600" />
            <StatCard icon={<FiUsers size={24} />} title="Total Users" value={stats.newUsers} color="text-teal-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-900">Revenue Overview</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                  <select className="text-sm bg-slate-50 rounded-lg px-3 py-1.5 border-0">
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

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-6">Orders by Status</h3>
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-6">Categories</h3>
              <div className="h-48 flex items-center justify-center">
                <Doughnut data={categoryChartData} options={{ ...chartOptions, cutout: "65%" }} />
              </div>
              <div className="space-y-2 mt-4">
                {categoryData.length > 0 ? categoryData.map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{cat.name}</span>
                    <span className="font-medium text-slate-900">{cat.percentage}%</span>
                  </div>
                )) : (
                  <p className="text-center text-slate-400 text-sm">No category data</p>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-900">Recent Orders</h3>
                <Link to="/admin/dashboard/orders" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
                  View all <FiArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="space-y-3">
                {recentOrders.length > 0 ? recentOrders.slice(0, 5).map((order) => (
                  <div key={order._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        #{order._id.toString().slice(-4)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{order.user?.name || "Customer"}</p>
                        <p className="text-xs text-slate-500">{order.items?.length || 0} items</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">Rs. {(order.totalPrice || 0).toLocaleString()}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-lg ${statusConfig[order.orderStatus]?.color || "bg-slate-100 text-slate-600"}`}>
                        {order.orderStatus || "Pending"}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-slate-500">
                    <TbPackage className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p>No recent orders</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Pending Orders", value: stats.pendingOrders || 0, icon: FiClock, color: "text-amber-600 bg-amber-100" },
              { label: "Low Stock Items", value: stats.lowStockCount || 0, icon: TbPackage, color: "text-red-600 bg-red-100" },
              { label: "Avg. Order Value", value: stats.totalOrders > 0 ? `Rs. ${Math.round(stats.totalRevenue / stats.totalOrders).toLocaleString()}` : "Rs. 0", icon: FiDollarSign, color: "text-brand-600 bg-brand-100" },
              { label: "Pending Reviews", value: stats.pendingReviews || 0, icon: FiTrendingUp, color: "text-purple-600 bg-purple-100" },
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                <p className={`text-xl font-bold ${item.color.split(" ")[0]}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      } />

      <Route path="adminviewproducts" element={<AdminAllProductView />} />
      <Route path="pendingproducts" element={<PendingProductApprovals />} />
      <Route path="addproducts" element={<AddProducts />} />
      <Route path="editproducts/:productId" element={<EditProducts />} />
      <Route path="notification" element={<Notification />} />
      <Route path="orders" element={<OrderedPage />} />
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
