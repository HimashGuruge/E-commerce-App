import { useState, useEffect, useCallback, useMemo } from "react";
import { FiX, FiSend } from "react-icons/fi";
import api from "@/utils/api";
import { onSocketEvent } from "@/utils/socket";

const formatRelativeTime = (date) => {
  if (!date) return "";
  const now = new Date();
  const msgDate = new Date(date);
  const diffInSeconds = Math.floor((now - msgDate) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;

  return msgDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

// Pick an emoji + tint for the icon tile based on the alert title
const iconFor = (title) => {
  const t = String(title || "").toLowerCase();
  if (/(order|purchase|refund|cancel)/.test(t))
    return { emoji: "🛍️", cls: "bg-[#e5edff]" };
  if (/(stock|inventory|item|product|listing)/.test(t))
    return { emoji: "📦", cls: "bg-[#fff0d8]" };
  if (/(message|chat|inquiry|reply)/.test(t))
    return { emoji: "💬", cls: "bg-[#e1f8ed]" };
  if (/(payment|price|money|fee)/.test(t))
    return { emoji: "💳", cls: "bg-[#f0e8ff]" };
  return { emoji: "🔔", cls: "bg-[#e5edff]" };
};

export default function SellerNotifications() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all"); // all | unread | read
  const [selectedId, setSelectedId] = useState(null); // open modal
  const [markingAll, setMarkingAll] = useState(false);

  // Reply state (inside the modal)
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyStatus, setReplyStatus] = useState(null); // { ok, text }

  const selectedAlert = alerts.find((a) => a._id === selectedId) || null;

  const fetchAlerts = useCallback(async () => {
    try {
      const { data } = await api.get("/api/notifications/seller");
      if (data.success) {
        setAlerts(data.alerts || []);
        // Keep the sidebar badge in sync
        window.dispatchEvent(new CustomEvent("seller-alerts-changed", { detail: data.unreadCount }));
      }
    } catch (err) {
      console.error("Fetch alerts error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    // Live update when the admin sends an alert while this page is open
    const unsubscribe = onSocketEvent(["seller:alert"], () => fetchAlerts());
    return unsubscribe;
  }, [fetchAlerts]);

  // Reset reply state when the modal target changes
  useEffect(() => {
    setReply("");
    setReplyStatus(null);
  }, [selectedId]);

  const filterCounts = useMemo(
    () => ({
      all: alerts.length,
      unread: alerts.filter((a) => !a.read).length,
      read: alerts.filter((a) => a.read).length,
    }),
    [alerts]
  );

  const filtered = useMemo(
    () =>
      alerts.filter((a) => {
        if (activeFilter === "unread") return !a.read;
        if (activeFilter === "read") return a.read;
        return true;
      }),
    [alerts, activeFilter]
  );

  // Open a row: show the full content and mark it read (in place, no refetch)
  const openAlert = (id) => {
    setSelectedId(id);
    const alert = alerts.find((a) => a._id === id);
    if (alert && !alert.read) {
      api
        .patch(`/api/notifications/seller/read/${id}`)
        .then(() => {
          setAlerts((prev) => prev.map((a) => (a._id === id ? { ...a, read: true } : a)));
          const unread = alerts.filter((a) => !a.read && a._id !== id).length;
          window.dispatchEvent(new CustomEvent("seller-alerts-changed", { detail: unread }));
        })
        .catch((err) => console.error("Mark read error:", err));
    }
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      await api.post("/api/notifications/seller/mark-all-read");
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to mark all as read");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!selectedId || sendingReply || !reply.trim()) return;
    setSendingReply(true);
    setReplyStatus(null);
    try {
      await api.post(`/api/notifications/seller/reply/${selectedId}`, {
        text: reply.trim(),
      });
      setAlerts((prev) => prev.map((a) => (a._id === selectedId ? { ...a, read: true } : a)));
      setReply("");
      setReplyStatus({ ok: true, text: "Message sent to admin" });
    } catch (err) {
      setReplyStatus({
        ok: false,
        text: err.response?.data?.error || "Failed to send message",
      });
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="min-h-full bg-[#f5f7fb] px-4 py-8 md:px-16 md:py-[35px]">
      <div className="mx-auto max-w-[760px] overflow-hidden rounded-2xl border border-[#e7eaf0] bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#edf0f4] px-4 py-4 md:px-6 md:py-6">
          <div>
            <h2 className="text-[23px] font-bold leading-tight text-[#172033]">
              Notifications{" "}
              {filterCounts.unread > 0 && (
                <span className="text-[15px] font-semibold text-[#5267d9]">
                  ({filterCounts.unread} unread)
                </span>
              )}
            </h2>
            <p className="mt-1.5 text-[13px] text-[#7a8496]">
              Stay updated with your store activity
            </p>
          </div>
          <button
            onClick={markAll}
            disabled={markingAll || filterCounts.unread === 0}
            className="text-[13px] font-medium text-[#5267d9] hover:underline disabled:opacity-40 disabled:no-underline"
          >
            {markingAll ? "Marking…" : "Mark all as read"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-[#edf0f4] px-4 md:px-6">
          {[
            { key: "all", label: "All" },
            { key: "unread", label: "Unread" },
            { key: "read", label: "Read" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveFilter(t.key)}
              className={`-mb-px border-b-2 pb-4 pt-4 text-sm transition-colors ${
                activeFilter === t.key
                  ? "border-[#4258d5] font-bold text-[#4258d5]"
                  : "border-transparent text-[#7a8496] hover:text-[#4a5568]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="divide-y divide-[#f0f2f6]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-[15px] px-6 py-5">
                <div className="h-[43px] w-[43px] rounded-xl bg-[#eef0f5] animate-pulse" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3.5 w-2/5 rounded bg-[#eef0f5] animate-pulse" />
                  <div className="h-3 w-4/5 rounded bg-[#eef0f5] animate-pulse" />
                  <div className="h-2.5 w-1/4 rounded bg-[#eef0f5] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-10 py-10 text-center text-[#7a8496]">
            No notifications found.
          </div>
        ) : (
          <div>
            {filtered.map((a) => {
              const unread = !a.read;
              const icon = iconFor(a.title);
              return (
                <div
                  key={a._id}
                  onClick={() => openAlert(a._id)}
                  className={`flex cursor-pointer items-start gap-[15px] border-b border-[#f0f2f6] px-4 py-5 transition-colors last:border-b-0 md:px-6 ${
                    unread ? "bg-[#f4f6ff]" : "hover:bg-[#f8f9fd]"
                  }`}
                >
                  {/* Icon tile */}
                  <div
                    className={`grid h-[43px] w-[43px] flex-shrink-0 place-items-center rounded-xl text-[20px] ${icon.cls}`}
                  >
                    {icon.emoji}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div
                      className={`mb-[7px] text-sm font-bold ${
                        unread ? "text-[#172033]" : "text-[#4a5568]"
                      }`}
                    >
                      {a.title}
                    </div>
                    <div className="text-[13px] leading-relaxed text-[#697386] line-clamp-2">
                      {a.message}
                    </div>
                    <div className="mt-[9px] text-[11px] text-[#929bad]">
                      {formatRelativeTime(a.createdAt)}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {unread && (
                    <span className="mt-[5px] h-2 w-2 flex-shrink-0 rounded-full bg-[#5267e8]" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {!loading && filterCounts.unread === 0 && alerts.length > 0 && (
          <div className="px-4 py-[18px] text-center text-[13px] font-bold text-[#5267d9]">
            You're all caught up with your store activity
          </div>
        )}
      </div>

      {/* ============ Detail modal ============ */}
      {selectedAlert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-[#edf0f4] px-6 py-4">
              <div className="flex items-center gap-3">
                <div
                  className={`grid h-11 w-11 place-items-center rounded-xl text-[22px] ${iconFor(
                    selectedAlert.title
                  ).cls}`}
                >
                  {iconFor(selectedAlert.title).emoji}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#172033]">
                    {selectedAlert.title}
                  </h3>
                  <p className="text-[11px] text-[#929bad]">
                    {formatRelativeTime(selectedAlert.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                title="Close"
                className="rounded-lg p-1.5 text-[#7a8496] hover:bg-[#eef0f5]"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            {/* Full content */}
            <div className="flex-1 overflow-auto px-6 py-5">
              <p className="mb-2 text-[13px] font-semibold text-[#4a5568]">
                Marketplace Admin
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#31415c]">
                {selectedAlert.message}
              </p>
            </div>

            {/* Reply to admin */}
            <div className="border-t border-[#edf0f4] px-6 py-4">
              {replyStatus && (
                <p
                  className={`mb-2 rounded-lg px-3 py-2 text-xs ${
                    replyStatus.ok ? "bg-[#def7e9] text-[#147c4f]" : "bg-[#fdeaea] text-[#b91c1c]"
                  }`}
                >
                  {replyStatus.text}
                </p>
              )}
              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                <input
                  type="text"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Message admin about this notification…"
                  className="flex-1 rounded-xl border border-[#e7eaf0] bg-[#f8f9fd] px-4 py-2.5 text-sm text-[#172033] placeholder:text-[#929bad] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5267d9]/40"
                />
                <button
                  type="submit"
                  disabled={sendingReply || !reply.trim()}
                  className="flex items-center gap-2 rounded-xl bg-[#5267d9] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4258d5] disabled:opacity-40"
                >
                  {sendingReply ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <FiSend className="h-4 w-4" />
                  )}
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
