import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { FiMessageCircle, FiSend, FiUser, FiClock, FiArrowLeft } from "react-icons/fi";
import api from "@/utils/api";
import { onSocketEvent } from "@/utils/socket";

export default function SellerMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null); // { id, name, image } or null
  const [adminError, setAdminError] = useState(false);
  const [activeKey, setActiveKey] = useState(null); // null = all conversations
  const [reply, setReply] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false); // small screens: switch between list and chat
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

  // Initial load + live socket updates.
  useEffect(() => {
    fetchMessages();
    // Live: new incoming message → full refetch (replace, so no duplicates)
    const unsub = onSocketEvent(["seller:new-message"], fetchMessages);
    return () => {
      unsub();
    };
  }, [fetchMessages]);

  // Once a fetch settles, mark whatever is currently visible as read.
  useEffect(() => {
    if (!loading) markVisibleRead(messages, activeKey);
  }, [loading, messages, activeKey, markVisibleRead]);

  const handleOpenConversation = useCallback((key) => {
    setActiveKey(key);
    setMobileChatOpen(key !== null); // on small screens, open the chat view (not the "All" overview)
  }, []);

  // "Message Admin Support" entry: lazily loads the admin id, then opens that
  // conversation. If the admin already messaged the seller, those messages
  // already live under the same key (their user id) and merge automatically.
  const openAdminConversation = useCallback(async () => {
    if (adminUser) {
      setActiveKey(adminUser.id);
      return;
    }
    try {
      const { data } = await api.get("/api/sellers/messages/support");
      if (data.success) {
        setAdminUser(data.admin);
        setActiveKey(data.admin.id);
      } else {
        setAdminError(true);
      }
    } catch (err) {
      console.error("Load admin support error:", err);
      setAdminError(err.response?.status === 404);
    }
  }, [adminUser]);

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
    // Make sure the admin support conversation always exists, even before the
    // first message is sent (so the thread pane can be opened right away).
    if (adminUser && !map.has(adminUser.id)) {
      map.set(adminUser.id, { key: adminUser.id, partnerName: "Admin Support", partnerImage: adminUser.image, messages: [] });
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
  const isAdminConversation = adminUser != null && activeKey === adminUser.id;
  // Order refs only apply to buyer conversations; admin support never uses one
  // (the backend rejects buyer orders when the receiver is the admin).
  const activeOrderRef = isAdminConversation || !activeConv || activeKey === "no-buyer" ? null : activeConv.messages.find((m) => m.orderRef)?.orderRef;

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

  const diffDays = (d) => {
    const startOfDay = (x) => {
      const y = new Date(x);
      y.setHours(0, 0, 0, 0);
      return y.getTime();
    };
    return Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  };

  // Day label for date dividers: "Today", "Yesterday", or "15 Oct 2026".
  const fmtDay = (d) => {
    const diff = diffDays(d);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return new Date(d).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" });
  };

  // Short timestamp shown on conversation-list rows.
  const fmtListTime = (d) => {
    const diff = diffDays(d);
    if (diff === 0) return new Date(d).toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit" });
    if (diff === 1) return "Yesterday";
    return new Date(d).toLocaleDateString("en-LK", { day: "2-digit", month: "short" });
  };

  return (
    <div className="p-4 md:p-6 flex flex-col lg:flex-row gap-4 h-full min-h-0 overflow-hidden">
      {/* Conversation list */}
      <div className={`bg-white rounded-[13px] border border-shopborder flex flex-col w-full lg:w-80 flex-shrink-0 min-h-0 ${mobileChatOpen ? "hidden lg:flex" : "flex"}`}>
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
          {adminError ? (
            <p className="px-3 py-2 text-xs text-shopmuted">Admin support is not available right now.</p>
          ) : (
            <button
              onClick={openAdminConversation}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                activeKey === (adminUser ? adminUser.id : null) ? "bg-shopprimarylight" : "hover:bg-[#f5f6fc]"
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-shopprimarylight flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-shopprimary">AD</span>
              </div>
              <span className="flex-1 text-sm font-medium text-[#3d4557]">Admin Support</span>
            </button>
          )}
          {conversations.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <FiMessageCircle className="w-9 h-9 mx-auto mb-3 text-shopborder" />
              <p className="text-sm font-medium text-shoptext">No conversations yet</p>
              <p className="text-xs text-shopmuted mt-1">When a customer writes about an order, the chat shows up here.</p>
            </div>
          ) : (
            conversations.map((c) => {
              const last = c.messages[0];
              if (!last) return null;
              const unread = c.messages.filter((m) => !m.mine && !m.read).length;
              const isActive = activeKey === (c.key === "no-buyer" ? null : c.key);
              return (
                <button
                  key={c.key}
                  onClick={() => handleOpenConversation(c.key === "no-buyer" ? null : c.key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                    isActive ? "bg-shopprimarylight" : "hover:bg-shopprimarylight/50"
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
                    <div className="flex items-center gap-2">
                      <p className={`flex-1 min-w-0 truncate text-sm ${unread > 0 ? "font-bold text-shoptext" : "font-semibold text-shoptext"}`}>
                        {c.partnerName}
                      </p>
                      <span className="text-[10px] text-shopmuted flex-shrink-0">{fmtListTime(last.createdAt)}</span>
                    </div>
                    <p className="text-xs text-shopmuted truncate">
                      {last.mine && <span className="text-shoptext/60">You: </span>}
                      {last.message}
                    </p>
                  </div>
                  {unread > 0 && (
                    <span className="bg-shopred text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 py-0.5 rounded-full flex items-center justify-center flex-shrink-0">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Thread */}
      <div className={`bg-white rounded-[13px] border border-shopborder flex flex-col flex-1 min-h-0 ${mobileChatOpen ? "flex" : "hidden lg:flex"}`}>
        <div className="p-4 border-b border-shopborder flex items-center gap-3">
          <button
            onClick={() => setMobileChatOpen(false)}
            className="lg:hidden -ml-1 p-1.5 -mt-1 rounded-lg text-shoptext hover:bg-shopprimarylight flex-shrink-0"
            aria-label="Back to conversations"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          {activeConv && (
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden lg:hidden ${activeConv.partnerImage ? "" : "bg-shopprimarylight"}`}>
              {activeConv.partnerImage ? (
                <img src={activeConv.partnerImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <FiUser className="w-4 h-4 text-shopprimary" />
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-bold text-shoptext">
                {activeConv ? activeConv.partnerName : "All messages"}
              </h3>
              {isAdminConversation && (
                <span className="text-[11px] bg-shopprimarylight text-shopprimary rounded-full px-2 py-0.5 flex-shrink-0">Admin support</span>
              )}
              {activeOrderRef && (
                <span className="text-[11px] bg-shopprimarylight text-shopprimary rounded-full px-2 py-0.5 flex-shrink-0">
                  Order #{activeOrderRef.slice(-8)}
                </span>
              )}
            </div>
            <p className="text-xs text-shopmuted mt-0.5">
              {activeConv ? (isAdminConversation ? "We usually reply within a day" : "Chat about your orders and deliveries") : "A mix of recent chats from all customers"}
            </p>
          </div>
        </div>

        <div ref={threadRef} className="flex-1 overflow-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-shopprimary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : thread.length === 0 ? (
            <div className="text-center h-full flex flex-col items-center justify-center text-shopmuted">
              <FiMessageCircle className="w-12 h-12 mb-3 text-shopborder" />
              <p className="text-sm font-medium text-shoptext">No messages yet</p>
              <p className="text-xs mt-1">
                {activeConv ? `Say hello to ${activeConv.partnerName} to start the conversation` : "When customers write about an order, the chat appears here"}
              </p>
            </div>
          ) : (
            thread.map((m, i) => {
              const prev = thread[i - 1]; // thread is oldest→newest; i-1 renders above
              const showDay = !prev || fmtDay(prev.createdAt) !== fmtDay(m.createdAt);
              return (
                <Fragment key={m.id}>
                  {showDay && (
                    <div className="flex items-center justify-center py-1">
                      <span className="text-[11px] font-medium text-shopmuted bg-shopbg border border-shopborder rounded-full px-3 py-1">
                        {fmtDay(m.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className={`flex items-end gap-2 ${m.mine ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[80%] min-w-0">
                      {!m.mine && activeKey === null && (
                        <p className="text-[10px] font-semibold text-shopprimary mb-1">{m.partnerName}</p>
                      )}
                    <div className={`rounded-2xl px-4 py-2.5 ${m.mine ? "bg-shopprimary text-white rounded-br-md" : "bg-shopbg text-shoptext rounded-bl-md"}`}>
                      {m.orderRef && (
                        <p className={`text-[11px] mb-1 ${m.mine ? "text-[#c7d2fe]" : "text-shopmuted"}`}>
                          About order #{m.orderRef.slice(-8)}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>
                      <p className={`text-[10px] mt-1 flex items-center gap-1 text-right ${m.mine ? "text-[#c7d2fe]" : "text-shopmuted"}`}>
                        <FiClock className="w-3 h-3" /> {fmtTime(m.createdAt)}
                      </p>
                    </div>
                    </div>
                  </div>
                </Fragment>
              );
            })
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
            {sending ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <FiSend className="w-4 h-4" />
            )}
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
