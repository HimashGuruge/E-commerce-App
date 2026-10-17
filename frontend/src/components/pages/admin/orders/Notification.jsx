import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  MessageSquare,
  Search,
  Send,
  Paperclip,
  X,
  CheckCircle,
  Bell,
  UserCircle,
} from "lucide-react";
import api from "@/utils/api";
import { onSocketEvent } from "@/utils/socket";
import uploadToMedia from "@/components/utils/Mediaupload.jsx";

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
  if (!name) return "U";
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export default function Notification() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeUserId, setActiveUserId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [liveUpdates, setLiveUpdates] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  // Thread state for the selected conversation
  const [messages, setMessages] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newMessageArrived, setNewMessageArrived] = useState(false);
  const [toast, setToast] = useState(null);

  const threadEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const activeUserIdRef = useRef(null);
  const liveUpdatesRef = useRef(true);
  const prevCountRef = useRef(0);

  useEffect(() => {
    activeUserIdRef.current = activeUserId;
  }, [activeUserId]);

  useEffect(() => {
    liveUpdatesRef.current = liveUpdates;
  }, [liveUpdates]);

  const showToast = (text) => {
    setToast(text);
  };

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get("/api/notifications/admin/all");
      const list = Array.isArray(data) ? data : data?.data || [];
      const users = (Array.isArray(list) ? list : []).filter((n) => n?.userId);

      if (
        prevCountRef.current > 0 &&
        users.length > prevCountRef.current &&
        liveUpdatesRef.current
      ) {
        setNewMessageArrived(true);
        setTimeout(() => setNewMessageArrived(false), 5000);
      }
      prevCountRef.current = users.length;

      setConversations(users);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Fetch conversations error:", err);
      setError("Failed to load conversations. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchThread = useCallback(async (userId, force = false) => {
    try {
      const { data } = await api.get(`/api/notifications/admin/chat/${userId}`);
      const list = Array.isArray(data) ? data : data?.data || data?.chats || [];
      // Only replace the thread when still looking at this user
      if (!force && activeUserIdRef.current !== userId) return;
      setMessages(list);
      setLoadingThread(false);
    } catch (err) {
      console.error("Fetch thread error:", err);
      if (!force) setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Real-time: refresh the list and the open thread when the backend pushes
  // a new user message. The Live toggle controls this subscription.
  useEffect(() => {
    if (!liveUpdates) return undefined;
    return onSocketEvent(["chat:unseen-user", "chat:new-message"], () => {
      fetchConversations();
      if (activeUserIdRef.current) fetchThread(activeUserIdRef.current);
    });
  }, [liveUpdates, fetchConversations, fetchThread]);

  // Click a conversation -> show its full message/thread + mark it read
  const openConversation = (notification) => {
    if (!notification?.userId) return;
    if (activeUserId === notification.userId) return;

    setActiveUserId(notification.userId);
    setMessages([]);
    setReply("");
    setPendingImage(null);
    setLoadingThread(true);
    fetchThread(notification.userId, true);
    if (!notification.isRead) {
      api
        .patch(`/api/notifications/admin/mark-read/${notification.userId}`)
        .then(() => {
          setConversations((prev) =>
            prev.map((n) =>
              n.userId === notification.userId ? { ...n, isRead: true } : n
            )
          );
          // Refresh the sidebar's unread badge in real time
          window.dispatchEvent(new Event("notificationsUpdated"));
        })
        .catch(() => {
          /* non-critical */
        });
    }
  };

  // Auto-scroll to the newest message once the thread renders
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loadingThread]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!activeUserId || sending) return;
    const text = reply.trim();
    if (!text && !pendingImage) return;

    setSending(true);
    try {
      const payload = { message: text };
      if (pendingImage) payload.imageUrl = pendingImage;
      await api.post(`/api/notifications/admin/reply/${activeUserId}`, payload);

      await fetchThread(activeUserId, true);
      fetchConversations();
      setReply("");
      setPendingImage(null);
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleImagePick = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const uploadedUrl = await uploadToMedia(file, "misc");
      if (!uploadedUrl) throw new Error("Upload failed");
      setPendingImage(uploadedUrl);
    } catch {
      showToast("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post(`/api/notifications/admin/mark-all-read`);
      setConversations((prev) => prev.map((n) => ({ ...n, isRead: true })));
      showToast("All messages marked as read");
      fetchConversations();
      // Refresh the sidebar's unread badge in real time
      window.dispatchEvent(new Event("notificationsUpdated"));
    } catch {
      showToast("Failed to mark all as read");
    }
  };

  const filterCounts = useMemo(
    () => ({
      all: conversations.length,
      unread: conversations.filter((n) => !n.isRead).length,
      read: conversations.filter((n) => n.isRead).length,
    }),
    [conversations]
  );

  const filteredConversations = useMemo(() => {
    return conversations.filter((n) => {
      if (activeFilter === "unread" && n.isRead) return false;
      if (activeFilter === "read" && !n.isRead) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          n.userName?.toLowerCase().includes(term) ||
          n.message?.toLowerCase().includes(term) ||
          n.userId?.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [conversations, activeFilter, searchTerm]);

  const activeConv = conversations.find((n) => n.userId === activeUserId) || null;
  const activeImage = activeConv?.userImage || null;

  const renderBubble = (msg) => {
    const senderType = msg.senderType || (msg.isAdmin ? "admin" : "user");
    const isUser = senderType === "user";
    const isBot = senderType === "bot" || msg.isBot;
    const time = msg.createdAt || msg.sentAt;
    const text = msg.message || "";
    const image = msg.imageUrl || null;
    const label = isBot ? "AI Assistant" : "Support";

    return (
      <div
        key={msg._id}
        className={`flex flex-col ${isUser ? "items-start" : "items-end"}`}
      >
        {image && (
          <img
            src={image}
            alt=""
            referrerPolicy="no-referrer"
            className="max-w-[220px] max-h-[220px] object-cover rounded-xl mb-1.5 cursor-pointer"
            onClick={() => window.open(image, "_blank")}
          />
        )}
        {text && (
          <div
            className={`max-w-[80%] px-4 py-2.5 text-sm whitespace-pre-wrap ${
              isUser
                ? "bg-slate-100 text-slate-800 rounded-2xl rounded-bl-md"
                : "bg-brand-600 text-white rounded-2xl rounded-br-md"
            }`}
          >
            {text}
          </div>
        )}
        <span
          className={`text-[10px] mt-1 flex items-center gap-1 ${
            isUser ? "text-slate-400" : "text-brand-200"
          }`}
        >
          {isUser ? (
            <RoleBadge role={msg.userRole || activeConv?.userRole} />
          ) : (
            <span className="font-semibold">{label}</span>
          )}
          <Clock /> {time ? formatTime(time) : ""}
        </span>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 flex flex-col lg:flex-row gap-4 h-[calc(100vh-160px)] min-h-[600px] lg:h-[calc(100vh-120px)]">
      {/* Conversation list */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col w-full lg:w-80 flex-shrink-0 max-h-[420px] lg:max-h-none">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">
              Customer Support
            </h2>
            <button
              onClick={markAllAsRead}
              title="Mark all read"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-slate-500">Chats with your customers</p>
            <button
              onClick={() => setLiveUpdates((v) => !v)}
              className="flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-slate-600"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  liveUpdates ? "bg-green-500 animate-pulse" : "bg-gray-400"
                }`}
              />
              {liveUpdates ? "Live" : "Paused"}
            </button>
            {lastUpdated && (
              <span className="text-[10px] text-slate-400">
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            {newMessageArrived && (
              <span className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full animate-bounce">
                <Bell className="w-3 h-3" /> New!
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customers…"
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-1.5 mt-2.5">
            {[
              { key: "all", label: `All (${filterCounts.all})` },
              { key: "unread", label: `Unread (${filterCounts.unread})` },
              { key: "read", label: `Read (${filterCounts.read})` },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  activeFilter === f.key
                    ? "bg-brand-50 text-brand-700"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {error ? (
            <div className="p-4 text-center">
              <p className="text-sm text-red-500">{error}</p>
              <button
                onClick={fetchConversations}
                className="mt-2 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-7 h-7 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">
                {searchTerm || activeFilter !== "all"
                  ? "No conversations match"
                  : "No conversations yet"}
              </p>
              {(searchTerm || activeFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setActiveFilter("all");
                  }}
                  className="text-xs text-brand-600 hover:text-brand-700 mt-1"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            filteredConversations.map((c) => {
              const unread = !c.isRead;
              return (
                <button
                  key={c.userId}
                  onClick={() => openConversation(c)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                    activeUserId === c.userId ? "bg-brand-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="relative w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 bg-brand-100">
                    {c.userImage ? (
                      <img
                        src={c.userImage}
                        alt={c.userName || "User"}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <UserCircle className="w-4 h-4 text-brand-600" />
                    )}
                    {unread && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-brand-600 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm truncate ${
                          unread ? "font-semibold text-slate-900" : "font-medium text-slate-900"
                        }`}
                      >
                        {c.userName || "Unknown User"}
                      </p>
                      <RoleBadge role={c.userRole} />
                      <span className="text-[10px] text-slate-400 flex-shrink-0">
                        {formatRelativeTime(c.sentAt || c.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {c.imageUrl && !c.message
                        ? "📷 Image"
                        : c.message || "No message"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Thread */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-[420px]">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          {activeConv ? (
            <>
              <div className="relative w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 bg-brand-100">
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={activeConv.userName || "User"}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-xs font-bold text-brand-600">
                    {getInitials(activeConv.userName)}
                  </span>
                )}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  {activeConv.userName || "User"}
                </h3>
                <div className="flex items-center gap-1.5">
                  <RoleBadge role={activeConv.userRole} />
                  <span className="text-[11px] text-slate-400">
                    Last message {formatRelativeTime(activeConv.sentAt || activeConv.createdAt)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-brand-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                No conversation selected
              </h3>
            </>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {!activeUserId ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <MessageSquare className="w-12 h-12 mb-3 text-slate-300" />
              <p className="text-sm">Select a conversation to view messages</p>
              <p className="text-xs mt-1">
                The full chat with the customer will appear here
              </p>
            </div>
          ) : loadingThread ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <MessageSquare className="w-12 h-12 mb-3 text-slate-300" />
              <p className="text-sm">No messages yet</p>
            </div>
          ) : (
            <>
              {messages.map((m) => renderBubble(m))}
              <div ref={threadEndRef} />
            </>
          )}
        </div>

        {/* Composer */}
        {activeUserId && (
          <div className="p-4 border-t border-slate-100">
            {pendingImage && (
              <div className="flex items-center gap-2 mb-2">
                <img
                  src={pendingImage}
                  alt="pending attachment"
                  className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                />
                <span className="text-xs text-slate-400">
                  Image attached — ready to send
                </span>
                <button
                  onClick={() => setPendingImage(null)}
                  className="text-slate-400 hover:text-red-500"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach image"
                disabled={uploadingImage}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-40 flex-shrink-0"
              >
                {uploadingImage ? (
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImagePick(e.target.files?.[0])}
              />
              <input
                type="text"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={`Message ${activeConv?.userName || "customer"}…`}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="submit"
                disabled={sending || (!reply.trim() && !pendingImage)}
                className="px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-40 flex items-center gap-2 flex-shrink-0"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }) {
  const isSeller = role === "seller";
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0 ${
        isSeller ? "bg-amber-100 text-amber-700" : "bg-brand-50 text-brand-700"
      }`}
    >
      {isSeller ? "Seller" : "Customer"}
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
