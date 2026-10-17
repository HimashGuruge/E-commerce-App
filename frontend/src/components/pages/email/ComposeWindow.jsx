import React, { useRef, useState } from "react";
import { Send, Paperclip, Minus, X } from "lucide-react";
import { formatFileSize, stripHtml } from "./mockEmails.js";
import QuillEditor from "@/components/shared/QuillEditor.jsx";

const TITLES = {
  new: "New message",
  reply: "Reply",
  replyall: "Reply all",
  forward: "Forward",
  draft: "Draft",
};

export default function ComposeWindow({
  compose, me, onChange, onSend, onClose, onToggleMinimized,
}) {
  const [showCcBcc, setShowCcBcc] = useState(false);
  const fileRef = useRef(null);

  const addFile = (file) => {
    if (!file) return;
    onChange("attachments", [...compose.attachments, { name: file.name, size: formatFileSize(file.size) }]);
  };

  const hasContent = Boolean(
    compose.to.trim() || compose.cc.trim() || compose.bcc.trim() ||
    compose.subject.trim() || stripHtml(compose.html) || compose.attachments.length
  );

  // ---------------------------- minimized ----------------------------
  if (compose.minimized) {
    return (
      <button
        type="button"
        onClick={onToggleMinimized}
        className="fixed bottom-3 right-3 z-50 flex items-center gap-2 rounded-tl-xl border border-[#dadce0] bg-white px-4 py-3 shadow-lg transition hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b57d0]"
      >
        <span className="max-w-[160px] truncate text-sm font-medium text-[#202124]">
          {compose.subject?.trim() || "(no subject)"}
        </span>
        <span className="max-w-[120px] truncate text-xs text-[#5f6368]">
          {compose.to.trim() || "Draft"}
        </span>
      </button>
    );
  }

  // ------------------------------ full -------------------------------
  return (
    <div
      role="dialog"
      aria-label="Compose email"
      className="fixed bottom-3 right-3 z-50 flex max-h-[85vh] w-[95vw] max-w-[580px] flex-col overflow-hidden rounded-t-xl border border-[#dadce0] bg-white shadow-[0_4px_24px_rgba(60,64,67,0.35)]"
    >
      {/* Header */}
      <div className="flex items-center gap-2 bg-[#f2f6fd] px-4 py-2.5">
        <span className="truncate text-sm font-medium text-[#202124]">
          {TITLES[compose.mode] || "Compose"}
        </span>
        {compose.baseId && <span className="rounded-full bg-[#e8f0fe] px-2 py-0.5 text-[11px] font-medium text-[#0b57d0]">draft</span>}
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            onClick={onToggleMinimized}
            aria-label="Minimize compose window"
            className="rounded-full p-1.5 text-[#5f6368] hover:bg-[#e3ecfa]"
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close (saves as draft if there is content)"
            className="rounded-full p-1.5 text-[#5f6368] hover:bg-[#e3ecfa]"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Recipients */}
      <form
        className="flex-1 overflow-y-auto"
        onSubmit={(e) => { e.preventDefault(); onSend(); }}
      >
        <div className="px-4 pt-2 text-sm">
          <label className="flex items-center gap-2 py-1 focus-within:outline">
            <span className="w-12 shrink-0 text-[#5f6368]">To</span>
            <input
              type="text"
              value={compose.to}
              onChange={(e) => onChange("to", e.target.value)}
              placeholder={me.email}
              className="min-w-0 flex-1 border-b border-[#e0e0e0] py-1 focus:border-[#0b57d0] focus:outline-none"
            />
          </label>

          {showCcBcc ? (
            <>
              <label className="flex items-center gap-2 py-1">
                <span className="w-12 shrink-0 text-[#5f6368]">Cc</span>
                <input
                  type="text"
                  value={compose.cc}
                  onChange={(e) => onChange("cc", e.target.value)}
                  className="min-w-0 flex-1 border-b border-[#e0e0e0] py-1 focus:border-[#0b57d0] focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-2 py-1">
                <span className="w-12 shrink-0 text-[#5f6368]">Bcc</span>
                <input
                  type="text"
                  value={compose.bcc}
                  onChange={(e) => onChange("bcc", e.target.value)}
                  className="min-w-0 flex-1 border-b border-[#e0e0e0] py-1 focus:border-[#0b57d0] focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => setShowCcBcc(false)}
                className="mb-1 text-xs font-medium text-[#0b57d0] hover:underline"
              >
                Remove Cc/Bcc
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowCcBcc(true)}
              className="flex items-center gap-1 py-1 text-xs font-medium text-[#0b57d0] hover:underline"
            >
              + Cc/Bcc
            </button>
          )}

          <label className="flex items-center gap-2 py-1">
            <span className="w-12 shrink-0 text-[#5f6368]">Subject</span>
            <input
              type="text"
              value={compose.subject}
              onChange={(e) => onChange("subject", e.target.value)}
              placeholder="Subject"
              className="min-w-0 flex-1 border-b border-[#e0e0e0] py-1 focus:border-[#0b57d0] focus:outline-none"
            />
          </label>
        </div>

        {/* Body (existing QuillEditor — rich text) */}
        <div className="px-4 pb-2">
          <QuillEditor key={compose.mode + (compose.baseId || "") + compose.fromSeed} value={compose.html} onChange={(html) => onChange("html", html)} placeholder="Write your message…" />
        </div>
      </form>

      {/* Attachments (demo: filenames only, nothing is uploaded) */}
      {compose.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-[#f0f0f0] px-4 py-2">
          {compose.attachments.map((a, i) => (
            <span key={`${a.name}-${i}`} className="inline-flex items-center gap-1.5 rounded-lg border border-[#e0e0e0] bg-[#f8f9fa] px-2.5 py-1.5 text-xs text-[#3c4043]">
              <Paperclip size={12} className="text-[#5f6368]" aria-hidden="true" />
              <span className="max-w-[150px] truncate">{a.name}</span>
              <span className="text-[#9aa0a6]">{a.size}</span>
              <button
                type="button"
                aria-label={`Remove ${a.name}`}
                onClick={() =>
                  onChange("attachments", compose.attachments.filter((_, idx) => idx !== i))
                }
                className="ml-0.5 rounded-full text-[#9aa0a6] hover:text-[#c5221f]"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 border-t border-[#f0f0f0] px-4 py-3">
        <button
          type="button"
          onClick={onSend}
          className="inline-flex items-center gap-2 rounded-full bg-[#0b57d0] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#0947b3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b57d0]"
        >
          <Send size={15} aria-hidden="true" />
          Send
        </button>
        <span className="text-[11px] text-[#9aa0a6]">Demo — no real email is delivered</span>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          aria-hidden="true"
          onChange={(e) => {
            Array.from(e.target.files || []).forEach(addFile);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="ml-auto flex items-center gap-2 rounded-full px-3 py-2 text-sm text-[#5f6368] hover:bg-[#f5f5f5]"
        >
          <Paperclip size={15} aria-hidden="true" />
          <span className="hidden sm:inline">Attach (demo)</span>
        </button>
      </div>
    </div>
  );
}
