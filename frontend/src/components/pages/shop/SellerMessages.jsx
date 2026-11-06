import { useState, useEffect, useCallback, useRef, useMemo, Fragment } from "react";
import {
  MessageSquare,
  Search,
  Send,
  X,
  CheckCircle,
  Bell,
  UserCircle,
  ArrowLeft,
} from "lucide-react";
import api from "@/utils/api";
import toast from "react-hot-toast";
import getApiError from "@/utils/errors";
import { onSocketEvent } from "@/utils/socket";

const formatRelativeTime = (date) => {
  if (!date) return "";

  const now = new Date();
  const msgDate = new Date(date);
  const diffInSeconds = Math.floor((now - msgDate) / 1000);

  if (diffInSeconds < 60) return "Just now";

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return msgDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const formatTime = (d) =>
  new Date(d).toLocaleString("en-LK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const getInitials = (name) => {
  if (!name) return "C";
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const inputClass =
  "bg-transparent px-3 py-1.5 rounded-lg border border-shopborder text-[13px] text-shoptext focus:outline-none focus:border-shopprimary focus:ring-2 focus:ring-shopprimary/15";

function RoleBadge({ role }) {
  const isAdmin = role === "admin";
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0 ${
        isAdmin ? "bg-amber-100 text-amber-700" : "bg-shopprimarylight text-shopprimary"
      }`}
    >
      {isAdmin ? "Admin" : "Customer"}
    </span>
  );
}

function Clock() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export default function SellerMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null); // { id, name, image } or null
  const [adminError, setAdminError] = useState(false);
  const [activeKey, setActiveKey] = useState(null); // null = all conversations
  const [reply, setReply] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false); // small screens: switch between list and chat
  const [sending, setSending] = useState(false);
  // Console-style extras (same as the admin Customer Support page)
  const [liveUpdates, setLiveUpdates] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [newMessageArrived, setNewMessageArrived] = useState(false);
  const [flashKey, setFlashKey] = useState(null);

  // IDs we already asked the server to mark as read (avoids re-calling the API)
  const markedReadIds = useRef(new Set());
  const threadRef = useRef(null);
  const flashTimeoutRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const prevLatestRef = useRef({});
  const hasLoadedRef = useRef(false);
  const activeKeyRef = useRef(null);

  useEffect(() => {
    activeKeyRef.current = activeKey;
  }, [activeKey]);

  const flashConv = useCallback((key) => {
    if (!key) return;
    setFlashKey(key);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setFlashKey(null), 2500);
  }, []);

  // Compare each conversation's latest incoming message with the previous
  // snapshot and flag the ones that changed (new incoming message).
  const detectNewIncoming = useCallback(
    (msgs) => {
      const latest = {};
      for (const m of msgs) {
        if (m.mine) continue; // only incoming messages count as "new"
        if (!latest[m.key]) {
          latest[m.key] = {
            key: `${m.message || ""}|${m.id}`,
            partnerName: m.partnerName,
          };
        }
      }

      if (hasLoadedRef.current) {
        let arrived = null;
        for (const key of Object.keys(latest)) {
          const prev = prevLatestRef.current[key];
          if (prev && prev.key !== latest[key].key) {
            arrived = arrived || latest[key];
            flashConv(key);
          }
        }
        if (arrived) {
          setNewMessageArrived(true);
          if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
          toastTimeoutRef.current = setTimeout(() => setNewMessageArrived(false), 5000);
          if (arrived.key !== activeKeyRef.current) {
            toast.success(`🔔 New message from ${arrived.partnerName || "a customer"}`);
          }
        }
      }
      prevLatestRef.current = latest;
      hasLoadedRef.current = true;
    },
    [flashConv]
  );

  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await api.get("/api/sellers/messages");
      const msgs = data.success ? data.messages || [] : [];
      setMessages(msgs); // replace state — no duplicate appends
      detectNewIncoming(msgs);
    } catch (err) {
      console.error("Fetch messages error:", err);
    } finally {
      setLoading(false);
    }
  }, [detectNewIncoming]);

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
        toast.error(getApiError(err, "Could not mark messages as read. Try again."));
      }
    },
    [visibleUnreadIds, fetchMessages, dispatchBadge]
  );

  // Mark everything as read (same button as the admin page).
  const markAllRead = useCallback(async () => {
    const ids = messages
      .filter((m) => !m.mine && !m.read)
      .map((m) => m.id)
      .filter((id) => !markedReadIds.current.has(id));
    if (!ids.length) {
      toast.success("All messages are already read");
      return;
    }
    try {
      const { data } = await api.patch("/api/sellers/messages/read", { messageIds: ids });
      if (data?.success) {
        ids.forEach((id) => markedReadIds.current.add(id));
        await fetchMessages();
        await dispatchBadge();
        toast.success("All messages marked as read");
      }
    } catch (err) {
      toast.error(getApiError(err, "Could not mark all messages as read. Try again."));
    }
  }, [messages, fetchMessages, dispatchBadge]);

  // Initial load + live socket updates (the Live toggle controls the socket).
  useEffect(() => {
    fetchMessages();
    if (!liveUpdates) return () => {};
    const unsub = onSocketEvent(["seller:new-message"], fetchMessages);
    return () => {
      unsub();
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [fetchMessages, liveUpdates]);

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

  const filterCounts = useMemo(
    () => ({
      all: conversations.length,
      unread: conversations.filter((c) => c.messages.some((m) => !m.mine && !m.read)).length,
      read: conversations.filter((c) => !c.messages.some((m) => !m.mine && !m.read)).length,
    }),
    [conversations]
  );

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const unread = c.messages.some((m) => !m.mine && !m.read);
      if (activeFilter === "unread" && !unread) return false;
      if (activeFilter === "read" && unread) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          c.partnerName?.toLowerCase().includes(term) ||
          c.messages.some((m) => m.message?.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [conversations, activeFilter, searchTerm]);

  const activeConv = activeKey === null ? null : conversations.find((c) => c.key === activeKey) || null;
  const activePartnerId = activeConv?.key && activeConv.key !== "no-buyer" ? activeConv.key : null;
  const isAdminConversation = adminUser != null && activeKey === adminUser.id;
  // Order refs only apply to buyer conversations; admin support never uses one
  // (the backend rejects buyer orders when the receiver is the admin).
  const activeOrderRef = isAdminConversation || !activeConv || activeKey === "no-buyer" ? null : activeConv.messages.find((m) => m.orderRef)?.orderRef;

  const activeLastTime =
    activeConv?.messages.find((m) => !m.mine)?.createdAt || activeConv?.messages[0]?.createdAt;

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
      toast.error(getApiError(err, "Failed to send message"));
    } finally {
      setSending(false);
    }
  };

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

  // Avatar for a conversation (square, like the admin list)
  const renderAvatar = (image, name, showDot = false, dotColor = "bg-shopprimary") => (
    <div className="relative w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 bg-shopprimarylight">
      {image ? (
        <img src={image} alt={name || "User"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <UserCircle className="w-4 h-4 text-shopmuted" />
      )}
      {showDot && (
        <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 ${dotColor} border border-white rounded-full`} />
      )}
    </div>
  );

  const renderRow = (c, options = {}) => {
    const last = c.messages[0];
    if (!last) return null;
    const unread = c.messages.filter((m) => !m.mine && !m.read).length;
    const isActive = activeKey === (options.allView ? null : c.key);
    const role = options.role || "customer";
    return (
      <button
        key={c.key}
        onClick={() => handleOpenConversation(options.allView ? null : c.key === "no-buyer" ? null : c.key)}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-all text-left ${
          flashKey === c.key
            ? "bg-shopprimarylight ring-2 ring-inset ring-shopprimary/60 animate-pulse"
            : isActive
              ? "bg-shopprimarylight/70"
              : "hover:bg-shopbg"
        }`}
      >
      {renderAvatar(c.partnerImage, c.partnerName, unread > 0)}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={`text-[13px] truncate ${
              unread > 0 ? "font-semibold text-shoptext" : "font-medium text-shoptext"
            }`}
          >
            {c.partnerName}
          </p>
          <RoleBadge role={role} />
          <span className="ml-auto text-[10px] font-mono text-shopmuted flex-shrink-0 tabular-nums">
            {formatRelativeTime(last.createdAt)}
          </span>
        </div>
        <p className="text-xs truncate text-shopmuted">
          {last.mine && <span className="text-shoptext/60">You: </span>}
          {last.message}
        </p>
      </div>
      {unread > 0 && (
        <span className="w-1.5 h-1.5 rounded-full bg-shopprimary flex-shrink-0" />
      )}
      </button>
    );
  };

  const renderBubble = (m) => {
    const label =
      activeKey === null
        ? m.partnerName || "Customer"
        : isAdminConversation
          ? "Admin"
          : "Customer";

    return (
      <div
        key={m.id}
        className={`flex flex-col ${m.mine ? "items-end" : "items-start"}`}
      >
        {m.message && (
          <div
            className={`max-w-[80%] px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
              m.mine
                ? "bg-shopprimary text-white rounded-2xl rounded-br-md"
                : "bg-shopbg text-shoptext rounded-2xl rounded-bl-md"
            }`}
          >
            {m.orderRef && (
              <p className={`text-[11px] mb-1 ${m.mine ? "text-[#c7d2fe]" : "text-shopmuted"}`}>
                About order #{m.orderRef.slice(-8)}
              </p>
            )}
            {m.message}
          </div>
        )}
        <span
          className={`text-[10px] mt-1 flex items-center gap-1 ${
            m.mine ? "text-[#c7d2fe]" : "text-shopmuted"
          }`}
        >
          <span className="font-semibold">{m.mine ? "You" : label}</span>
          <Clock /> {formatTime(m.createdAt)}
        </span>
      </div>
    );
  };

  return (
    <div className="p-3 md:p-4 flex flex-col lg:flex-row gap-3 h-full min-h-0 overflow-hidden">
      {/* Conversation list */}
      <div
        className={`bg-white rounded-lg shadow-sm border border-shopborder flex flex-col w-full lg:w-80 flex-shrink-0 min-h-0 ${
          mobileChatOpen ? "hidden lg:flex" : "flex"
        }`}
      >
        <div className="px-3 py-2.5 border-b border-shopborder">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2.5 min-w-0">
              <h2 className="text-[19px] font-bold text-shoptext tracking-tight flex-shrink-0">
                Messages
              </h2>
              <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-shopmuted truncate">
                {filterCounts.all} chats
                {filterCounts.unread > 0 ? ` · ${filterCounts.unread} unread` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {newMessageArrived && (
                <span className="flex items-center gap-1 text-[10px] bg-shopprimarylight text-shopprimary px-1.5 py-0.5 rounded-full animate-bounce">
                  <Bell className="w-3 h-3" /> New!
                </span>
              )}
              <button
                onClick={() => setLiveUpdates((v) => !v)}
                className="flex items-center gap-1.5 text-[11px] font-mono uppercase text-shopmuted hover:text-shoptext"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    liveUpdates ? "bg-shopgreen animate-pulse" : "bg-gray-400"
                  }`}
                />
                {liveUpdates ? "Live" : "Paused"}
              </button>
              <button
                onClick={markAllRead}
                title="Mark all read"
                className="p-1 text-shopmuted hover:text-shoptext hover:bg-shopbg rounded"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stat strip — each part also works as a filter */}
          <div className="grid grid-cols-3 divide-x divide-shopborder border-b border-shopborder">
            {[
              { key: "all", label: "All", value: filterCounts.all, dot: "bg-gray-400" },
              { key: "unread", label: "Unread", value: filterCounts.unread, dot: "bg-amber-500" },
              { key: "read", label: "Read", value: filterCounts.read, dot: "bg-shopgreen" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-2.5 py-2 flex items-center justify-between gap-2 transition-colors ${
                  activeFilter === f.key ? "bg-shopprimarylight" : "hover:bg-shopbg"
                }`}
              >
                <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.1em] text-shopmuted">
                  <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />
                  {f.label}
                </span>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    activeFilter === f.key ? "text-shopprimary" : "text-shoptext"
                  }`}
                >
                  {f.value}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative px-1 py-2.5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-shopmuted pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customers…"
              className={`${inputClass} w-full pl-9`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-shopmuted hover:text-shoptext"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* List — dense rows */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-7 h-7 border-4 border-shopprimary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-shopborder">
              {/* "All conversations" overview row */}
              <button
                onClick={() => handleOpenConversation(null)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-all text-left ${
                  activeKey === null ? "bg-shopprimarylight/70" : "hover:bg-shopbg"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-shopprimarylight flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-shopprimary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-shoptext">All conversations</p>
                  <p className="text-xs truncate text-shopmuted">
                    A mix of recent chats from all customers
                  </p>
                </div>
              </button>

              {/* Admin Support row — entry point that lazily loads the admin id */}
              {adminError ? (
                <p className="px-3 py-2.5 text-xs text-shopmuted">
                  Admin support is not available right now.
                </p>
              ) : (
                (() => {
                  const adminConv = adminUser ? conversations.find((c) => c.key === adminUser.id) : null;
                  const last = adminConv?.messages[0];
                  const isActive = activeKey === adminUser?.id;
                  return (
                    <button
                      key="__admin"
                      onClick={openAdminConversation}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-all text-left ${
                        flashKey === adminUser?.id
                          ? "bg-shopprimarylight ring-2 ring-inset ring-shopprimary/60 animate-pulse"
                          : isActive
                            ? "bg-shopprimarylight/70"
                            : "hover:bg-shopbg"
                      }`}
                    >
                      {renderAvatar(adminUser?.image || adminConv?.partnerImage, "Admin Support")}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-medium text-shoptext">Admin Support</p>
                          <RoleBadge role="admin" />
                          <span className="ml-auto text-[10px] font-mono text-shopmuted flex-shrink-0 tabular-nums">
                            {last ? formatRelativeTime(last.createdAt) : ""}
                          </span>
                        </div>
                        <p className="text-xs truncate text-shopmuted">
                          {last
                            ? `${last.mine ? "You: " : ""}${last.message}`
                            : "We usually reply within a day"}
                        </p>
                      </div>
                    </button>
                  );
                })()
              )}

              {/* Buyer conversations */}
              {filteredConversations
                .filter((c) => c.key !== adminUser?.id)
                .map((c) => renderRow(c))}

              {!loading &&
                filteredConversations.filter((c) => c.key !== adminUser?.id).length === 0 &&
                (searchTerm || activeFilter !== "all") && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setActiveFilter("all");
                    }}
                    className="w-full text-xs text-shopprimary hover:text-[#4338ca] px-3 py-2.5"
                  >
                    Clear filters
                  </button>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Thread */}
      <div
        className={`bg-white rounded-lg shadow-sm border border-shopborder flex flex-col flex-1 min-h-0 ${
          mobileChatOpen ? "flex" : "hidden lg:flex"
        }`}
      >
        <div className="px-3 py-2.5 border-b border-shopborder flex items-center gap-2.5">
          <button
            onClick={() => setMobileChatOpen(false)}
            className="lg:hidden -ml-1 p-1.5 -mt-1 rounded-md text-shoptext hover:bg-shopprimarylight flex-shrink-0"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          {activeConv ? (
            <>
              <div className="relative w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 bg-shopprimarylight">
                {activeConv.partnerImage ? (
                  <img
                    src={activeConv.partnerImage}
                    alt={activeConv.partnerName || "User"}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-[11px] font-bold text-shoptext">
                    {getInitials(activeConv.partnerName)}
                  </span>
                )}
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-shopgreen border border-white rounded-full" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-shoptext truncate">
                    {activeConv.partnerName}
                  </h3>
                  <RoleBadge role={isAdminConversation ? "admin" : "customer"} />
                </div>
                <p className="text-[11px] font-mono text-shopmuted uppercase tracking-wide">
                  Last {formatRelativeTime(activeLastTime)}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-lg bg-shopprimarylight flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-shopmuted" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-shoptext">All messages</h3>
                <p className="text-[11px] font-mono text-shopmuted uppercase tracking-wide">
                  {filterCounts.all} chats
                </p>
              </div>
            </>
          )}
        </div>

        <div ref={threadRef} className="flex-1 overflow-auto p-3 md:p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-shopprimary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : thread.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-shopmuted">
              <MessageSquare className="w-12 h-12 mb-3 text-shopborder" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">
                {activeConv
                  ? `Say hello to ${activeConv.partnerName} to start the conversation`
                  : "When customers write about an order, the chat appears here"}
              </p>
            </div>
          ) : (
            <>
              {thread.map((m, i) => {
                const prev = thread[i - 1]; // thread is oldest→newest; i-1 renders above
                const showDay =
                  activeKey === null &&
                  (!prev || fmtDay(prev.createdAt) !== fmtDay(m.createdAt));
                return (
                  <Fragment key={m.id}>
                    {showDay && (
                      <div className="flex items-center justify-center py-1">
                        <span className="text-[10px] font-medium text-shopmuted bg-shopbg border border-shopborder rounded-full px-2.5 py-0.5">
                          {fmtDay(m.createdAt)}
                        </span>
                      </div>
                    )}
                    {renderBubble(m)}
                  </Fragment>
                );
              })}
            </>
          )}
        </div>

        {/* Composer */}
        {activePartnerId && (
          <form onSubmit={handleSend} className="px-3 md:px-4 py-3 border-t border-shopborder">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={`Message ${activeConv?.partnerName || "customer"}…`}
                className={`${inputClass} flex-1`}
              />
              <button
                type="submit"
                disabled={sending || !reply.trim()}
                className="px-3 py-2 rounded-lg bg-shopprimary text-white text-[13px] font-medium hover:bg-[#4338ca] disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0"
              >
                {sending ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Send
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
