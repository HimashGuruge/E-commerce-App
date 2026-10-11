import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/utils/api";
import { onSocketEvent } from "@/utils/socket";
import { Bell, Truck, MessageSquare, Package, CheckCircle, CheckCheck, Star, Volume2, VolumeX, Monitor, X } from "lucide-react";

const POLLING_INTERVAL = 30000;

const TYPE_CONFIG = {
  order_placed: { icon: Package, color: "text-orange-500", bg: "bg-orange-50" },
  order_update: { icon: Truck, color: "text-blue-500", bg: "bg-blue-50" },
  order_delivered: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-50" },
  admin_reply: { icon: MessageSquare, color: "text-brand-500", bg: "bg-brand-50" },
  REVIEW_REMINDER: { icon: Star, color: "text-yellow-500", bg: "bg-yellow-50" },
};

const SHOW_TYPES = new Set(["order_placed", "order_update", "order_delivered", "admin_reply", "REVIEW_REMINDER"]);

function groupByDate(notifications) {
  const groups = {};
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now - 86400000).toDateString();

  notifications.forEach((n) => {
    if (!SHOW_TYPES.has(n.type)) return;
    const date = new Date(n.createdAt).toDateString();
    const label =
      date === today ? "Today" : date === yesterday ? "Yesterday" : date;
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  });

  return groups;
}

export default function NotificationWidget() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem("notification_sound") !== "false"
  );
  const [pushEnabled, setPushEnabled] = useState(
    () => localStorage.getItem("notification_push") === "true"
  );
  const prevUnreadRef = useRef(0);
  const pollingRef = useRef(null);
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
    } catch (err) {
      console.error("Delete error:", err);
    }
  }, [token]);

  const handleNotificationClick = useCallback(async (notification) => {
    if (!notification.read) {
      await markAsRead(notification._id);
    }

    if (notification.type === "REVIEW_REMINDER") {
      // Deep link straight to the product's review section
      const params = new URLSearchParams({ review: "1" });
      const productId = notification.product?._id || notification.productId;
      if (productId) navigate(`/shop/productoverview/${productId}?${params.toString()}`);
    } else if (notification.type === "admin_reply") {
      window.dispatchEvent(new CustomEvent("trigger-chatbot-message"));
    } else if (notification.type === "order_update") {
      navigate("/orders");
    }

    setIsOpen(false);
  }, [markAsRead, navigate]);

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

  useEffect(() => {
    if (!token) return;
    fetchUnreadCount();
    pollingRef.current = setInterval(fetchUnreadCount, POLLING_INTERVAL);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [token, fetchUnreadCount]);

  // Real-time: refresh unread count when the server pushes an update
  useEffect(() => {
    if (!token) return;
    return onSocketEvent(["order:update", "chat:new-message", "notification:new"], () => fetchUnreadCount());
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
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!token) return null;

  const grouped = groupByDate(notifications);

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
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-slate-800">
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Settings"
              >
                <Monitor size={14} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                >
                  <CheckCheck size={12} />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {showSettings && (
            <div className="p-3 bg-slate-50 border-b border-slate-100 space-y-2">
              <button
                onClick={toggleSound}
                className="w-full flex items-center justify-between text-sm text-slate-600 hover:text-brand-500 transition-colors"
              >
                <span className="flex items-center gap-2">
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  Notification Sound
                </span>
                <span className={`w-8 h-4 rounded-full transition-colors ${soundEnabled ? "bg-brand-500" : "bg-slate-300"} relative`}>
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${soundEnabled ? "left-4.5" : "left-0.5"}`} />
                </span>
              </button>
              <button
                onClick={togglePush}
                className="w-full flex items-center justify-between text-sm text-slate-600 hover:text-brand-500 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Monitor size={16} />
                  Desktop Notifications
                </span>
                <span className={`w-8 h-4 rounded-full transition-colors ${pushEnabled ? "bg-brand-500" : "bg-slate-300"} relative`}>
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${pushEnabled ? "left-4.5" : "left-0.5"}`} />
                </span>
              </button>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
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
                    const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
                    const Icon = config.icon;
                    const time = new Date(n.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={n._id}
                        className={`group relative p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                          !n.read ? "bg-brand-50/30" : ""
                        }`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(n._id);
                          }}
                          className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                          aria-label="Delete notification"
                        >
                          <X size={12} />
                        </button>
                        <button
                          onClick={() => handleNotificationClick(n)}
                          className="w-full text-left"
                        >
                          <div className="flex gap-2.5 pr-4">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                              <Icon size={16} className={config.color} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                  {n.title}
                                </p>
                                {!n.read && (
                                  <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />
                                )}
                              </div>
                              <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                                {n.message}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {time}
                              </p>
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
