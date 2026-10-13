import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/utils/api";
import { onSocketEvent } from "@/utils/socket";
import {
  Bell,
  Truck,
  MessageSquare,
  Package,
  CheckCircle,
  CheckCheck,
  Star,
  Volume2,
  VolumeX,
  Monitor,
  X,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Type metadata (icons, labels). Unknown types get a safe fallback instead of
// crashing — every one of the user's notifications is shown.
// ---------------------------------------------------------------------------
const TYPE_CONFIG = {
  order_placed: { icon: Package, color: "text-orange-500", bg: "bg-orange-50", label: "Order Placed" },
  order_update: { icon: Truck, color: "text-blue-500", bg: "bg-blue-50", label: "Order Update" },
  order_delivered: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-50", label: "Order Delivered" },
  ORDER_STATUS: { icon: Truck, color: "text-blue-500", bg: "bg-blue-50", label: "Order Status" },
  admin_reply: { icon: MessageSquare, color: "text-brand-500", bg: "bg-brand-50", label: "Admin Reply" },
  REVIEW_REMINDER: { icon: Star, color: "text-yellow-500", bg: "bg-yellow-50", label: "Review Reminder" },
  SELLER_ALERT: { icon: Bell, color: "text-brand-500", bg: "bg-brand-50", label: "Alert" },
};
const FALLBACK_TYPE = { icon: Bell, color: "text-slate-500", bg: "bg-slate-100", label: "Notification" };

// Explicit actions shown inside the message detail pane (Gmail-style).
// Clicking a notification only opens the message; these buttons navigate.
const TYPE_ACTIONS = {
  order_placed: { label: "Go to my orders", to: "/orders" },
  order_update: { label: "Go to my orders", to: "/orders" },
  order_delivered: { label: "Go to my orders", to: "/orders" },
  ORDER_STATUS: { label: "Go to my orders", to: "/orders" },
  admin_reply: { label: "Open chat", event: "trigger-chatbot-message" },
};

function groupByDate(notifications) {
  const groups = {};
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now - 86400000).toDateString();

  notifications.forEach((n) => {
    const date = new Date(n.createdAt).toDateString();
    const label = date === today ? "Today" : date === yesterday ? "Yesterday" : date;
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  });

  return groups;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export default function NotificationWidget() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null); // full doc from GET /:id (fallback: list item)
  const [detailLoading, setDetailLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem("notification_sound") !== "false"
  );
  const [pushEnabled, setPushEnabled] = useState(
    () => localStorage.getItem("notification_push") === "true"
  );
  const prevUnreadRef = useRef(0);
  const dropdownRef = useRef(null);
  const audioRef = useRef(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/notification.mp3");
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch {}
  }, [soundEnabled]);

  const requestPushPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    const result = await Notification.requestPermission();
    return result === "granted";
  }, []);

  const showPushNotification = useCallback((notification) => {
    if (!pushEnabled || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (document.visibilityState === "visible") return;

    new Notification(notification.title, {
      body: notification.message,
      icon: "/logo192.png",
      badge: "/logo192.png",
      tag: notification._id,
      requireInteraction: false,
    });
  }, [pushEnabled]);

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await api.get(`/api/notifications/unread-count`);
      const newCount = data.count || 0;
      if (newCount > prevUnreadRef.current && prevUnreadRef.current > 0) {
        playNotificationSound();
      }
      setUnreadCount(newCount);
      prevUnreadRef.current = newCount;
    } catch (err) {
      console.error("Unread count error:", err);
    }
  }, [token, playNotificationSound]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await api.get(`/api/notifications/user`, {
        params: { limit: 20 },
      });
      setNotifications(data.notifications || []);
      // Keep the open detail in sync with the fresh list
      setDetail((cur) =>
        cur
          ? (data.notifications.find((n) => n._id === cur._id) || null)
          : null
      );
    } catch (err) {
      console.error("Fetch notifications error:", err);
    }
  }, [token]);

  const markAsRead = useCallback(async (id) => {
    if (!token) return;
    try {
      await api.patch(`/api/notifications/${id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setDetail((cur) => (cur && cur._id === id ? { ...cur, read: true } : cur));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Mark read error:", err);
    }
  }, [token]);

  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    try {
      await api.post(`/api/notifications/mark-all-read`, {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setDetail((cur) => (cur ? { ...cur, read: true } : cur));
      setUnreadCount(0);
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  }, [token]);

  const deleteNotification = useCallback(async (id) => {
    if (!token) return;
    try {
      await api.delete(`/api/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setDetail((cur) => (cur && cur._id === id ? null : cur));
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      console.error("Delete error:", err);
    }
  }, [token, selectedId]);

  // Open the message detail (Gmail-style): click = show full message.
  const selectNotification = useCallback(async (notification) => {
    setSelectedId(notification._id);
    if (!notification.read) {
      markAsRead(notification._id);
    }
    // Load the full, authoritative document for the detail pane
    setDetail(notification);
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/api/notifications/${notification._id}`);
      if (data.success) setDetail(data.notification);
    } catch (err) {
      console.error("Load notification error:", err);
    } finally {
      setDetailLoading(false);
    }
  }, [markAsRead]);

  const closeNotification = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
  }, []);

  // Explicit action button inside the detail pane (no auto-navigation on click)
  const runDetailAction = useCallback(() => {
    if (!detail) return;
    if (detail.type === "REVIEW_REMINDER") {
      const productId = detail.product?._id || detail.productId;
      if (productId) {
        navigate(`/shop/productoverview/${productId}?review=1`);
        return;
      }
    }
    const action = TYPE_ACTIONS[detail.type];
    if (action) {
      if (action.event) {
        window.dispatchEvent(new CustomEvent(action.event));
      } else if (action.to) {
        navigate(action.to);
      }
    }
    setIsOpen(false);
  }, [detail, navigate]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) {
        fetchNotifications();
      }
      return !prev;
    });
  }, [fetchNotifications]);

  const toggleSound = useCallback(() => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem("notification_sound", String(newVal));
  }, [soundEnabled]);

  const togglePush = useCallback(async () => {
    if (!pushEnabled) {
      const granted = await requestPushPermission();
      if (!granted) return;
    }
    const newVal = !pushEnabled;
    setPushEnabled(newVal);
    localStorage.setItem("notification_push", String(newVal));
  }, [pushEnabled, requestPushPermission]);

  // One-time initial fetch; live updates arrive via the socket below (no HTTP polling)
  useEffect(() => {
    if (!token) return;
    fetchUnreadCount();
  }, [token, fetchUnreadCount]);

  // Real-time: refresh unread count when the server pushes an update
  useEffect(() => {
    if (!token) return;
    return onSocketEvent(
      ["order:update", "chat:new-message", "notification:new", "admin:stats-changed"],
      () => fetchUnreadCount()
    );
  }, [token, fetchUnreadCount]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchUnreadCount();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchUnreadCount]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setShowSettings(false);
        closeNotification();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeNotification]);

  if (!token) return null;

  const grouped = groupByDate(notifications);
  const detailType = detail ? TYPE_CONFIG[detail.type] || FALLBACK_TYPE : null;
  const detailAction = detail
    ? detail.type === "REVIEW_REMINDER" || TYPE_ACTIONS[detail.type]
      ? {
          ...(detail.type === "REVIEW_REMINDER"
            ? { label: "Review this product" }
            : TYPE_ACTIONS[detail.type]),
        }
      : null
    : null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleOpen}
        className="relative p-2 text-slate-600 hover:text-brand-500 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 z-50 flex w-[min(20rem,calc(100vw-2rem))] h-[min(24rem,calc(100vh-6rem))] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden md:w-[36rem] md:h-[26rem]">
          {/* ================= LIST PANE ================= */}
          <div
            className={`w-full md:w-60 md:flex-none flex-col border-slate-100 flex ${
              selectedId ? "hidden md:flex" : ""
            }`}
          >
            <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-1.5 text-[11px] font-bold text-brand-600">
                    ({unreadCount} new)
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 px-1"
                  >
                    <CheckCheck size={13} />
                    Mark all
                  </button>
                )}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Settings"
                >
                  <Monitor size={14} />
                </button>
              </div>
            </div>

            {showSettings && (
              <div className="p-3 bg-slate-50 border-b border-slate-100 space-y-2">
                <button
                  onClick={toggleSound}
                  className="w-full flex items-center justify-between text-sm text-slate-600 hover:text-brand-500 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                    Notification Sound
                  </span>
                  <span className={`w-8 h-4 rounded-full transition-colors relative ${soundEnabled ? "bg-brand-500" : "bg-slate-300"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${soundEnabled ? "translate-x-4" : ""}`} />
                  </span>
                </button>
                <button
                  onClick={togglePush}
                  className="w-full flex items-center justify-between text-sm text-slate-600 hover:text-brand-500 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Monitor size={15} />
                    Desktop Notifications
                  </span>
                  <span className={`w-8 h-4 rounded-full transition-colors relative ${pushEnabled ? "bg-brand-500" : "bg-slate-300"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${pushEnabled ? "translate-x-4" : ""}`} />
                  </span>
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Bell size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No notifications</p>
                  <p className="text-xs mt-1">You're all caught up</p>
                </div>
              ) : (
                Object.entries(grouped).map(([date, items]) => (
                  <div key={date}>
                    <div className="px-3 py-2 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      {date}
                    </div>
                    {items.map((n) => {
                      const config = TYPE_CONFIG[n.type] || FALLBACK_TYPE;
                      const Icon = config.icon;
                      const isSelected = selectedId === n._id;
                      return (
                        <button
                          key={n._id}
                          onClick={() => selectNotification(n)}
                          className={`group relative w-full text-left px-3 py-2.5 border-b border-slate-50 transition-colors ${
                            isSelected ? "bg-brand-50/60" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                              <Icon size={15} className={config.color} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                {!n.read && (
                                  <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" title="Unread" />
                                )}
                                <p className={`text-sm truncate flex-1 ${!n.read ? "font-semibold text-slate-900" : "font-medium text-slate-600"}`}>
                                  {n.title}
                                </p>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">
                                {n.message}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {timeAgo(n.createdAt)}
                              </p>
                            </div>
                          </div>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(n._id);
                            }}
                            className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                            role="button"
                            aria-label="Delete notification"
                          >
                            <X size={12} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ================= DETAIL PANE ================= */}
          <div
            className={`flex-1 min-w-0 flex-col border-l border-slate-100 bg-white ${
              selectedId ? "flex" : "hidden md:flex"
            }`}
          >
            {selectedId && detail ? (
              <>
                {/* Detail header (back button on mobile) */}
                <div className="px-3 py-2.5 border-b border-slate-100 flex items-center gap-2">
                  <button
                    onClick={closeNotification}
                    className="p-1 -ml-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    aria-label="Back to list"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <span className="flex-1 text-sm font-semibold text-slate-700 truncate">
                    Message
                  </span>
                  <button
                    onClick={() => deleteNotification(detail._id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Delete notification"
                    title="Delete"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Detail body */}
                <div className="flex-1 overflow-y-auto">
                  {detailLoading ? (
                    <div className="p-4">
                      <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
                      <div className="h-3 w-1/3 bg-slate-100 rounded animate-pulse mt-3" />
                      <div className="h-16 bg-slate-50 rounded-xl mt-4 animate-pulse" />
                    </div>
                  ) : (
                    <div className="p-4">
                      {/* Type + status */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${detailType.bg} ${detailType.color}`}>
                          <detailType.icon size={13} />
                          {detailType.label}
                        </span>
                        <span
                          className={`text-[11px] font-medium px-2 py-1 rounded-full ${
                            detail.read ? "bg-slate-100 text-slate-500" : "bg-brand-50 text-brand-600"
                          }`}
                        >
                          {detail.read ? "Read" : "Unread"}
                        </span>
                      </div>

                      {/* Full title — never truncated */}
                      <h4 className="text-base font-semibold text-slate-900 leading-snug break-words">
                        {detail.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(detail.createdAt).toLocaleString([], {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>

                      {/* Full message — never clipped */}
                      <div className="mt-4 bg-slate-50 rounded-xl p-4">
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                          {detail.message}
                        </p>
                      </div>

                      {/* Explicit action (Gmail-style: navigate only when asked) */}
                      {detailAction && (
                        <button
                          onClick={runDetailAction}
                          className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors"
                        >
                          {detailAction.label}
                          <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Desktop placeholder when nothing is selected */
              <div className="flex-1 flex items-center justify-center text-center px-6">
                <div>
                  <Bell size={28} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-400">
                    Select a notification to view details
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
