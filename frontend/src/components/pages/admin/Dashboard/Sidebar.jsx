import React, { useState, useEffect, useCallback, useRef } from "react";
import { NavLink, Link } from "react-router-dom";
import api from "@/utils/api";
import { getPublicSettings } from "@/utils/siteSettings";
import { onSocketEvent } from "@/utils/socket";
import { RxDashboard, RxGear } from "react-icons/rx";
import {
  MdOutlineGridView,
  MdAddBox,
  MdChat,
  MdShoppingCart,
  MdCampaign,
  MdSettings,
} from "react-icons/md";
import { TbUserShield } from "react-icons/tb";
import { FiMessageSquare, FiHelpCircle, FiPackage, FiClock, FiTag } from "react-icons/fi";
import { MdStore } from "react-icons/md";

export default function Sidebar({
  user: initialUser,
  handleLogout,
  closeMobile,
  isMobileOpen,
}) {
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0);
  const [pendingSellersCount, setPendingSellersCount] = useState(0);
  const [pendingReturnsCount, setPendingReturnsCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [imageError, setImageError] = useState(false);
  const [settings, setSettings] = useState(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const sidebarRef = useRef(null);

  // Minimum swipe distance (in pixels)
  const minSwipeDistance = 50;

  // Handle touch events for swipe to close
  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;

    // Swipe left to close sidebar on mobile
    if (isLeftSwipe && isMobileOpen) {
      closeMobile && closeMobile();
    }
  };

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isMobileOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target)
      ) {
        closeMobile && closeMobile();
      }
    };

    if (isMobileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isMobileOpen, closeMobile]);

  // Default image constant
  const DEFAULT_IMAGE =
    "https://img.freepik.com/free-vector/emerald-circle-with-white-user_78370-4707.jpg";

  // Helper function to get correct profile image
  const getProfileImage = (imageUrl) => {
    if (!imageUrl) return DEFAULT_IMAGE;
    if (
      imageUrl.includes("img.freepik.com") ||
      imageUrl.includes("default") ||
      imageUrl.includes("placeholder") ||
      imageUrl === ""
    ) {
      return DEFAULT_IMAGE;
    }
    return imageUrl;
  };

  // Fetch user data immediately
  const fetchUserData = useCallback(async () => {
    if (!localStorage.getItem("token")) return;
    try {
      const userResponse = await api.get(`/api/users/me`);

      if (userResponse.data && userResponse.data.user) {
        const userData = userResponse.data.user;
        setCurrentUser(userData);

        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        storedUser.profileImage = userData.profileImage;
        storedUser.name = userData.name;
        storedUser.email = userData.email;
        localStorage.setItem("user", JSON.stringify(storedUser));
      }
    } catch (err) {
      console.error("Sidebar User Fetch Error:", err);
    }
  }, []);

  // Fetch badge data including pending feedback
  const fetchBadgeData = useCallback(async () => {
    if (!localStorage.getItem("token")) return;
    try {
      // Fetch Pending Orders
      const ordersResponse = await api.get(
        `/api/orders/userplace/orders`,
      );
      const oCount = (ordersResponse.data.orders || []).filter(
        (order) => order.orderStatus === "pending",
      ).length;
      setPendingOrdersCount(oCount);
      localStorage.setItem("pendingOrdersCount", oCount);

      // Fetch Unread Notifications (Admin)
      const notifyResponse = await api.get(
        `/api/notifications/admin/unread-count`,
      );

      let unreadCount = 0;
      if (notifyResponse.data && typeof notifyResponse.data === "object") {
        unreadCount = notifyResponse.data.count || 0;
      } else if (typeof notifyResponse.data === "number") {
        unreadCount = notifyResponse.data;
      }
      setUnreadNotifications(unreadCount);
      // Cache for instant display on next load
      localStorage.setItem("unreadNotificationsCount", unreadCount);

      // ✅ Fetch Pending Feedback (status = "pending")
      const feedbackResponse = await api.get(
        `/api/feedback?status=pending&limit=100`,
      );

      const feedbacks = Array.isArray(feedbackResponse.data)
        ? feedbackResponse.data
        : feedbackResponse.data?.feedback || feedbackResponse.data?.data || [];

      const pendingCount = feedbacks.filter(
        (feedback) => feedback.status === "pending",
      ).length;

      setPendingFeedbackCount(pendingCount);
      localStorage.setItem("pendingFeedbackCount", pendingCount);

      // Fetch Pending Sellers
      const sellersRes = await api.get("/api/sellers/admin/stats");
      const pCount = sellersRes.data?.stats?.pendingSellers || 0;
      setPendingSellersCount(pCount);
      localStorage.setItem("pendingSellersCount", pCount);

      // Fetch Pending Returns
      const returnsRes = await api.get("/api/feedback/returns?status=pending&limit=1");
      const rCount = returnsRes.data?.total || 0;
      setPendingReturnsCount(rCount);
      localStorage.setItem("pendingReturnsCount", rCount);

      // Fetch Pending Product Approvals
      const approvalsRes = await api.get("/api/products/admin/pending-approvals");
      const paCount = approvalsRes.data?.count || 0;
      setPendingApprovalsCount(paCount);
      localStorage.setItem("pendingApprovalsCount", paCount);
    } catch (err) {
      console.error("Sidebar Badge Fetch Error:", err);
      // Fallback to cached values
      const cachedOrders = localStorage.getItem("pendingOrdersCount");
      const cachedUnread = localStorage.getItem("unreadNotificationsCount");
      const cachedFeedback = localStorage.getItem("pendingFeedbackCount");
      const cachedSellers = localStorage.getItem("pendingSellersCount");
      const cachedReturns = localStorage.getItem("pendingReturnsCount");
      const cachedApprovals = localStorage.getItem("pendingApprovalsCount");
      if (cachedOrders !== null) setPendingOrdersCount(parseInt(cachedOrders) || 0);
      if (cachedUnread !== null) setUnreadNotifications(parseInt(cachedUnread) || 0);
      if (cachedFeedback !== null) setPendingFeedbackCount(parseInt(cachedFeedback) || 0);
      if (cachedSellers !== null) setPendingSellersCount(parseInt(cachedSellers) || 0);
      if (cachedReturns !== null) setPendingReturnsCount(parseInt(cachedReturns) || 0);
      if (cachedApprovals !== null) setPendingApprovalsCount(parseInt(cachedApprovals) || 0);
    }
  }, []);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = (event) => {
      const newImageUrl = event.detail;
      if (newImageUrl) {
        setCurrentUser((prev) => ({
          ...prev,
          profileImage: newImageUrl,
        }));
        setImageError(false);
      }
    };

    window.addEventListener("profileUpdate", handleProfileUpdate);
    return () => {
      window.removeEventListener("profileUpdate", handleProfileUpdate);
    };
  }, []);

  // Listen for auth changes
  useEffect(() => {
    const handleAuthChange = () => {
      fetchBadgeData();
    };

    window.addEventListener("authChange", handleAuthChange);

    return () => {
      window.removeEventListener("authChange", handleAuthChange);
    };
  }, [fetchBadgeData]);

  // Listen for feedback updates (to refresh badge in real-time)
  useEffect(() => {
    const handleFeedbackUpdate = () => {
      fetchBadgeData();
    };

    window.addEventListener("feedbackUpdated", handleFeedbackUpdate);
    return () => {
      window.removeEventListener("feedbackUpdated", handleFeedbackUpdate);
    };
  }, [fetchBadgeData]);

  // Listen for admin notification changes (mark read in chat center)
  useEffect(() => {
    const handleNotificationsUpdated = () => {
      fetchBadgeData();
    };

    window.addEventListener("notificationsUpdated", handleNotificationsUpdated);
    return () => {
      window.removeEventListener("notificationsUpdated", handleNotificationsUpdated);
    };
  }, [fetchBadgeData]);

  // Listen for settings updates (detail carries the fresh settings)
  useEffect(() => {
    const handleSettingsUpdate = (e) => {
      if (e.detail) setSettings(e.detail);
    };
    window.addEventListener("settingsUpdated", handleSettingsUpdate);
    return () => window.removeEventListener("settingsUpdated", handleSettingsUpdate);
  }, []);

  // Initial fetch with cached values for instant display
  useEffect(() => {
    // Load cached values immediately for instant badge display
    const cachedOrders = localStorage.getItem("pendingOrdersCount");
    const cachedUnread = localStorage.getItem("unreadNotificationsCount");
    const cachedFeedback = localStorage.getItem("pendingFeedbackCount");
    const cachedSellers = localStorage.getItem("pendingSellersCount");
    const cachedReturns = localStorage.getItem("pendingReturnsCount");
    if (cachedOrders !== null) setPendingOrdersCount(parseInt(cachedOrders) || 0);
    if (cachedUnread !== null) setUnreadNotifications(parseInt(cachedUnread) || 0);
    if (cachedFeedback !== null) setPendingFeedbackCount(parseInt(cachedFeedback) || 0);
    if (cachedSellers !== null) setPendingSellersCount(parseInt(cachedSellers) || 0);
    if (cachedReturns !== null) setPendingReturnsCount(parseInt(cachedReturns) || 0);

    // Fetch fresh data once; live updates arrive via the socket (no HTTP polling)
    fetchUserData();
    fetchBadgeData();
    getPublicSettings().then((s) => {
      if (s) setSettings(s);
    }).catch(() => {});
  }, [fetchUserData, fetchBadgeData]);

  // Real-time: refresh the badge counts when the backend signals a change
  // (new order / order status change / new pending feedback / new seller /
  // new admin notification from a seller activity event)
  useEffect(() => {
    return onSocketEvent(["admin:stats-changed", "chat:unseen-user"], () => fetchBadgeData());
  }, [fetchBadgeData]);

  // Get from localStorage for faster load
  const localStorageUserLoaded = useRef(false);
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser && !currentUser && !localStorageUserLoaded.current) {
      localStorageUserLoaded.current = true;
      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
      } catch (_e) {}
    }
  }, [currentUser]);

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 sm:px-4 sm:py-3 rounded-xl transition-all duration-200 min-h-[48px] ${
      isActive
        ? "bg-brand-50 text-brand-700 font-medium shadow-sm"
        : "hover:bg-brand-50 text-gray-700 hover:translate-x-1"
    }`;

  const profileImageUrl = getProfileImage(currentUser?.profileImage);
  const userInitial = currentUser?.name?.charAt(0).toUpperCase() || "A";

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm transition-all duration-300 ${isMobileOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}
        onClick={() => closeMobile && closeMobile()}
      />

      {/* Sidebar Container with Swipe Support */}
      <div
        ref={sidebarRef}
        className={`
          fixed top-0 left-0 h-screen bg-white border-r border-slate-200 shadow-2xl z-40
          flex flex-col overflow-y-auto
          transition-transform duration-300 ease-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:sticky lg:w-72
          w-72
        `}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle - Visual indicator for swipe (mobile only) */}
        <div className="lg:hidden absolute top-1/2 -right-3 transform -translate-y-1/2 w-1.5 h-16 bg-gray-300 rounded-full opacity-50 pointer-events-none"></div>

        {/* Logo Section */}
        <div className="flex items-center justify-between p-4 sm:p-5 md:p-6 border-b border-gray-200">
          <Link
            to="/"
            className="flex items-center group flex-1"
            onClick={() => closeMobile && setTimeout(() => closeMobile(), 100)}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gradient-to-r from-brand-600 to-brand-800 rounded-lg flex items-center justify-center mr-2 sm:mr-3 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <RxGear className="text-white text-lg sm:text-xl" />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 group-hover:text-brand-600 transition-colors">
                AdminPanel
              </span>
              <span className="block text-[8px] sm:text-[9px] md:text-[10px] text-gray-500 -mt-0.5">
                Admin Dashboard
              </span>
            </div>
          </Link>

          {/* Mobile Close Button */}
          <button
            onClick={() => closeMobile && closeMobile()}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
            aria-label="Close sidebar"
          >
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* User Info */}
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-brand-100 flex items-center justify-center bg-gradient-to-r from-brand-500 to-indigo-600 shadow-sm flex-shrink-0">
              {profileImageUrl && !imageError ? (
                <img
                  src={profileImageUrl}
                  alt={currentUser?.name || "Admin"}
                  className="w-full h-full object-cover"
                  loading="eager"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = DEFAULT_IMAGE;
                    setImageError(true);
                  }}
                />
              ) : (
                <span className="text-white font-bold text-base sm:text-lg">
                  {userInitial}
                </span>
              )}
            </div>
            <div className="overflow-hidden min-w-0 flex-1">
              <div className="font-semibold text-gray-800 truncate text-xs sm:text-sm md:text-base">
                {currentUser?.name || "Admin User"}
              </div>
              <div className="text-[8px] sm:text-[9px] md:text-[10px] mt-0.5 px-1.5 sm:px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full inline-block font-bold uppercase">
                {currentUser?.role || "Administrator"}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation - Scrollable */}
        <nav
          className="flex-1 py-4 sm:py-5 md:py-6 px-2 sm:px-3 md:px-4 space-y-1"
        >
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
            Management
          </div>

          {/* Home Link */}
              <NavLink
                to="/"
                className="flex items-center group flex-shrink-0"
                onClick={() => closeMobile && setTimeout(() => closeMobile(), 100)}
              >
                <div className={`w-9 h-9 rounded-[12px] flex items-center justify-center font-bold text-xl shadow-md overflow-hidden ${settings?.logo ? "bg-white border border-slate-200" : "bg-brand-500 shadow-brand-300 group-hover:rotate-6 transition-transform text-white"}`}>
                  {settings?.logo ? (
                    <img src={settings.logo} alt={settings.brandName || "Logo"} className="w-full h-full object-cover" />
                  ) : (
                    (settings?.iconLetter && settings.iconLetter !== "M") ? settings.iconLetter : ((settings?.brandName || "M").trim().charAt(0) || "M").toUpperCase()
                  )}
                </div>
                <span className="text-xl font-black tracking-[-0.5px] text-slate-700">
                  <span className="text-brand-500">{settings?.brandName || "MYBRAND"}</span>
                </span>
              </NavLink>

          {/* Dashboard */}
          <NavLink
            to="/admin/dashboard"
            end
            className={navItemClass}
            onClick={() => closeMobile && setTimeout(() => closeMobile(), 100)}
          >
            <RxDashboard size={20} className="text-brand-600" />
            <span className="text-sm font-medium">Overview</span>
          </NavLink>

          {/* PRODUCTS */}
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-3 px-2">
            Products
          </div>

          {/* Products Section */}
          <NavLink
            to="/admin/dashboard/adminviewproducts"
            className={navItemClass}
            onClick={() => closeMobile && setTimeout(() => closeMobile(), 100)}
          >
            <MdOutlineGridView
              size={20}
              className="text-brand-600"
            />
            <span className="text-sm font-medium">
              View Products
            </span>
          </NavLink>

          <NavLink
            to="/admin/dashboard/addproducts"
            className={navItemClass}
            onClick={() => closeMobile && setTimeout(() => closeMobile(), 100)}
          >
            <MdAddBox size={20} className="text-brand-600" />
            <span className="text-sm font-medium">Add Product</span>
          </NavLink>

          {/* Pending Product Approvals with Badge */}
          <NavLink
            to="/admin/dashboard/pendingproducts"
            className={navItemClass}
            onClick={() => closeMobile && setTimeout(() => closeMobile(), 100)}
          >
            <div className="relative">
              <FiClock size={20} className="text-brand-600" />
              {pendingApprovalsCount > 0 && (
                <span className="absolute -top-1 -right-2 flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-red-500"></span>
                </span>
              )}
            </div>
            <span className="flex-1 text-sm font-medium">
              Pending Approvals
            </span>
            {pendingApprovalsCount > 0 && (
              <span className="bg-red-500 text-white text-[8px] sm:text-[9px] md:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full">
                {pendingApprovalsCount}
              </span>
            )}
          </NavLink>

          {/* SALES */}
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-3 px-2">
            Sales
          </div>

          {/* Orders with Badge */}
          <NavLink
            to="/admin/dashboard/orders"
            className={navItemClass}
            onClick={() => closeMobile && setTimeout(() => closeMobile(), 100)}
          >
            <div className="relative">
              <MdShoppingCart
                size={20}
                className="text-brand-600"
              />
              {pendingOrdersCount > 0 && (
                <span className="absolute -top-1 -right-2 flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-red-500"></span>
                </span>
              )}
            </div>
            <span className="flex-1 text-sm font-medium">Orders</span>
            {pendingOrdersCount > 0 && (
              <span className="bg-red-500 text-white text-[8px] sm:text-[9px] md:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full shadow-md animate-pulse">
                {pendingOrdersCount} NEW
              </span>
            )}
          </NavLink>



          {/* Returns Management with Badge */}
          <NavLink
            to="/admin/dashboard/returns"
            className={navItemClass}
            onClick={() => closeMobile && setTimeout(() => closeMobile(), 100)}
          >
            <div className="relative">
              <FiPackage size={20} className="text-brand-600" />
              {pendingReturnsCount > 0 && (
                <span className="absolute -top-1 -right-2 flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-yellow-500"></span>
                </span>
              )}
            </div>
            <span className="flex-1 text-sm font-medium">Returns & Refunds</span>
            {pendingReturnsCount > 0 && (
              <span className="bg-yellow-500 text-white text-[8px] sm:text-[9px] md:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full shadow-md animate-pulse">
                {pendingReturnsCount} PENDING
              </span>
            )}
          </NavLink>

          {/* Coupons */}
          <NavLink
            to="/admin/dashboard/coupons"
            className={navItemClass}
            onClick={() => closeMobile && setTimeout(() => closeMobile(), 100)}
          >
            <FiTag size={20} className="text-brand-600" />
            <span className="text-sm font-medium">
              Coupons
            </span>
          </NavLink>

          {/* SUPPORT */}
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-3 px-2">
            Support
          </div>

          {/* Customer Support with Badge */}
          <NavLink
            to="/admin/dashboard/notification"
            className={navItemClass}
            onClick={() => closeMobile && setTimeout(() => closeMobile(), 100)}
          >
            <div className="relative">
              <MdChat
                size={20}
                className="text-brand-600"
              />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-2 flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-red-500"></span>
                </span>
              )}
            </div>
            <span className="flex-1 text-sm font-medium">
              Customer Support
            </span>
            {unreadNotifications > 0 && (
              <span className="bg-red-500 text-white text-[8px] sm:text-[9px] md:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full">
                {unreadNotifications}
              </span>
            )}
          </NavLink>

          {/* ✅ Feedback Management Link with Badge */}
          <NavLink
            to="/admin/dashboard/feedback"
            className={navItemClass}
            onClick={() => closeMobile && setTimeout(() => closeMobile(), 100)}
          >
            <div className="relative">
              <FiMessageSquare
                size={20}
                className="text-brand-600"
              />
              {pendingFeedbackCount > 0 && (
                <span className="absolute -top-1 -right-2 flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-yellow-500"></span>
                </span>
              )}
            </div>
            <span className="flex-1 text-sm font-medium">
              Feedback Reviews
            </span>
            {pendingFeedbackCount > 0 && (
              <span className="bg-yellow-500 text-white text-[8px] sm:text-[9px] md:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full shadow-md animate-pulse">
                {pendingFeedbackCount} PENDING
              </span>
            )}
          </NavLink>

           {/* Q&A Management */}
           <NavLink
             to="/admin/dashboard/questions"
             className={navItemClass}
             onClick={() => closeMobile && setTimeout(() => closeMobile(), 100)}
           >
             <FiHelpCircle size={20} className="text-brand-600" />
             <span className="text-sm font-medium">Q&A Management</span>
           </NavLink>

          {/* PEOPLE */}
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-3 px-2">
            People
          </div>

          {/* User Management */}
          <NavLink
            to="/admin/dashboard/user-privileges"
            className={navItemClass}
            onClick={() => closeMobile && setTimeout(() => closeMobile(), 100)}
          >
            <TbUserShield size={20} className="text-brand-600" />
            <span className="flex-1 text-sm font-medium">
              User Management
            </span>
          </NavLink>

          {/* Seller Management */}
          <NavLink
            to="/admin/dashboard/sellers"
            className={navItemClass}
            onClick={() => closeMobile && setTimeout(() => closeMobile(), 100)}
          >
            <div className="relative">
              <MdStore size={20} className="text-brand-600" />
              {pendingSellersCount > 0 && (
                <span className="absolute -top-1 -right-2 flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-yellow-500"></span>
                </span>
              )}
            </div>
            <span className="flex-1 text-sm font-medium">
              Sellers
            </span>
            {pendingSellersCount > 0 && (
              <span className="bg-yellow-500 text-white text-[8px] sm:text-[9px] md:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full shadow-md animate-pulse">
                {pendingSellersCount} PENDING
              </span>
            )}
          </NavLink>

          {/* SITE */}
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-3 px-2">
            Site
          </div>

          {/* Home & Marketing */}
          <NavLink
            to="/admin/dashboard/home-marketing"
            className={navItemClass}
            onClick={() => closeMobile && setTimeout(() => closeMobile(), 100)}
          >
            <MdCampaign size={20} className="text-brand-600" />
            <span className="text-sm font-medium">
              Home & Marketing
            </span>
          </NavLink>

          {/* Settings */}
          <NavLink
            to="/admin/dashboard/settings"
            className={navItemClass}
            onClick={() => closeMobile && setTimeout(() => closeMobile(), 100)}
          >
            <MdSettings size={20} className="text-brand-600" />
            <span className="text-sm font-medium">Site Settings</span>
          </NavLink>
        </nav>


        {/* Swipe Hint - Mobile Only */}
        {isMobileOpen && (
          <div className="lg:hidden absolute bottom-20 left-1/2 transform -translate-x-1/2 text-center pointer-events-none">
            <p className="text-[10px] text-gray-400 flex items-center gap-1 justify-center">
              <span>←</span> Swipe left to close <span>←</span>
            </p>
          </div>
        )}
      </div>
    </>
  );
}

