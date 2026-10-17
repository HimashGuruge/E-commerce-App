import React from "react";
import { formatShort, stripHtml } from "./mockEmails.js";

// Single conversation row.
// Click selects (Gmail-style), double-click / context-menu opens.
export default function EmailRow({
  m, index, selected, focused, dense,
  onToggleSelect, onToggleStar, onOpen,
}) {
  const unread = !m.read;
  const isDraft = m.folder === "drafts";
  const sender = isDraft ? m.subject?.trim() || "(no subject)" : m.from?.name || "Unknown sender";
  const preview = m.text ? stripHtml(m.html || m.text).slice(0, 200) : "";
  const hasAttachments = (m.attachments?.length || 0) > 0;

  return (
    <div
      data-idx={index}
      onClick={() => (selected ? onOpen(m) : onToggleSelect(m.id))}
      onDoubleClick={() => onOpen(m)}
      onContextMenu={(e) => { e.preventDefault(); onOpen(m); }}
      className={[
        "group flex cursor-pointer select-none items-center gap-1 border-b border-[#eee] px-2 transition-colors sm:px-3",
        dense ? "min-h-[40px] py-1" : "min-h-[52px] py-1.5",
        focused ? "bg-[#eef4fe]" : selected ? "bg-[#e8f0fe]" : unread ? "bg-[#fafbfe] hover:bg-[#f5f5f5]" : "hover:bg-[#f5f5f5]",
      ].join(" ")}
      role="row"
      aria-selected={selected}
    >
      {/* Select */}
      <div className="flex w-10 shrink-0 items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onToggleSelect(m.id)}
          aria-label={selected ? "Clear selection" : "Select conversation"}
          className={`flex h-5 w-5 items-center justify-center rounded-[3px] border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b57d0] ${
            selected ? "border-[#0b57d0] bg-[#0b57d0] text-white" : "border-[#b5b5b5] bg-white group-hover:border-[#84868b]"
          }`}
        >
          {selected && (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Star */}
      <div className="flex w-8 shrink-0 items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onToggleStar(m.id)}
          aria-label={m.starred ? "Unstar" : "Star"}
          className="rounded-full p-1 text-[#c5c5c5] transition-colors hover:bg-[#f5f5f5] hover:text-[#f2c14e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b57d0]"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill={m.starred ? "#f2c14e" : "none"}
            stroke={m.starred ? "#f2c14e" : "#c5c5c5"}
            strokeWidth={1.8}
            aria-hidden="true"
          >
            <path d="M12 3.5l2.7 5.4 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.8l6-.9z" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Sender (hidden on mobile) */}
      <div className={`w-[200px] shrink-0 truncate text-sm sm:block ${unread ? "font-semibold text-[#202124]" : "text-[#3c4043]"}`}>
        {isDraft && <span className="text-xs uppercase tracking-wide text-[#9aa0a6] mr-1.5">Draft ·</span>}
        {sender}
      </div>

      {/* Subject + preview */}
      <div className="min-w-0 flex-1 truncate text-sm leading-[1.4]" title={preview ? `${m.subject} — ${preview}` : m.subject}>
        <span className={unread ? "font-semibold text-[#202124]" : "text-[#3c4043]"}>
          {m.subject || "(no subject)"}
        </span>
        {preview && (
          <span className={unread ? "text-[#5f6368]" : "text-[#84868b]"}> — {preview}</span>
        )}
        {hasAttachments && (
          <span className="ml-1 inline-flex align-[-3px]" title="Has attachment" aria-label="Has attachment">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#84868b]" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path d="M21 12.5l-8.2 8.2a5.5 5.5 0 01-7.8-7.8l8.5-8.5a3.7 3.7 0 015.2 5.2l-8.5 8.5a1.8 1.8 0 01-2.6-2.6l7.8-7.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </div>

      {/* Date */}
      <div className={`shrink-0 text-right text-xs tabular-nums sm:w-[76px] ${unread ? "font-semibold text-[#202124]" : "text-[#5f6368]"}`}>
        {formatShort(m.date)}
      </div>
    </div>
  );
}

