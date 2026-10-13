import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { RxHamburgerMenu } from "react-icons/rx";
import { FiSearch, FiBell, FiPlus } from "react-icons/fi";

export default function TopBar({ user, mobileOpen, toggleMobile }) {
  const currentPage = window.location.pathname.split("/").pop() || "Dashboard";
  const pageTitle = currentPage.charAt(0).toUpperCase() + currentPage.slice(1).replace(/-/g, " ");
  const [imageError, setImageError] = useState(false);

  const getProfileImage = (imageUrl) => {
    if (!imageUrl) return null;
    if (
      imageUrl.includes("img.freepik.com") ||
      imageUrl.includes("default") ||
      imageUrl.includes("placeholder") ||
      imageUrl === ""
    ) {
      return null;
    }
    return imageUrl;
  };

  const profileImageUrl = getProfileImage(user?.profileImage);
  const userInitial = user?.name?.charAt(0).toUpperCase() || "A";

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={toggleMobile} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <RxHamburgerMenu size={24} />
          </button>
          <h1 className="text-lg font-bold text-slate-900">{pageTitle || "Dashboard"}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <FiSearch size={20} />
          </button>
          <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg relative">
            <FiBell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden">
            {profileImageUrl && !imageError ? (
              <img src={profileImageUrl} alt={user?.name || "A"} className="w-full h-full object-cover" onError={() => setImageError(true)} />
            ) : (
              userInitial
            )}
          </div>
        </div>
      </div>

      {/* Desktop Header - Sticky below sidebar */}
      <div className="hidden lg:flex sticky top-0 bg-white border-b border-slate-200 px-6 py-3 items-center justify-between z-40">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-900">{pageTitle || "Dashboard"}</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 bg-slate-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-64"
            />
          </div>
          
          {/* Notifications */}
          <button className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl relative">
            <FiBell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          
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
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center text-white font-bold overflow-hidden">
            {profileImageUrl && !imageError ? (
              <img src={profileImageUrl} alt={user?.name || "A"} className="w-full h-full object-cover" onError={() => setImageError(true)} />
            ) : (
              userInitial
            )}
          </div>
            <div className="hidden xl:block">
              <p className="text-sm font-semibold text-slate-900">{user?.name || "Admin"}</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
