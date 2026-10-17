import React, { useEffect, useRef } from "react";
import { Inbox, Star, SearchX, Archive, X } from "lucide-react";
import EmailRow from "./EmailRow.jsx";

const CATEGORY_TABS = [
  { key: "all", label: "All" },
  { key: "primary", label: "Primary" },
  { key: "promotions", label: "Promotions" },
  { key: "social", label: "Social" },
];

const EMPTY_MESSAGES = {
  inbox: "You're all caught up — no conversations in Inbox",
  starred: "Conversations you star will show up here",
  snoozed: "Snoozed conversations will appear here until their time arrives",
  sent: "Emails you send will show up here",
  drafts: "Drafts you save will show up here",
  important: "Conversations we think matter most will show up here",
  spam: "Nothing in Spam — nice and clean",
  trash: "Nothing in Trash",
};

export default function EmailList({
  mails, loading, folder, activeCategory, onCategory,
  dense, query, selected, focusIdx,
  onToggleSelect, onToggleStar, onSelectAll, onOpen, onClearSelection, onBulk,
}) {
  const listRef = useRef(null);

  // Keep keyboard-focused row visible
  useEffect(() => {
    const rows = listRef.current?.querySelectorAll("[data-idx]");
    rows?.[focusIdx]?.scrollIntoView({ block: "nearest" });
  }, [focusIdx, mails.length]);

  const allSelected = mails.length > 0 && mails.every((m) => selected.includes(m.id));

  return (
    <div className="flex h-full flex-col" role="table" aria-label="Email list">
      {/* Category tabs (Inbox only) */}
      {folder === "inbox" && (
        <div className="flex items-center gap-1 px-3 pt-3 sm:px-5" role="tablist" aria-label="Inbox categories">
          {CATEGORY_TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={activeCategory === t.key}
              onClick={() => onCategory(t.key)}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b57d0] ${
                activeCategory === t.key
                  ? "bg-[#e8f0fe] font-medium text-[#0b57d0]"
                  : "text-[#5f6368] hover:bg-[#f5f5f5]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Header / bulk bar */}
      {!loading && (
        <div className="flex items-center gap-2 border-b border-[#eee] px-3 py-2 sm:px-5">
          {selected.length > 0 ? (
            <>
              <span className="text-sm text-[#5f6368] tabular-nums">
                {selected.length} {selected.length === 1 ? "selected" : "selected"}
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-1">
                {([
                  { key: "archive", label: "Archive", show: folder === "inbox" || folder === "starred" },
                  { key: "spam", label: "Report as spam", show: folder === "inbox" || folder === "starred" },
                  { key: "trash", label: "Move to trash", show: folder !== "trash" },
                  { key: "notSpam", label: "Not spam", show: folder === "spam" },
                  { key: "restore", label: "Restore", show: folder === "trash" },
                  { key: "read", label: "Mark as read", show: mails.some((m) => !m.read) },
                  { key: "unread", label: "Mark as unread", show: mails.some((m) => m.read) },
                  { key: "deleteForever", label: "Delete forever", show: folder === "trash" || mails.some((m) => m.folder === "drafts") },
                ].filter((a) => a.show)).map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => onBulk(a.key)}
                    className="rounded-full px-3 py-1.5 text-sm text-[#3c4043] hover:bg-[#f5f5f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b57d0]"
                  >
                    {a.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={onClearSelection}
                  aria-label="Clear selection"
                  className="rounded-full p-1.5 text-[#5f6368] hover:bg-[#f5f5f5]"
                >
                  <X size={16} />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex cursor-default items-center gap-2 text-sm text-[#5f6368]">
                <button
                  type="button"
                  onClick={onSelectAll}
                  aria-label={allSelected ? "Deselect all" : "Select all"}
                  className={`flex h-5 w-5 items-center justify-center rounded-[3px] border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b57d0] ${
                    allSelected ? "border-[#0b57d0] bg-[#0b57d0] text-white" : "border-[#b5b5b5] bg-white hover:border-[#84868b]"
                  }`}
                >
                  {allSelected && (
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <span>Select all</span>
              </div>
              <span className="ml-auto text-xs text-[#9aa0a6] tabular-nums">
                {mails.length} {mails.length === 1 ? "conversation" : "conversations"}
              </span>
            </>
          )}
        </div>
      )}

      {/* List / skeleton / empty */}
      {loading ? (
        <div className="flex-1 overflow-hidden">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-[#eee] px-4 py-3.5">
              <div className="h-5 w-5 animate-pulse rounded-[3px] bg-[#eee]" />
              <div className="h-4 w-4 animate-pulse rounded-full bg-[#eee]" />
              <div className="hidden h-4 w-32 animate-pulse rounded-sm bg-[#eee] sm:block" />
              <div className="h-4 flex-1 animate-pulse rounded-sm bg-[#eee]" style={{ maxWidth: `${55 + ((i * 7) % 30)}%` }} />
              <div className="h-3 w-10 animate-pulse rounded-sm bg-[#eee]" />
            </div>
          ))}
        </div>
      ) : mails.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          {query ? (
            <SearchX size={48} className="text-[#dadce0]" strokeWidth={1.2} aria-hidden="true" />
          ) : folder === "starred" ? (
            <Star size={48} className="text-[#dadce0]" strokeWidth={1.2} aria-hidden="true" />
          ) : folder === "sent" ? (
            <Archive size={48} className="text-[#dadce0]" strokeWidth={1.2} aria-hidden="true" />
          ) : (
            <Inbox size={48} className="text-[#dadce0]" strokeWidth={1.2} aria-hidden="true" />
          )}
          <p className="text-sm text-[#5f6368]">
            {query ? "" : EMPTY_MESSAGES[folder] || "Nothing to show here"}
          </p>
          {query && (
            <p className="text-sm text-[#9aa0a6]">
              No results for <span className="font-medium text-[#5f6368]">&ldquo;{query}&rdquo;</span> — try different keywords
            </p>
          )}
        </div>
      ) : (
        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain" role="rowgroup">
          {mails.map((m, i) => (
            <EmailRow
              key={m.id}
              m={m}
              index={i}
              selected={selected.includes(m.id)}
              focused={focusIdx === i}
              dense={dense}
              onToggleSelect={onToggleSelect}
              onToggleStar={onToggleStar}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}
