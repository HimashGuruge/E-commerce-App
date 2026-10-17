import React from "react";
import {
  Mail, Plus, Inbox, Star, AlarmClock, Send, FileText, Zap, ShieldAlert, Trash2, X,
} from "lucide-react";

const NAV_ITEMS = [
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "starred", label: "Starred", icon: Star },
  { key: "snoozed", label: "Snoozed", icon: AlarmClock },
  { key: "sent", label: "Sent", icon: Send },
  { key: "drafts", label: "Drafts", icon: FileText },
  { key: "important", label: "Important", icon: Zap },
  { key: "spam", label: "Spam", icon: ShieldAlert },
  { key: "trash", label: "Trash", icon: Trash2 },
];

export const EMAIL_LABELS = [
  { name: "Work", color: "#1a73e8" },
  { name: "ShopVerse", color: "#0b57d0" },
  { name: "Personal", color: "#188038" },
];

export default function EmailSidebar({
  open, active, counts, onNavigate, onClose, onCompose,
}) {
  if (!open) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={onClose} aria-hidden="true" />

      <aside
        className="fixed inset-y-0 left-0 z-50 flex w-[224px] shrink-0 flex-col border-r border-[#e0e0e0] bg-white md:static md:z-auto"
        aria-label="Mail navigation"
      >
        {/* Logo row */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <Mail size={22} className="text-[#0b57d0]" aria-hidden="true" />
            <span className="text-xl font-light tracking-wide text-[#5f6368]">Mailbox</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#5f6368] hover:bg-[#f5f5f5] md:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Compose */}
        <div className="px-3 pt-3 pb-2">
          <button
            type="button"
            onClick={onCompose}
            className="flex w-max items-center gap-2.5 rounded-xl bg-[#c2e7ff] px-5 py-3 text-sm font-medium text-[#001d35] shadow-sm transition hover:bg-[#aaddff] hover:shadow focus:bg-[#aaddff] focus-visible:ring-2 focus-visible:ring-[#0b57d0]"
          >
            <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
            Compose
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 pt-1">
          <ul className="space-y-0.5" role="list">
            {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
              const activeItem = active === key;
              const count =
                key === "inbox" ? counts.inboxUnread : key === "drafts" ? counts.drafts : 0;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => onNavigate(key)}
                    aria-current={activeItem ? "page" : undefined}
                    className={`flex w-full items-center gap-3 rounded-r-full px-5 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b57d0] ${
                      activeItem
                        ? "bg-[#d3e3fd] font-semibold text-[#001d35]"
                        : "text-[#3c4043] hover:bg-[#f5f5f5]"
                    }`}
                  >
                    <Icon size={16} strokeWidth={activeItem ? 2.2 : 1.8} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-left">{label}</span>
                    {count > 0 && (
                      <span className={`text-xs tabular-nums ${activeItem ? "text-[#001d35]" : "text-[#5f6368]"}`}>
                        {count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Labels */}
          <div className="mt-4 mb-2 px-5 text-xs font-medium uppercase tracking-wide text-[#84868b]">
            Labels
          </div>
          <ul className="space-y-0.5" role="list">
            {EMAIL_LABELS.map((l) => {
              const activeLabel = active === `label:${l.name}`;
              return (
                <li key={l.name}>
                  <button
                    type="button"
                    onClick={() => onNavigate(`label:${l.name}`)}
                    aria-current={activeLabel ? "page" : undefined}
                    className={`flex w-full items-center gap-3 rounded-r-full px-5 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b57d0] ${
                      activeLabel ? "bg-[#d3e3fd] font-semibold text-[#001d35]" : "text-[#3c4043] hover:bg-[#f5f5f5]"
                    }`}
                  >
                    <span
                      className="h-3.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: l.color }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-left">{l.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <p className="border-t border-[#f0f0f0] px-4 py-3 text-[11px] leading-relaxed text-[#9aa0a6]">
          Demo inbox with sample data — no real email is sent or received.
        </p>
      </aside>
    </>
  );
}
