import { useState, useEffect, useCallback, useRef } from "react";
import { FiMessageCircle, FiSend, FiUser, FiClock } from "react-icons/fi";
import api from "@/utils/api";
import { onSocketEvent } from "@/utils/socket";

// Polling fallback so messages still arrive if the socket connection drops.
const POLL_INTERVAL_MS = 30000;

export default function SellerMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState(null); // null = all conversations
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  // IDs we already asked the server to mark as read (avoids re-calling the API)
  const markedReadIds = useRef(new Set());
  const threadRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await api.get("/api/sellers/messages");
      if (data.success) setMessages(data.messages || []); // replace state — no duplicate appends
    } catch (err) {
      console.error("Fetch messages error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Ids of incoming (not mine) messages in the *opened* conversation that are
  // unread. The "All" overview view deliberately does not mark anything read.
  const visibleUnreadIds = useCallback((msgs, key) => {
    if (key === null) return [];
    const conv = msgs.filter((m) => m.key === key);
    return conv.filter((m) => !m.mine && !m.read).map((m) => m.id);
  }, []);

  const dispatchBadge = useCallback(async () => {
    try {
      const { data } = await api.get("/api/sellers/messages/unread");
      if (data.success) {
        window.dispatchEvent(new CustomEvent("seller-messages-changed", { detail: data.unreadCount || 0 }));
      }
    } catch (err) {
      console.error("Fetch unread count error:", err);
    }
  }, []);

  // Mark what's visible as read, refresh flags, then sync the sidebar badge.
  const markVisibleRead = useCallback(
    async (msgs, key) => {
      const ids = visibleUnreadIds(msgs, key).filter((id) => !markedReadIds.current.has(id));
      if (!ids.length) return;
      try {
        const { data } = await api.patch("/api/sellers/messages/read", { messageIds: ids });
        if (data?.success) {
          ids.forEach((id) => markedReadIds.current.add(id));
          await fetchMessages(); // replace state with fresh read flags (idempotent)
          await dispatchBadge();
        }
      } catch (err) {
        console.error("Mark read error:", err);
      }
    },
    [visibleUnreadIds, fetchMessages, dispatchBadge]
  );

  // Initial load + live socket updates + polling fallback.
  useEffect(() => {
    fetchMessages();
    // Live: new incoming message → full refetch (replace, so no duplicates)
    const unsub = onSocketEvent(["seller:new-message"], fetchMessages);
    const poll = setInterval(() => fetchMessages(), POLL_INTERVAL_MS);
    return () => {
      unsub();
      clearInterval(poll);
    };
  }, [fetchMessages]);

  // Once a fetch settles, mark whatever is currently visible as read.
  useEffect(() => {
    if (!loading) markVisibleRead(messages, activeKey);
  }, [loading, messages, activeKey, markVisibleRead]);

  const handleOpenConversation = useCallback((key) => setActiveKey(key), []);

  // Group messages into conversations (keyed by the other participant)
  const conversations = (() => {
    const map = new Map();
    for (const m of messages) {
      const list = map.get(m.key) || { key: m.key, partnerName: m.partnerName, partnerImage: m.partnerImage, messages: [] };
      list.messages.push(m);
      map.set(m.key, list);
    }
    // Prefer the most recent *partner* message for the name/photo, so the
    // list doesn't collapse to "Customer" when your own reply is the newest.
    for (const list of map.values()) {
      const partnerMsg = list.messages.find((m) => !m.mine);
      if (partnerMsg) {
        list.partnerName = partnerMsg.partnerName;
        list.partnerImage = partnerMsg.partnerImage;
      }
    }
    const convs = [...map.values()];
    convs.sort((a, b) => {
      const ta = new Date(a.messages[0]?.createdAt || 0);
      const tb = new Date(b.messages[0]?.createdAt || 0);
      return tb - ta;
    });
    return convs;
  })();

  const activeConv = activeKey === null ? null : conversations.find((c) => c.key === activeKey) || null;
  const activePartnerId = activeConv?.key && activeConv.key !== "no-buyer" ? activeConv.key : null;
  const activeOrderRef = activeConv ? activeConv.messages.find((m) => m.orderRef)?.orderRef : null;

  const thread = activeConv ? [...activeConv.messages].reverse() : [...messages].reverse();

  // Keep the thread pinned to the latest message on conversation switch and
  // when new messages arrive (standard chat behavior).
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [activeKey, thread.length, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!activePartnerId || !reply.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post("/api/sellers/messages", {
        receiverId: activePartnerId,
        text: reply.trim(),
        orderId: activeOrderRef || undefined,
      });
      if (data.success) {
        setReply("");
        await fetchMessages();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const fmtTime = (d) => new Date(d).toLocaleString("en-LK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="p-4 md:p-6 flex flex-col lg:flex-row gap-4 h-full min-h-0">
      {/* Conversation list */}
      <div className="bg-white rounded-[13px] border border-shopborder flex flex-col w-full lg:w-72 flex-shrink-0 max-h-[420px] lg:max-h-none">
        <div className="p-4 border-b border-shopborder">
          <h2 className="text-[26px] font-extrabold text-shoptext tracking-[-0.6px]">Messages</h2>
          <p className="text-sm text-shopmuted mt-1.5">Chat with your customers</p>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          <button
            onClick={() => handleOpenConversation(null)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
              activeKey === null ? "bg-shopprimarylight" : "hover:bg-[#f5f6fc]"
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-shopprimarylight flex items-center justify-center flex-shrink-0">
              <FiMessageCircle className="w-4 h-4 text-shopprimary" />
            </div>
            <span className="flex-1 text-sm font-medium text-[#3d4557]">All conversations</span>
          </button>
          {conversations.map((c) => {
            const last = c.messages[0];
            const unread = c.messages.filter((m) => !m.mine && !m.read).length;
            return (
              <button
                key={c.key}
                onClick={() => handleOpenConversation(c.key === "no-buyer" ? null : c.key)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                  activeKey === (c.key === "no-buyer" ? null : c.key) ? "bg-shopprimarylight" : "hover:bg-[#f5f6fc]"
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${c.partnerImage ? "" : "bg-shopprimarylight"}`}>
                  {c.partnerImage ? (
                    <img src={c.partnerImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <FiUser className="w-4 h-4 text-shopprimary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-shoptext truncate">{c.partnerName}</p>
                  <p className="text-xs text-shopmuted truncate">{last.message}</p>
                </div>
                {unread > 0 && (
                  <span className="bg-shopred text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Thread */}
      <div className="bg-white rounded-[13px] border border-shopborder flex flex-col flex-1 min-h-[420px]">
        <div className="p-4 border-b border-shopborder flex items-center gap-2">
          <h3 className="text-base font-bold text-shoptext">
            {activeConv ? "Chat with " + activeConv.partnerName : "All messages"}
          </h3>
          {activeOrderRef && (
            <span className="text-[11px] bg-shopprimarylight text-shopprimary rounded-full px-2 py-0.5">
              Order #{activeOrderRef.slice(-8)}
            </span>
          )}
        </div>

        <div ref={threadRef} className="flex-1 overflow-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-shopprimary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : thread.length === 0 ? (
            <div className="text-center h-full flex flex-col items-center justify-center text-[#a1a8b7]">
              <FiMessageCircle className="w-12 h-12 mb-3 text-[#c9cfda]" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Messages from customers about your orders will appear here</p>
            </div>
          ) : (
            thread.map((m) => (
              <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.mine ? "bg-shopprimary text-white rounded-br-md" : "bg-[#f1f3f8] text-shoptext rounded-bl-md"}`}>
                  {m.orderRef && (
                    <p className={`text-[11px] mb-1 ${m.mine ? "text-[#c7d2fe]" : "text-shopmuted"}`}>
                      About order #{m.orderRef.slice(-8)}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                  <p className={`text-[10px] mt-1 flex items-center gap-1 ${m.mine ? "text-[#c7d2fe]" : "text-[#a1a8b7]"}`}>
                    <FiClock className="w-3 h-3" /> {fmtTime(m.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Composer */}
        <form onSubmit={handleSend} className="p-4 border-t border-shopborder flex items-center gap-3">
          <input
            type="text"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            disabled={!activePartnerId}
            placeholder={activePartnerId ? `Message ${activeConv.partnerName}…` : "Select a conversation to reply"}
            className="flex-1 px-4 py-2.5 rounded-xl border border-shopborder text-sm focus:outline-none focus:ring-2 focus:ring-shopprimary/30 disabled:bg-[#f7f8fc] disabled:text-[#a1a8b7]"
          />
          <button
            type="submit"
            disabled={!activePartnerId || sending || !reply.trim()}
            className="px-4 py-2.5 rounded-xl bg-shopprimary text-white text-sm font-medium hover:bg-[#4338ca] disabled:opacity-40 flex items-center gap-2"
          >
            <FiSend className="w-4 h-4" /> Send
          </button>
        </form>
      </div>
    </div>
  );
}
