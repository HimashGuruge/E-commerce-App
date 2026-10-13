import { useState, useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { RxDashboard, RxExit } from "react-icons/rx";
import {
  MdOutlineGridView, MdAddBox, MdShoppingCart, MdMessage, MdCampaign, MdSettings, MdStore,
} from "react-icons/md";
import { FiBarChart2, FiExternalLink, FiBell } from "react-icons/fi";
import { TbPackages } from "react-icons/tb";
import api from "@/utils/api";
import { onSocketEvent } from "@/utils/socket";

export default function SellerDashboardSidebar({ user, isMobileOpen, closeMobile }) {
  const navigate = useNavigate();
  const [seller, setSeller] = useState(null);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const fetchSeller = async () => {
      try {
        const { data } = await api.get("/api/sellers/me");
        if (data.success) setSeller(data.seller);
      } catch {}
    };
    // Badge = orders waiting on the seller (pending + processing), same as the dashboard
    const fetchPending = async () => {
      try {
        const [p, pr] = await Promise.all([
          api.get("/api/sellers/orders?limit=1&status=pending"),
          api.get("/api/sellers/orders?limit=1&status=processing"),
        ]);
        const total =
          (p.data?.success ? p.data.totalCount || 0 : 0) +
          (pr.data?.success ? pr.data.totalCount || 0 : 0);
        setPendingOrders(total);
      } catch {}
    };
    // Badge = unread admin alerts
    const fetchAlerts = async () => {
      try {
        const { data } = await api.get("/api/notifications/seller");
        if (data.success) setUnreadAlerts(data.unreadCount || 0);
      } catch {}
    };
    const onAlertsChanged = (e) => setUnreadAlerts(e.detail || 0);

    // Badge = unread customer messages
    const fetchUnreadMessages = async () => {
      try {
        const { data } = await api.get("/api/sellers/messages/unread");
        if (data.success) setUnreadMessages(data.unreadCount || 0);
      } catch {}
    };
    const onMessagesChanged = (e) => setUnreadMessages(e.detail || 0);

    fetchSeller();
    fetchPending();
    fetchAlerts();
    fetchUnreadMessages();
    const refresh = () => fetchPending();
    const unsubAlert = onSocketEvent(["seller:alert"], fetchAlerts);
    // New customer message → refresh badge live (independent of the Messages page)
    const unsubMsg = onSocketEvent(["seller:new-message"], fetchUnreadMessages);
    // Polling fallback keeps the badge fresh if the socket is unavailable
    const poll = setInterval(fetchUnreadMessages, 30000);
    window.addEventListener("seller-orders-changed", refresh);
    window.addEventListener("seller-alerts-changed", onAlertsChanged);
    window.addEventListener("seller-messages-changed", onMessagesChanged);
    return () => {
      clearInterval(poll);
      window.removeEventListener("seller-orders-changed", refresh);
      window.removeEventListener("seller-alerts-changed", onAlertsChanged);
      window.removeEventListener("seller-messages-changed", onMessagesChanged);
      unsubAlert();
      unsubMsg();
    };
  }, []);

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 min-h-[48px] ${
      isActive
        ? "bg-brand-50 text-brand-700 font-medium shadow-sm"
        : "hover:bg-brand-50 text-gray-700 hover:translate-x-1"
    }`;

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.dispatchEvent(new Event("authChange"));
    navigate("/login");
    closeMobile?.();
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm transition-all duration-300 ${isMobileOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}
        onClick={() => closeMobile?.()}
      />
      <div
        className={`fixed top-0 left-0 h-screen bg-white border-r border-slate-200 shadow-2xl z-40 flex flex-col overflow-y-auto transition-transform duration-300 ease-out ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:sticky lg:w-64 w-72`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <Link to="/seller/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-gradient-to-r from-brand-600 to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
              <MdStore className="text-white text-lg" />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-800">Seller Center</span>
              <span className="block text-[9px] text-gray-500 -mt-0.5">Seller Dashboard</span>
            </div>
          </Link>
          <button onClick={() => closeMobile?.()} className="lg:hidden p-1 hover:bg-gray-100 rounded-lg">
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Seller info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold">
              {seller?.shopName?.charAt(0).toUpperCase() || "S"}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate text-sm">{seller?.shopName || "My Shop"}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block ${
                seller?.status === "approved" ? "bg-green-100 text-green-700" :
                seller?.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-700"
              }`}>
                {seller?.status || "Pending"}
              </span>
            </div>
          </div>
        </div>

        {/* View Store */}
        {seller?.shopName && (
          <a
            href={`/store/${encodeURIComponent(seller.shopName)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 mx-3 my-3 px-4 py-3 rounded-xl bg-brand-50 text-brand-700 hover:bg-brand-100 transition-all font-medium text-sm"
          >
            <MdStore size={18} />
            <span className="flex-1">View My Store</span>
            <FiExternalLink className="w-3.5 h-3.5 text-brand-400" />
          </a>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Dashboard</div>

          <NavLink to="/seller/dashboard" end className={navItemClass} onClick={() => closeMobile?.()}>
            <RxDashboard size={18} className="text-brand-600" />
            <span className="text-sm font-medium">Overview</span>
          </NavLink>

          <NavLink to="/seller/dashboard/products" className={navItemClass} onClick={() => closeMobile?.()}>
            <MdOutlineGridView size={18} className="text-brand-600" />
            <span className="text-sm font-medium">Products</span>
          </NavLink>

          <NavLink to="/seller/dashboard/add-product" className={navItemClass} onClick={() => closeMobile?.()}>
            <MdAddBox size={18} className="text-brand-600" />
            <span className="text-sm font-medium">Add Product</span>
          </NavLink>

          <NavLink to="/seller/dashboard/orders" className={navItemClass} onClick={() => closeMobile?.()}>
            <MdShoppingCart size={18} className="text-brand-600" />
            <span className="flex-1 text-sm font-medium">Orders</span>
            {pendingOrders > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingOrders}</span>
            )}
          </NavLink>

          <NavLink to="/seller/dashboard/earnings" className={navItemClass} onClick={() => closeMobile?.()}>
            <FiBarChart2 size={18} className="text-brand-600" />
            <span className="text-sm font-medium">Earnings</span>
          </NavLink>

          <NavLink to="/seller/dashboard/notifications" className={navItemClass} onClick={() => closeMobile?.()}>
            <FiBell size={18} className="text-brand-600" />
            <span className="flex-1 text-sm font-medium">Notifications</span>
            {unreadAlerts > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadAlerts}</span>
            )}
          </NavLink>

          <NavLink to="/seller/dashboard/messages" className={navItemClass} onClick={() => closeMobile?.()}>
            <MdMessage size={18} className="text-brand-600" />
            <span className="flex-1 text-sm font-medium">Messages</span>
            {unreadMessages > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadMessages}</span>
            )}
          </NavLink>

          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-2 px-2">Settings</div>

          <NavLink to="/seller/dashboard/settings" className={navItemClass} onClick={() => closeMobile?.()}>
            <MdSettings size={18} className="text-brand-600" />
            <span className="text-sm font-medium">Shop Settings</span>
          </NavLink>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-all"
          >
            <RxExit size={18} /> Logout
          </button>
        </div>
      </div>
    </>
  );
}
