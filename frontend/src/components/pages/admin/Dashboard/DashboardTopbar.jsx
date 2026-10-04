import React, { useEffect, useState, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { RxHamburgerMenu, RxExit } from "react-icons/rx";
import { FiSearch, FiPlus, FiX } from "react-icons/fi";
import NotificationDrop from "@/components/utils/NotificationDrop";
import {
  MdOutlineGridView,
  MdAddBox,
  MdNotifications,
  MdShoppingCart,
  MdCampaign,
  MdMiscellaneousServices,
  MdTrendingUp,
  MdStars,
  MdStore,

} from "react-icons/md";
import { RxDashboard } from "react-icons/rx";
import { TbUserShield } from "react-icons/tb";
import { FiMessageSquare, FiHelpCircle } from "react-icons/fi";
const PAGE_TITLES = {
  "adminviewproducts": "Products",
  "addproducts": "Add Product",
  "editproducts": "Edit Product",
  "orders": "Orders",
  "notification": "Chat Center",
  "ads": "Ads Management",
  "announcements": "Announcements",
  "home-services-management": "Services",
  "user-privileges": "Users",
  "feedback": "Feedback",
  "trending": "Trending Searches",
  "features": "Home Features",
  "settings": "Settings",
  "sellers": "Sellers",
  "questions": "Q&A Management",
};

const DASHBOARD_ROUTES = [
  { label: "Overview",         path: "/admin/dashboard",              icon: RxDashboard,          keywords: ["dashboard", "stats", "analytics"] },
  { label: "View Products",    path: "/admin/dashboard/adminviewproducts", icon: MdOutlineGridView, keywords: ["products", "inventory", "list", "all"] },
  { label: "Add Product",      path: "/admin/dashboard/addproducts",  icon: MdAddBox,             keywords: ["create", "new", "add product"] },
  { label: "Orders",           path: "/admin/dashboard/orders",       icon: MdShoppingCart,       keywords: ["sales", "transactions", "purchases"] },
  { label: "Notifications",    path: "/admin/dashboard/notification", icon: MdNotifications,      keywords: ["chat", "messages", "alerts", "inbox"] },
  { label: "Ads Management",   path: "/admin/dashboard/ads",          icon: MdCampaign,           keywords: ["ads", "campaigns", "marketing", "promotions"] },
  { label: "Announcements",    path: "/admin/dashboard/announcements", icon: MdCampaign,           keywords: ["announcements", "ticker", "marquee", "news"] },
  { label: "Home Services",    path: "/admin/dashboard/home-services-management", icon: MdMiscellaneousServices, keywords: ["services", "home page"] },
  { label: "Users",            path: "/admin/dashboard/user-privileges", icon: TbUserShield,      keywords: ["users", "permissions", "roles", "customers"] },
  { label: "Feedback",         path: "/admin/dashboard/feedback",     icon: FiMessageSquare,      keywords: ["reviews", "ratings", "testimonials"] },
  { label: "Trending",         path: "/admin/dashboard/trending",     icon: MdTrendingUp,         keywords: ["trending", "popular", "searches"] },
  { label: "Home Features",    path: "/admin/dashboard/features",     icon: MdStars,              keywords: ["features", "premium", "cards", "icons"] },
  { label: "Sellers",          path: "/admin/dashboard/sellers",      icon: MdStore,              keywords: ["sellers", "vendors", "merchants", "applications"] },
  { label: "Q&A Management",   path: "/admin/dashboard/questions",    icon: FiHelpCircle,         keywords: ["questions", "answers", "qa", "faq"] },
];

export default function DashboardTopbar({ user, mobileOpen, toggleMobile }) {
  const navigate = useNavigate();
  const currentPage = window.location.pathname.split("/").pop() || "dashboard";
  const pageTitle = PAGE_TITLES[currentPage] || currentPage.charAt(0).toUpperCase() + currentPage.slice(1).replace(/-/g, " ");

  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const searchRef = useRef(null);
  const mobileSearchRef = useRef(null);

  const filteredRoutes = searchQuery.length >= 1
    ? DASHBOARD_ROUTES.filter((r) => {
        const q = searchQuery.toLowerCase();
        return (
          r.label.toLowerCase().includes(q) ||
          r.keywords.some((k) => k.includes(q))
        );
      })
    : [];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (showMobileSearch && mobileSearchRef.current) {
      mobileSearchRef.current.focus();
    }
  }, [showMobileSearch]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.length >= 1) setShowDropdown(true);
    else setShowDropdown(false);
  };

  const handleNavigate = (path) => {
    setSearchQuery("");
    setShowDropdown(false);
    setShowMobileSearch(false);
    navigate(path);
  };

  const renderDropdown = () => (
    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
      {filteredRoutes.length === 0 ? (
        <div className="px-4 py-3 text-sm text-slate-400 text-center">No pages match "{searchQuery}"</div>
      ) : (
        filteredRoutes.map((r) => {
          const IconComp = r.icon;
          return (
            <button
              key={r.path}
              type="button"
              onClick={() => handleNavigate(r.path)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                <IconComp size={16} className="text-brand-600" />
              </div>
              <span className="text-sm font-medium text-slate-900">{r.label}</span>
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden sticky top-0 left-0 right-0 h-11 bg-white border-b border-slate-200 px-4 flex justify-between items-center z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={toggleMobile} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <RxHamburgerMenu size={24} />
          </button>
          <h1 className="text-lg font-bold text-slate-900">{pageTitle || "Dashboard"}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowMobileSearch(!showMobileSearch)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <FiSearch size={20} />
          </button>
          <NotificationDrop />
          {user?.profileImage ? (
            <img src={user.profileImage} alt="" className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-7 h-7 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
              {user?.name?.charAt(0) || "A"}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Bar */}
      {showMobileSearch && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 relative" ref={searchRef}>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              ref={mobileSearchRef}
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => filteredRoutes.length > 0 && setShowDropdown(true)}
              className="w-full pl-10 pr-10 py-2 bg-slate-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <button type="button" onClick={() => { setShowMobileSearch(false); setSearchQuery(""); setShowDropdown(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <FiX size={18} />
            </button>
          </div>
          {showDropdown && renderDropdown()}
        </div>
      )}

      {/* Desktop Header */}
      <div className="hidden lg:flex sticky top-0 h-12 bg-white border-b border-slate-200 px-6 items-center justify-end z-40">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative" ref={searchRef}>
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => filteredRoutes.length > 0 && setShowDropdown(true)}
              className="pl-10 pr-4 py-2 bg-slate-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-64"
            />
            {showDropdown && renderDropdown()}
          </div>
          
          {/* Notifications */}
          <NotificationDrop />
          
          {/* Add Button */}
          <NavLink
            to="/admin/dashboard/addproducts"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors"
          >
            <FiPlus size={18} />
            <span className="text-sm font-medium">Add Product</span>
          </NavLink>
          
          {/* User */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            {user?.profileImage ? (
              <img src={user.profileImage} alt="" className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0) || "A"}
              </div>
            )}
            <div className="hidden xl:block">
              <p className="text-sm font-semibold text-slate-900">{user?.name || "Admin"}</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("userRole");
              localStorage.removeItem("user");
              window.dispatchEvent(new Event("authChange"));
              navigate("/login");
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-all duration-200 active:scale-95"
            title="Logout"
          >
            <RxExit size={16} className="text-red-500" />
            <span className="hidden xl:inline text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
