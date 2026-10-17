import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Menu, Search, SlidersHorizontal, LifeBuoy, Settings, LogOut, UserRound, Info,
} from "lucide-react";
import EmailAvatar from "./EmailAvatar.jsx";

export default function EmailTopBar({
  me,
  query,
  onQueryChange,
  advOpen,
  onToggleAdv,
  onToggleSidebar,
  density,
  onDensityChange,
  defaultCat,
  onDefaultCatChange,
  signature,
  onSignatureChange,
}) {
  const navigate = useNavigate();
  const [menu, setMenu] = useState(null); // "help" | "settings" | "profile" | null

  const closeMenu = () => setMenu(null);

  const logout = () => {
    closeMenu();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
    toast.success("Signed out");
    navigate("/login");
  };

  const menuItem = (cls = "w-full px-4 py-2 text-left text-sm text-[#3c4043] hover:bg-[#f5f5f5]") => cls;

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 border-b border-[#e1e3e6] bg-white px-2 sm:gap-3 sm:px-4">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="rounded-full p-2 text-[#5f6368] hover:bg-[#f5f5f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b57d0]"
        aria-label="Toggle navigation sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="flex h-10 max-w-[680px] flex-1 items-center gap-3 rounded-full bg-[#f5f5f5] px-4 transition focus-within:bg-white focus-within:shadow-[0_1px_2px_0_rgba(60,64,67,0.3)]">
        <Search size={18} className="shrink-0 text-[#5f6368]" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search mail"
          aria-label="Search mail"
          className="min-w-0 flex-1 bg-transparent text-sm text-[#202124] placeholder:text-[#84868b] focus:outline-none"
        />
        <button
          type="button"
          onClick={onToggleAdv}
          className={advOpen ? "rounded-full bg-[#e8f0fe] p-1 text-[#0b57d0]" : "rounded-full p-1 text-[#5f6368] hover:bg-[#e9e9e9]"}
          aria-label="Toggle advanced search"
          aria-pressed={advOpen}
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
        <button
          type="button"
          onClick={() => setMenu(menu === "help" ? null : "help")}
          className="rounded-full p-2 text-[#5f6368] hover:bg-[#f5f5f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b57d0]"
          aria-label="Help"
          aria-haspopup="menu"
          aria-expanded={menu === "help"}
        >
          <LifeBuoy size={19} />
        </button>
        <button
          type="button"
          onClick={() => setMenu(menu === "settings" ? null : "settings")}
          className="rounded-full p-2 text-[#5f6368] hover:bg-[#f5f5f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b57d0]"
          aria-label="Settings"
          aria-haspopup="menu"
          aria-expanded={menu === "settings"}
        >
          <Settings size={19} />
        </button>
        <button
          type="button"
          onClick={() => setMenu(menu === "profile" ? null : "profile")}
          className="relative rounded-full p-1.5 hover:bg-[#f5f5f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b57d0]"
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={menu === "profile"}
        >
          <EmailAvatar name={me.name} color="#0b57d0" size={30} />
        </button>
      </div>

      {/* Click-away layer */}
      {menu && <div className="fixed inset-0 z-40" onClick={closeMenu} aria-hidden="true" />}

      {/* Help menu */}
      {menu === "help" && (
        <div role="menu" className="absolute right-2 top-[52px] z-50 w-60 rounded-md border border-[#dadce0] bg-white py-1.5 shadow-[0_2px_10px_2px_rgba(60,64,67,0.2)]">
          <button className={menuItem()} role="menuitem" onClick={() => { closeMenu(); toast("Help center (demo) — no external links in this build."); }}>
            Help center
          </button>
          <button
            className={menuItem()}
            role="menuitem"
            onClick={() => {
              closeMenu();
              toast.success("Shortcuts: ↑/↓ select · Enter open · s star · a select all · r reply · d archive · Esc close");
            }}
          >
            Keyboard shortcuts
          </button>
          <button className={menuItem()} role="menuitem" onClick={() => { closeMenu(); toast("Feedback recorded (demo)."); }}>
            Send feedback
          </button>
        </div>
      )}

      {/* Settings menu */}
      {menu === "settings" && (
        <div role="menu" className="absolute right-2 top-[52px] z-50 w-72 rounded-md border border-[#dadce0] bg-white py-1.5 shadow-[0_2px_10px_2px_rgba(60,64,67,0.2)]">
          <button
            className={`${menuItem()} flex items-center gap-2`}
            role="menuitem"
            onClick={() => { closeMenu(); onDensityChange(density === "comfortable" ? "compact" : "comfortable"); }}
          >
            <Settings size={15} aria-hidden="true" />
            {density === "comfortable" ? "Set compact density" : "Set comfortable density"}
          </button>
          <div className="mt-1 border-t border-[#f0f0f0] px-4 py-2 text-xs font-medium text-[#84868b]">
            Inbox density
          </div>
          {["comfortable", "compact"].map((d) => (
            <button
              key={d}
              role="menuitemradio"
              aria-checked={density === d}
              className={`${menuItem()} flex items-center gap-2 capitalize`}
              onClick={() => onDensityChange(d)}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                  density === d ? "border-[#0b57d0] bg-[#0b57d0]" : "border-[#9aa0a6]"
                }`}
                aria-hidden="true"
              >
                {density === d && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              {d}
            </button>
          ))}
          <div className="mt-1 border-t border-[#f0f0f0] px-4 py-2 text-xs font-medium text-[#84868b]">
            Default inbox tab
          </div>
          {["all", "primary", "promotions", "social"].map((c) => (
            <button
              key={c}
              role="menuitemradio"
              aria-checked={defaultCat === c}
              className={`${menuItem()} flex items-center gap-2 capitalize`}
              onClick={() => onDefaultCatChange(c)}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                  defaultCat === c ? "border-[#0b57d0] bg-[#0b57d0]" : "border-[#9aa0a6]"
                }`}
                aria-hidden="true"
              >
                {defaultCat === c && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              {c}
            </button>
          ))}
          <div className="mt-1 border-t border-[#f0f0f0] px-4 py-2">
            <label className="text-xs font-medium text-[#84868b]" htmlFor="em-signature">
              Signature (appended to new messages)
            </label>
            <input
              id="em-signature"
              type="text"
              value={signature}
              onChange={(e) => onSignatureChange(e.target.value)}
              placeholder="e.g. Alex — Seller @ Blueprint Studio"
              className="mt-1 w-full rounded border border-[#dadce0] px-2.5 py-1.5 text-sm focus:border-[#0b57d0] focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Profile menu */}
      {menu === "profile" && (
        <div role="menu" className="absolute right-2 top-[52px] z-50 w-64 rounded-md border border-[#dadce0] bg-white py-1.5 shadow-[0_2px_10px_2px_rgba(60,64,67,0.2)]">
          <div className="flex items-center gap-3 px-4 pb-2 pt-1.5">
            <EmailAvatar name={me.name} color="#0b57d0" size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#202124]">{me.name}</p>
              <p className="truncate text-xs text-[#5f6368]">{me.email}</p>
            </div>
          </div>
          <button
            className={menuItem()}
            role="menuitem"
            onClick={() => { closeMenu(); navigate("/profile"); }}
          >
            <span className="flex items-center gap-2"><UserRound size={15} aria-hidden="true" /> Manage profile</span>
          </button>
          <button className={menuItem()} role="menuitem" onClick={() => { closeMenu(); toast("Connected as demo account (mock)."); }}>
            <span className="flex items-center gap-2"><Info size={15} aria-hidden="true" /> About this demo mailbox</span>
          </button>
          <div className="my-1 border-t border-[#f0f0f0]" />
          <button className={menuItem()} role="menuitem" onClick={logout}>
            <span className="flex items-center gap-2"><LogOut size={15} aria-hidden="true" /> Sign out</span>
          </button>
        </div>
      )}
    </header>
  );
}
