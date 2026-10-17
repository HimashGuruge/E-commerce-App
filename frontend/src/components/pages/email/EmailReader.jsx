import React, { useState } from "react";
import {
  ArrowLeft, Archive, Trash2, ShieldAlert, MoreVertical, Paperclip, AlarmClock,
} from "lucide-react";
import { formatFull } from "./mockEmails.js";
import EmailAvatar from "./EmailAvatar.jsx";

function ToolButton({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[#444746] hover:bg-[#f5f5f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b57d0]"
    >
      <Icon size={16} aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

const SNOOZE_OPTIONS = [
  { label: "Snooze for 1 hour", hours: 1 },
  { label: "Snooze until tomorrow 9:00 AM", tomorrow: 9 },
  { label: "Snooze until next week 9:00 AM", days: 7 },
];

export default function EmailReader({
  mail, onBack, onArchive, onTrash, onSpam, onNotSpam, onRestore, onDeleteForever,
  onSnooze, onMarkRead, onMarkUnread, onReply, onReplyAll, onForward,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const unread = !mail.read;
  const toLabel = (mail.to || []).length ? mail.to.map((t) => t.email).join(", ") : "(no recipient)";
  const ccLabel = (mail.cc || []).map((c) => c.email).join(", ");

  const action = (fn) => () => { setMoreOpen(false); fn(); };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[860px] px-3 py-4 sm:px-6 sm:py-5">
        {/* Back */}
        <button
          type="button"
          onClick={onBack}
          className="mb-4 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[#5f6368] hover:bg-[#f5f5f5] hover:text-[#202124] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b57d0]"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Back to {mail.folder}
        </button>

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-1 border-b border-[#eee] pb-3">
          <ToolButton icon={Archive} label="Archive" onClick={onArchive} />
          <ToolButton icon={Trash2} label={mail.folder === "trash" ? "Delete forever" : "Trash"} onClick={mail.folder === "trash" ? onDeleteForever : onTrash} />
          {mail.folder === "spam" ? (
            <ToolButton icon={ShieldAlert} label="Not spam" onClick={onNotSpam} />
          ) : (
            mail.folder !== "trash" && <ToolButton icon={ShieldAlert} label="Report as spam" onClick={onSpam} />
          )}
          {mail.folder === "trash" && <ToolButton icon={ArrowLeft} label="Restore" onClick={onRestore} />}
          {mail.folder === "inbox" && !mail.snoozedUntil && <ToolButton icon={AlarmClock} label="Snooze…" onClick={() => setMoreOpen(true)} />}

          {/* More menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[#444746] hover:bg-[#f5f5f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b57d0]"
            >
              <MoreVertical size={16} aria-hidden="true" />
              <span className="hidden sm:inline">More</span>
            </button>
            {moreOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} aria-hidden="true" />
                <div role="menu" className="absolute left-0 top-full z-50 mt-0.5 w-64 rounded-md border border-[#dadce0] bg-white py-1.5 shadow-[0_2px_10px_2px_rgba(60,64,67,0.2)]">
                  {unread ? (
                    <button className="w-full px-4 py-2 text-left text-sm text-[#3c4043] hover:bg-[#f5f5f5]" role="menuitem" onClick={action(onMarkRead)}>
                      Mark as read
                    </button>
                  ) : (
                    <button className="w-full px-4 py-2 text-left text-sm text-[#3c4043] hover:bg-[#f5f5f5]" role="menuitem" onClick={action(onMarkUnread)}>
                      Mark as unread
                    </button>
                  )}
                  {mail.folder !== "trash" && SNOOZE_OPTIONS.map((o) => (
                    <button
                      key={o.label}
                      className="w-full px-4 py-2 text-left text-sm text-[#3c4043] hover:bg-[#f5f5f5]"
                      role="menuitem"
                      onClick={action(() => onSnooze(o))}
                    >
                      {o.label}
                    </button>
                  ))}
                  {mail.folder === "trash" && (
                    <button className="w-full px-4 py-2 text-left text-sm text-[#c5221f] hover:bg-[#f5f5f5]" role="menuitem" onClick={action(onDeleteForever)}>
                      Delete forever
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <span className="ml-auto text-xs text-[#9aa0a6]">{formatFull(mail.date)}</span>
        </div>

        {/* Body */}
        <article>
          <h1 className={`text-lg sm:text-xl leading-snug ${unread ? "font-semibold" : "font-medium"} text-[#202124]`}>
            {mail.subject || "(no subject)"}
          </h1>

          <div className="mt-3 flex items-center gap-3">
            <EmailAvatar name={mail.from?.name} color={mail.from?.color} size={38} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#202124]">
                {mail.from?.name || "Unknown sender"}
                <span className="font-normal text-[#5f6368]"> &lt;{mail.from?.email}&gt;</span>
              </p>
              <p className="truncate text-xs text-[#5f6368]">
                to {toLabel}
                {ccLabel && ccLabel !== mail.from?.email ? ` +${(mail.cc || []).length} more` : ""}
              </p>
            </div>
          </div>

          <div
            className="mt-4 max-w-none text-sm leading-relaxed text-[#202124] [&_a]:text-[#0b57d0] [&_a]:underline [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_blockquote]:my-3 [&_p]:my-2"
            dangerouslySetInnerHTML={{ __html: mail.html || mail.text }}
          />

          {/* Attachments */}
          {(mail.attachments?.length || 0) > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {mail.attachments.map((a) => (
                <span
                  key={a.name}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#e0e0e0] bg-[#f8f9fa] px-3 py-2 text-xs text-[#3c4043]"
                  title={`Sample attachment (demo) — ${a.size}`}
                >
                  <Paperclip size={14} className="text-[#5f6368]" aria-hidden="true" />
                  <span className="max-w-[180px] truncate">{a.name}</span>
                  <span className="text-[#9aa0a6]">{a.size}</span>
                </span>
              ))}
            </div>
          )}

          {/* Reply / Forward */}
          <div className="mt-8 flex flex-wrap gap-2 pb-12">
            {[
              { label: "Reply", act: onReply },
              { label: "Reply all", act: onReplyAll },
              { label: "Forward", act: onForward },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={b.act}
                className="rounded-full border border-[#0b57d0] px-5 py-2 text-sm font-medium text-[#0b57d0] transition-colors hover:bg-[#e8f0fe] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b57d0]"
              >
                {b.label}
              </button>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
