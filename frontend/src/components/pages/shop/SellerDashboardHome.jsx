import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { FiPackage, FiDollarSign, FiShoppingCart, FiTrendingUp, FiExternalLink } from "react-icons/fi";
import { MdStore, MdOutlinePendingActions } from "react-icons/md";
import api from "@/utils/api";
import { onSocketEvent } from "@/utils/socket";

export default function SellerDashboardHome() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sellerShopName, setSellerShopName] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      const { data: res } = await api.get("/api/sellers/dashboard");
      if (res.success) {
        setData(res);
        setLoadError(false);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    // Real-time refresh when a new order or buyer chat arrives (same event
    // the sidebar Messages badge uses); 30s poll as fallback (also picks up
    // new reviews). Matches the sidebar's existing 30s refresh cadence.
    const offSocket = onSocketEvent(["seller:new-message"], () => loadDashboard());
    const poll = setInterval(loadDashboard, 30000);
    return () => {
      offSocket();
      clearInterval(poll);
    };
  }, [loadDashboard]);

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
        <div className="w-10 h-10 border-4 border-shopprimary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-shopmuted">Could not load your dashboard.</p>
        <button
          onClick={loadDashboard}
          className="text-sm font-semibold text-shopprimary hover:text-[#4338ca]"
        >
          Try again
        </button>
      </div>
    );
  }

  const stats = data?.stats;
  const recentOrders = data?.recentOrders || [];

  const card = "bg-white border border-shopborder rounded-[13px]";

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-[26px] font-extrabold text-shoptext tracking-[-0.6px]">Seller Dashboard</h2>
        <p className="text-shopmuted text-sm mt-1.5">Here's your shop performance overview</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className={`${card} p-5`}>
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs text-shopmuted">Total Products</span>
            <div className="w-10 h-10 bg-[#fff3df] rounded-[10px] flex items-center justify-center">
              <FiPackage className="w-5 h-5 text-[#b0781f]" />
            </div>
          </div>
          <p className="text-[27px] font-bold text-shoptext tracking-[-0.5px]">{stats?.totalProducts || 0}</p>
          <p className="text-[11px] text-shopmuted mt-2">{stats?.activeProducts || 0} active</p>
        </div>
        <div className={`${card} p-5`}>
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs text-shopmuted">Total Orders</span>
            <div className="w-10 h-10 bg-[#e7f8ef] rounded-[10px] flex items-center justify-center">
              <FiShoppingCart className="w-5 h-5 text-shopgreen" />
            </div>
          </div>
          <p className="text-[27px] font-bold text-shoptext tracking-[-0.5px]">{stats?.totalOrders || 0}</p>
          <p className="text-[11px] text-shopmuted mt-2">{stats?.pendingOrders || 0} pending</p>
        </div>
        <div className={`${card} p-5`}>
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs text-shopmuted">Revenue</span>
            <div className="w-10 h-10 bg-shopprimarylight rounded-[10px] flex items-center justify-center">
              <FiDollarSign className="w-5 h-5 text-shopprimary" />
            </div>
          </div>
          <p className="text-[27px] font-bold text-shoptext tracking-[-0.5px]">Rs. {(stats?.totalRevenue || 0).toLocaleString()}</p>
          <p className="text-[11px] text-shopmuted mt-2">Lifetime earnings</p>
        </div>
        <div className={`${card} p-5`}>
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs text-shopmuted">Pending Approval</span>
            <div className="w-10 h-10 bg-[#e7f4ff] rounded-[10px] flex items-center justify-center">
              <MdOutlinePendingActions className="w-5 h-5 text-[#2168b5]" />
            </div>
          </div>
          <p className="text-[27px] font-bold text-shoptext tracking-[-0.5px]">{stats?.pendingApproval || 0}</p>
          <p className="text-[11px] text-shopmuted mt-2">Products awaiting review</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className={`lg:col-span-2 ${card} p-6`}>
          <div className="mb-5">
            <h3 className="font-bold text-shoptext text-[15px]">Performance Overview</h3>
            <p className="text-xs text-shopmuted mt-1.5">Your store's reputation metrics</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-[#fafbfe] border border-shopborder rounded-[10px] text-center">
              <p className="text-xs text-shopmuted mb-1">Rating</p>
              <p className="text-xl font-bold text-shoptext">
                {stats?.rating != null ? `${stats.rating} ★` : "N/A"}
              </p>
            </div>
            <div className="p-4 bg-[#fafbfe] border border-shopborder rounded-[10px] text-center">
              <p className="text-xs text-shopmuted mb-1">Ship On Time</p>
              <p className="text-xl font-bold text-shopgreen">
                {stats?.shipOnTime != null ? `${stats.shipOnTime}%` : "N/A"}
              </p>
            </div>
            <div className="p-4 bg-[#fafbfe] border border-shopborder rounded-[10px] text-center">
              <p className="text-xs text-shopmuted mb-1">Chat Response</p>
              <p className="text-xl font-bold text-shoptext">
                {stats?.chatResponseRate != null ? `${stats.chatResponseRate}%` : "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className={`${card} p-6`}>
          <div className="mb-5">
            <h3 className="font-bold text-shoptext text-[15px]">Quick Actions</h3>
            <p className="text-xs text-shopmuted mt-1.5">Common tasks</p>
          </div>
          <div className="space-y-3">
            <Link to="/seller/dashboard/add-product" className="flex items-center gap-3 p-3 bg-shopprimarylight rounded-[10px] hover:bg-[#e0e7ff] transition-colors">
              <MdStore className="w-5 h-5 text-shopprimary" />
              <span className="text-sm font-medium text-shopprimary">Add New Product</span>
            </Link>
            <Link to="/seller/dashboard/orders" className="flex items-center gap-3 p-3 bg-[#e7f4ff] rounded-[10px] hover:bg-[#d8ecff] transition-colors">
              <FiShoppingCart className="w-5 h-5 text-[#2168b5]" />
              <span className="text-sm font-medium text-[#2168b5]">View Orders</span>
            </Link>
            <Link to="/seller/dashboard/settings" className="flex items-center gap-3 p-3 bg-[#fff3df] rounded-[10px] hover:bg-[#ffeac2] transition-colors">
              <FiTrendingUp className="w-5 h-5 text-[#ad6b00]" />
              <span className="text-sm font-medium text-[#ad6b00]">Update Shop Info</span>
            </Link>
            {sellerShopName && (
              <a
                href={`/store/${encodeURIComponent(sellerShopName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-[#e7f8ef] rounded-[10px] hover:bg-[#d5f2e4] transition-colors"
              >
                <MdStore className="w-5 h-5 text-shopgreen" />
                <span className="flex-1 text-sm font-medium text-shopgreen">Preview My Store</span>
                <FiExternalLink className="w-3.5 h-3.5 text-[#6fbf9a]" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className={`${card} overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-shopborder">
          <div>
            <h3 className="font-bold text-shoptext text-[15px]">Recent Orders</h3>
            <p className="text-xs text-shopmuted mt-1.5">Latest customer purchases</p>
          </div>
          <Link to="/seller/dashboard/orders" className="text-shopprimary hover:text-[#4338ca] text-xs font-semibold">View all →</Link>
        </div>
        {recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="px-5 py-3.5 bg-[#fafbfe] text-[10px] uppercase tracking-[0.6px] font-bold text-[#8b94a5]">Order ID</th>
                  <th className="px-5 py-3.5 bg-[#fafbfe] text-[10px] uppercase tracking-[0.6px] font-bold text-[#8b94a5]">Items</th>
                  <th className="px-5 py-3.5 bg-[#fafbfe] text-[10px] uppercase tracking-[0.6px] font-bold text-[#8b94a5]">Date</th>
                  <th className="px-5 py-3.5 bg-[#fafbfe] text-[10px] uppercase tracking-[0.6px] font-bold text-[#8b94a5]">Amount</th>
                  <th className="px-5 py-3.5 bg-[#fafbfe] text-[10px] uppercase tracking-[0.6px] font-bold text-[#8b94a5]">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.slice(0, 5).map((order) => (
                  <tr key={order._id} className="border-b border-[#f0f2f6] last:border-0 hover:bg-[#fafbff]">
                    <td className="px-5 py-4 text-xs font-bold text-shopprimary">#{order._id.toString().slice(-8)}</td>
                    <td className="px-5 py-4 text-xs text-shoptext">{order.items?.length || 0} items</td>
                    <td className="px-5 py-4 text-xs text-shopmuted">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-shoptext">Rs. {(order.totalPrice || 0).toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-block px-2.5 py-1.5 rounded-[6px] text-[10px] font-semibold ${
                        order.orderStatus === "delivered" ? "bg-[#def7e9] text-[#147c4f]" :
                        order.orderStatus === "shipped" ? "bg-[#e5f1ff] text-[#2168b5]" :
                        order.orderStatus === "pending" ? "bg-[#f0e9ff] text-[#7141b8]" :
                        "bg-[#fff1d6] text-[#ad6b00]"
                      }`}>
                        {order.orderStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-shopmuted">
            <FiShoppingCart className="w-10 h-10 mx-auto mb-2 text-[#c4cad6]" />
            <p className="text-sm font-medium">No orders yet</p>
            <p className="text-xs mt-1">Orders will appear here when customers purchase your products</p>
          </div>
        )}
      </div>
    </div>
  );
}
