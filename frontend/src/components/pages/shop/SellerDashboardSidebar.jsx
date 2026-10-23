import { useState, useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { RxDashboard, RxExit } from "react-icons/rx";
import {
  MdOutlineGridView, MdAddBox, MdShoppingCart, MdMessage, MdCampaign, MdSettings, MdStore, MdHome,
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
  const shopName = seller?.shopName || "My Shop";
  const initial = (shopName.trim().charAt(0) || "S").toUpperCase();

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
    // New buyer order → refresh the pending-orders badge live
    const unsubNewOrder = onSocketEvent(["seller:new-order"], refresh);
    window.addEventListener("seller-orders-changed", refresh);
    window.addEventListener("seller-alerts-changed", onAlertsChanged);
    window.addEventListener("seller-messages-changed", onMessagesChanged);
    return () => {
      window.removeEventListener("seller-orders-changed", refresh);
      window.removeEventListener("seller-alerts-changed", onAlertsChanged);
      window.removeEventListener("seller-messages-changed", onMessagesChanged);
      unsubAlert();
      unsubMsg();
      unsubNewOrder();
    };
  }, []);

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-3 rounded-[9px] transition-all duration-200 text-sm ${
      isActive
        ? "bg-shopprimarylight text-shopprimary font-semibold"
        : "text-[#677186] hover:bg-[#f5f6fc] hover:text-shopprimary"
    }`;

  const badgePill = (count) =>
    count > 0 && (
      <span className="ml-auto bg-[#fee2e2] text-[#b91c1c] rounded-[6px] px-[7px] py-[3px] text-[11px] font-bold">{count}</span>
    );

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
        className={`fixed top-0 left-0 h-screen bg-white border-r border-shopborder shadow-2xl z-40 flex flex-col overflow-y-auto transition-transform duration-300 ease-out px-4 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:sticky lg:w-[245px] w-72`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between pt-6 pb-7 px-2.5">
          <Link to="/seller/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-shopprimary rounded-[11px] flex items-center justify-center overflow-hidden">
              {seller?.shopLogo ? (
                <img
                  src={seller.shopLogo}
                  alt={shopName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement.textContent = initial;
                  }}
                />
              ) : (
                <MdStore className="text-white text-lg" />
              )}
            </div>
            <div>
              <span className="text-xl font-extrabold text-shoptext leading-none">Seller Center</span>
              <span className="block text-[10px] text-shopmuted mt-1">Seller Dashboard</span>
            </div>
          </Link>
          <button onClick={() => closeMobile?.()} className="lg:hidden p-1 hover:bg-[#eef0f5] rounded-lg">
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* View Store */}
        {seller?.shopName && (
          <a
            href={`/store/${encodeURIComponent(seller.shopName)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 my-3 px-3 py-3 rounded-xl border border-shopborder bg-white text-[#677186] hover:bg-[#f5f6fc] hover:text-shopprimary transition-all font-medium text-sm"
          >
            <MdStore size={18} />
            <span className="flex-1 truncate">View My Store</span>
            <FiExternalLink className="w-3.5 h-3.5 text-shopmuted" />
          </a>
        )}

        {/* View Website (homepage) */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 my-1.5 px-3 py-3 rounded-xl border border-shopborder bg-white text-[#677186] hover:bg-[#f5f6fc] hover:text-shopprimary transition-all font-medium text-sm"
        >
          <MdHome size={18} />
          <span className="flex-1">View Website</span>
          <FiExternalLink className="w-3.5 h-3.5 text-shopmuted" />
        </a>

        {/* Navigation */}
        <nav className="flex-1 pt-5 space-y-1">
          <div className="text-[10px] font-bold text-[#a1a8b7] uppercase tracking-wider mb-2.5 px-3">Dashboard</div>

          <NavLink to="/seller/dashboard" end className={navItemClass} onClick={() => closeMobile?.()}>
            <RxDashboard size={18} />
            <span>Overview</span>
          </NavLink>

          <NavLink to="/seller/dashboard/products" className={navItemClass} onClick={() => closeMobile?.()}>
            <MdOutlineGridView size={18} />
            <span>Products</span>
          </NavLink>

          <NavLink to="/seller/dashboard/add-product" className={navItemClass} onClick={() => closeMobile?.()}>
            <MdAddBox size={18} />
            <span>Add Product</span>
          </NavLink>

          <NavLink to="/seller/dashboard/orders" className={navItemClass} onClick={() => closeMobile?.()}>
            <MdShoppingCart size={18} />
            <span>Orders</span>
            {badgePill(pendingOrders)}
          </NavLink>

          <NavLink to="/seller/dashboard/earnings" className={navItemClass} onClick={() => closeMobile?.()}>
            <FiBarChart2 size={18} />
            <span>Earnings</span>
          </NavLink>

          <NavLink to="/seller/dashboard/notifications" className={navItemClass} onClick={() => closeMobile?.()}>
            <FiBell size={18} />
            <span>Notifications</span>
            {badgePill(unreadAlerts)}
          </NavLink>

          <NavLink to="/seller/dashboard/messages" className={navItemClass} onClick={() => closeMobile?.()}>
            <MdMessage size={18} />
            <span>Messages</span>
            {badgePill(unreadMessages)}
          </NavLink>

          <div className="text-[10px] font-bold text-[#a1a8b7] uppercase tracking-wider mt-5 mb-2.5 px-3">Settings</div>

          <NavLink to="/seller/dashboard/settings" className={navItemClass} onClick={() => closeMobile?.()}>
            <MdSettings size={18} />
            <span>Shop Settings</span>
          </NavLink>
        </nav>

        {/* Store card */}
        <div className="m-0 mt-auto p-4 border border-shopborder rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-shopprimarylight flex items-center justify-center text-shopprimary font-bold overflow-hidden">
              {seller?.shopLogo ? (
                <img
                  src={seller.shopLogo}
                  alt={shopName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement.textContent = initial;
                  }}
                />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-shoptext truncate text-xs">{shopName}</p>
              <p className="text-[11px] text-shopmuted leading-relaxed">
                {seller?.status === "approved" ? "Seller account active." : seller?.status === "pending" ? "Seller account pending approval." : "Seller account inactive."}
              </p>
              <span className={`inline-block text-[11px] px-2 py-1 rounded-[5px] mt-2.5 font-semibold ${
                seller?.status === "approved" ? "bg-[#e8f8f0] text-shopgreen" :
                seller?.status === "pending" ? "bg-[#fff3df] text-[#ad6b00]" :
                "bg-[#fdeaea] text-shopred"
              }`}>
                ● {seller?.status || "Pending"}
              </span>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="p-3 mt-4 border-t border-shopborder">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-[#fdeaea] text-shopred hover:bg-[#fbd8d8] transition-all"
          >
            <RxExit size={18} /> Logout
          </button>
        </div>
      </div>
    </>
  );
}
