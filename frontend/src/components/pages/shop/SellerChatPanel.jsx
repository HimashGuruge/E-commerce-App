import React, { useEffect, useRef, useState } from "react";
import api from "@/utils/api";
import { onSocketEvent } from "@/utils/socket";
import { FiX, FiSend, FiMessageSquare, FiUser } from "react-icons/fi";

// Live buyer<->seller chat drawer opened from "Chat Now" on the product page.
// Loads the shared thread, appends optimistic sends via the API, and listens
// for "seller-chat:new-message" so seller replies appear in real time.
export default function SellerChatPanel({ sellerUserId, shopName, shopLogo, productName, onClose }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const bottomRef = useRef(null);
  const timerRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Load the thread
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: res } = await api.get(`/api/messages/seller-conversation/${sellerUserId}`);
        if (!active) return;
        if (res?.success) {
          setMessages(res.messages || []);
        } else {
          setLoadError(res?.error || "Could not load the conversation.");
        }
      } catch (err) {
        if (!active) return;
        setLoadError(err.response?.data?.error || "Could not load the conversation.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [sellerUserId]);

  // Live replies from the seller (deduped against the REST response)
  useEffect(() => {
    const unsubscribe = onSocketEvent(["seller-chat:new-message"], (msg) => {
      if (!msg?._id) return;
      const senderId = String(msg.sender?._id || msg.sender || "");
      if (senderId !== String(sellerUserId)) return;
      setMessages((prev) => (prev.some((m) => String(m._id) === String(msg._id)) ? prev : [...prev, msg]));
    });
    return unsubscribe;
  }, [sellerUserId]);

  // Keep the newest message in view
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading]);

  const touchError = (text) => {
    setSendError(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSendError(null), 5000);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = reply.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const { data: res } = await api.post(`/api/messages/seller/${sellerUserId}`, { message: text });
      if (res?.success) {
        setMessages((prev) => (prev.some((m) => String(m._id) === String(res.message._id)) ? prev : [...prev, res.message]));
        setReply("");
      }
    } catch (err) {
      touchError(err.response?.data?.error || "Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label={`Chat with ${shopName || "seller"}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full sm:w-96 bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-shopborder">
          {shopLogo ? (
            <img src={shopLogo} alt={shopName || "Seller"} className="w-8 h-8 bg-[#eef0f5] rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 bg-[#eef0f5] rounded-full flex items-center justify-center">
              <FiUser className="text-shopmuted w-4 h-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-shoptext truncate">{shopName || "Seller"}</p>
            {productName ? (
              <p className="text-[11px] text-shopmuted truncate">about {productName}</p>
            ) : (
              <p className="text-[11px] text-shopgreen font-medium">Live chat</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[#eef0f5] transition text-shopmuted"
            aria-label="Close chat"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading && (
            <div className="text-center text-xs text-[#a1a8b7] py-6">Loading conversation...</div>
          )}

          {!loading && loadError && (
            <div className="flex flex-col items-center gap-2 text-center py-8">
              <div className="w-10 h-10 bg-[#eef0f5] rounded-full flex items-center justify-center">
                <FiMessageSquare className="text-[#a1a8b7] w-5 h-5" />
              </div>
              <p className="text-xs text-shopmuted max-w-[220px]">{loadError}</p>
            </div>
          )}

          {!loading && !loadError && messages.length === 0 && (
            <div className="flex flex-col items-center gap-2 text-center py-8">
              <div className="w-10 h-10 bg-shopprimarylight rounded-full flex items-center justify-center">
                <FiMessageSquare className="text-shopprimary w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-shoptext">Start the conversation</p>
              <p className="text-[11px] text-shopmuted max-w-[240px]">
                Send a message and this store will reply here. Your messages appear in the seller's inbox instantly.
              </p>
            </div>
          )}

          {!loading &&
            messages.map((m) => {
              const mine = String(m.sender?._id || m.sender || "") !== String(sellerUserId);
              return (
                <div key={String(m._id)} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed break-words ${
                      mine ? "bg-shopprimary text-white rounded-br-sm" : "bg-[#f1f3f8] text-shoptext rounded-bl-sm"
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              );
            })}

          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <form onSubmit={handleSend} className="px-3 py-3 border-t border-shopborder">
          {sendError && <p className="text-[11px] text-shopred mb-1.5 px-1">{sendError}</p>}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your message..."
              maxLength={500}
              disabled={!!loadError}
              className="flex-1 border border-shopborder rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-shopprimary disabled:bg-[#f7f8fc] disabled:text-[#a1a8b7]"
            />
            <button
              type="submit"
              disabled={sending || !reply.trim() || !!loadError}
              className="w-9 h-9 flex items-center justify-center bg-shopprimary hover:bg-[#4338ca] disabled:bg-[#d5dce9] text-white rounded-lg transition"
              aria-label="Send message"
            >
              {sending ? (
                <span className="w-3 h-3 border-2 border-white/60 border-t-white rounded-full animate-spin" />
              ) : (
                <FiSend className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
