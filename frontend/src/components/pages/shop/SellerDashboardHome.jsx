import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiPackage, FiDollarSign, FiShoppingCart, FiTrendingUp, FiExternalLink } from "react-icons/fi";
import { MdStore, MdOutlinePendingActions } from "react-icons/md";
import { Line, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from "chart.js";
import api from "@/utils/api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function SellerDashboardHome() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sellerShopName, setSellerShopName] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data: res } = await api.get("/api/sellers/dashboard");
        if (res.success) setData(res);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  useEffect(() => {
    const fetchSeller = async () => {
      try {
        const { data: res } = await api.get("/api/sellers/me");
        if (res.success) setSellerShopName(res.seller?.shopName);
      } catch {}
    };
    fetchSeller();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data?.stats;
  const recentOrders = data?.recentOrders || [];

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: "#1e293b", padding: 12, cornerRadius: 8 } },
    scales: { x: { grid: { display: false } }, y: { grid: { color: "#f1f5f9" }, beginAtZero: true } },
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Seller Dashboard</h2>
        <p className="text-slate-500 text-sm mt-1">Here's your shop performance overview</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Products</span>
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <FiPackage className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.totalProducts || 0}</p>
          <p className="text-xs text-slate-400 mt-1">{stats?.activeProducts || 0} active</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Orders</span>
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
              <FiShoppingCart className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.totalOrders || 0}</p>
          <p className="text-xs text-slate-400 mt-1">{stats?.pendingOrders || 0} pending</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Revenue</span>
            <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
              <FiDollarSign className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">Rs. {(stats?.totalRevenue || 0).toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">Lifetime earnings</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pending Approval</span>
            <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center">
              <MdOutlinePendingActions className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats?.pendingApproval || 0}</p>
          <p className="text-xs text-slate-400 mt-1">Products awaiting review</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-6">Performance Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl text-center">
              <p className="text-xs text-slate-500 mb-1">Rating</p>
              <p className="text-xl font-bold text-slate-900">{stats?.rating || "—"}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl text-center">
              <p className="text-xs text-slate-500 mb-1">Ship On Time</p>
              <p className="text-xl font-bold text-green-600">{stats?.shipOnTime || 0}%</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl text-center">
              <p className="text-xs text-slate-500 mb-1">Chat Response</p>
              <p className="text-xl font-bold text-slate-900">{stats?.chatResponseRate || 0}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link to="/seller/dashboard/add-product" className="flex items-center gap-3 p-3 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors">
              <MdStore className="w-5 h-5 text-brand-600" />
              <span className="text-sm font-medium text-brand-700">Add New Product</span>
            </Link>
            <Link to="/seller/dashboard/orders" className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
              <FiShoppingCart className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">View Orders</span>
            </Link>
            <Link to="/seller/dashboard/settings" className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors">
              <FiTrendingUp className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">Update Shop Info</span>
            </Link>
            {sellerShopName && (
              <a
                href={`/store/${encodeURIComponent(sellerShopName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
              >
                <MdStore className="w-5 h-5 text-green-600" />
                <span className="flex-1 text-sm font-medium text-green-700">Preview My Store</span>
                <FiExternalLink className="w-3.5 h-3.5 text-green-400" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">Recent Orders</h3>
          <Link to="/seller/dashboard/orders" className="text-sm text-brand-600 hover:text-brand-700 font-medium">View All</Link>
        </div>
        {recentOrders.length > 0 ? (
          <div className="space-y-3">
            {recentOrders.slice(0, 5).map((order) => (
              <div key={order._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    #{order._id.toString().slice(-4)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">Order #{order._id.toString().slice(-8)}</p>
                    <p className="text-xs text-slate-500">{order.items?.length || 0} items</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 text-sm">Rs. {(order.totalPrice || 0).toLocaleString()}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg font-medium ${
                    order.orderStatus === "delivered" ? "bg-green-100 text-green-700" :
                    order.orderStatus === "shipped" ? "bg-purple-100 text-purple-700" :
                    order.orderStatus === "pending" ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {order.orderStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <FiShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">No orders yet</p>
            <p className="text-xs mt-1">Orders will appear here when customers purchase your products</p>
          </div>
        )}
      </div>
    </div>
  );
}
