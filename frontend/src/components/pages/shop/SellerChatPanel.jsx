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

  const canChat = !!!loadError;
  const buyerUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}") || {};
    } catch {
      return {};
    }
  })();
  const shopInitial = (shopName || "S").trim().charAt(0).toUpperCase();

  const formatTime = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Small avatar next to a message bubble
  const BubbleAvatar = ({ message, mine }) => {
    if (mine) {
      if (buyerUser?.profileImage) {
        return (
          <img
            src={buyerUser.profileImage}
            alt=""
            className="w-6 h-6 rounded-full object-cover ring-1 ring-black/5 flex-shrink-0"
          />
        );
      }
      return (
        <div className="w-6 h-6 rounded-full bg-shopprimarylight flex items-center justify-center flex-shrink-0">
          <FiUser className="text-shopprimary w-3 h-3" />
        </div>
      );
    }
    if (shopLogo) {
      return (
        <img
          src={shopLogo}
          alt=""
          className="w-6 h-6 rounded-full object-cover ring-1 ring-black/5 flex-shrink-0"
        />
      );
    }
    return (
      <div className="w-6 h-6 rounded-full bg-[#eef0f5] text-[10px] font-semibold text-shoptext flex items-center justify-center flex-shrink-0">
        {shopInitial}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[1100] font-sans antialiased" role="dialog" aria-label={`Chat with ${shopName || "seller"}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 animate-cp-fade" onClick={onClose} />

      {/* Panel: full screen on mobile, 370px drawer on desktop */}
      <section className="absolute inset-0 sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-0 sm:w-[370px] bg-white sm:rounded-l-2xl sm:shadow-2xl flex flex-col animate-cp-slide">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-shopborder">
          {shopLogo ? (
            <img src={shopLogo} alt={shopName || "Seller"} className="w-10 h-10 bg-shopbg rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 bg-shopprimarylight text-shopprimary text-sm font-bold rounded-full flex items-center justify-center flex-shrink-0">
              {shopInitial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-shoptext truncate leading-tight">{shopName || "Seller"}</p>
            <p className="flex items-center gap-1 text-[11px] text-shopmuted mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-shopgreen inline-block" />
              Live chat
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 -mr-1 rounded-lg flex items-center justify-center text-shopmuted hover:text-shoptext hover:bg-shopbg transition-colors"
            aria-label="Close chat"
          >
            <FiX className="w-4 h-4" />
          </button>
        </header>

        {/* Product context strip */}
        {productName && (
          <div className="px-4 py-2 border-b border-shopborder bg-shopbg/60">
            <p className="text-[11px] text-shopmuted truncate">
              About <span className="font-medium text-shoptext">{productName}</span>
            </p>
          </div>
        )}

        {/* Thread */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5" aria-live="polite">
          {loading && (
            <div className="flex flex-col items-center gap-2.5 text-shopmuted">
              <div className="w-5 h-5 border-2 border-shopborder border-t-shopprimary rounded-full animate-spin" />
              <p className="text-xs">Loading conversation...</p>
            </div>
          )}

          {!loading && loadError && (
            <div className="flex flex-col items-center gap-3 text-center py-10">
              <div className="w-12 h-12 bg-shopbg rounded-full flex items-center justify-center">
                <FiMessageSquare className="text-shopmuted w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-shoptext">Chat unavailable</p>
                <p className="text-xs text-shopmuted mt-1 max-w-[240px]">{loadError}</p>
              </div>
            </div>
          )}

          {!loading && !loadError && messages.length === 0 && (
            <div className="flex flex-col items-center gap-2.5 text-center pt-8">
              <div className="w-12 h-12 bg-shopprimarylight rounded-full flex items-center justify-center">
                <FiMessageSquare className="text-shopprimary w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-shoptext">Start the conversation</p>
              <p className="text-xs text-shopmuted max-w-[240px] leading-relaxed">
                Send a message and this store will reply here. Your message appears in the seller's inbox instantly.
              </p>
            </div>
          )}

          {!loading &&
            messages.map((m) => {
              const mine = String(m.sender?._id || m.sender || "") !== String(sellerUserId);
              return (
                <div key={String(m._id)} className={`flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"}`}>
                  {!mine && <BubbleAvatar message={m} mine={false} />}
                  <div className={`max-w-[78%] flex flex-col ${mine ? "items-end" : "items-start"}`}>
                    <div
                      className={`px-3.5 py-2 text-[13px] leading-relaxed break-words whitespace-pre-wrap ${
                        mine
                          ? "bg-shopprimary text-white rounded-2xl rounded-br-md"
                          : "bg-[#f3f5f9] text-shoptext ring-1 ring-shopborder rounded-2xl rounded-bl-md"
                      }`}
                    >
                      {m.message}
                    </div>
                    <span className="text-[10px] text-shopmuted mt-1 px-1 select-none">{formatTime(m.createdAt)}</span>
                  </div>
                  {mine && <BubbleAvatar message={m} mine={true} />}
                </div>
              );
            })}

          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <form onSubmit={handleSend} className="px-3 pb-3 sm:pb-4 pt-1.5">
          {sendError && (
            <p className="flex items-center gap-1.5 text-[11px] text-shopred mb-1.5 px-1.5">
              <FiMessageSquare className="w-3 h-3 flex-shrink-0" />
              {sendError}
            </p>
          )}
          <div className={`flex items-center gap-2 p-1.5 rounded-xl border transition-colors ${reply ? "border-shopprimary/60 ring-1 ring-shopprimary/25" : "border-shopborder"}`}>
            <input
              type="text"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={canChat ? "Type your message..." : "Chat unavailable"}
              maxLength={500}
              disabled={!canChat}
              className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-sm text-shoptext focus:outline-none disabled:text-[#a1a8b7]"
            />
            <button
              type="submit"
              disabled={sending || !reply.trim() || !canChat}
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-shopprimary text-white rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
              aria-label="Send message"
            >
              {sending ? (
                <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              ) : (
                <FiSend className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-shopmuted/80 px-2 pt-1.5">The seller usually replies within a few hours.</p>
        </form>
      </section>
    </div>
  );
}
