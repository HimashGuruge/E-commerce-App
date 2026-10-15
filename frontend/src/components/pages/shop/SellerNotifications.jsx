import { useState, useEffect, useCallback, useMemo } from "react";
import { FiBell, FiCheck, FiCheckCircle, FiRefreshCw, FiSearch, FiSend, FiArrowLeft } from "react-icons/fi";
import api from "@/utils/api";
import { onSocketEvent } from "@/utils/socket";

const formatRelativeTime = (date) => {
  if (!date) return "";
  const now = new Date();
  const msgDate = new Date(date);
  const diffInSeconds = Math.floor((now - msgDate) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays}d`;

  return msgDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const formatFullDate = (d) =>
  new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function SellerNotifications() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // all | unread | read
  const [selectedId, setSelectedId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  // Mobile: which pane is visible (list or detail). Ignored on lg+ (both show).
  const [mobilePane, setMobilePane] = useState("list");

  // Reply state
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [repliedIds, setRepliedIds] = useState(() => new Set());
  const [replyStatus, setReplyStatus] = useState(null); // { id, ok, text }

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

  // Clear the inline reply status when the selection changes
  useEffect(() => {
    setReply("");
    setReplyStatus(null);
  }, [selectedId]);

  // Clear the inline reply status after a few seconds
  useEffect(() => {
    if (!replyStatus) return undefined;
    const t = setTimeout(() => setReplyStatus(null), 4000);
    return () => clearTimeout(t);
  }, [replyStatus]);

  const filterCounts = useMemo(
    () => ({
      all: alerts.length,
      unread: alerts.filter((a) => !a.read).length,
      read: alerts.filter((a) => a.read).length,
    }),
    [alerts]
  );

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (activeFilter === "unread" && a.read) return false;
      if (activeFilter === "read" && !a.read) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) || a.message.toLowerCase().includes(q)
      );
    });
  }, [alerts, activeFilter, query]);

  // Open a row: select it and, if unread, mark it read in place (no full refetch)
  const openAlert = async (id) => {
    setSelectedId(id);
    setMobilePane("detail"); // mobile: jump to the detail pane
    const alert = alerts.find((a) => a._id === id);
    if (alert && !alert.read) {
      try {
        await api.patch(`/api/notifications/seller/read/${id}`);
        setAlerts((prev) => prev.map((a) => (a._id === id ? { ...a, read: true } : a)));
        const unread = alerts.filter((a) => !a.read && a._id !== id).length;
        window.dispatchEvent(new CustomEvent("seller-alerts-changed", { detail: unread }));
      } catch (err) {
        console.error("Mark read error:", err);
      }
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
      // Mark read in place (the backend marks it read on reply)
      setAlerts((prev) => prev.map((a) => (a._id === selectedId ? { ...a, read: true } : a)));
      setRepliedIds((prev) => new Set(prev).add(selectedId));
      setReply("");
      setReplyStatus({ id: selectedId, ok: true, text: "Message sent to admin" });
    } catch (err) {
      setReplyStatus({
        id: selectedId,
        ok: false,
        text: err.response?.data?.error || "Failed to send message",
      });
    } finally {
      setSendingReply(false);
    }
  };

  const replyStatusForSelected =
    replyStatus && replyStatus.id === selectedId ? replyStatus : null;

  return (
    <div className="p-4 md:p-6 flex flex-col lg:flex-row gap-4 h-[calc(100vh-160px)] min-h-[600px] lg:h-[calc(100vh-120px)]">
      {/* ============ LEFT: Table list ============ */}
      <div
        className={`bg-white rounded-2xl shadow-sm border border-slate-100 flex-col w-full lg:flex-row lg:w-[42%] lg:max-h-none ${
          mobilePane === "detail" ? "hidden lg:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center">
                <FiBell className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
              {filterCounts.unread > 0 && (
                <span className="inline-flex items-center rounded-full bg-sky-100 text-sky-700 text-xs font-semibold px-2 py-0.5">
                  {filterCounts.unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={markAll}
                disabled={markingAll || filterCounts.unread === 0}
                title="Mark all as read"
                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-700 hover:bg-sky-50 disabled:opacity-40"
              >
                {markingAll ? (
                  <span className="w-4 h-4 border-2 border-sky-300 border-t-sky-600 rounded-full animate-spin" />
                ) : (
                  <FiCheckCircle className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={fetchAlerts}
                title="Refresh"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              >
                <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-1">Alerts from the marketplace admin</p>

          {/* Search */}
          <div className="relative mt-3">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notifications…"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-100 focus:bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 mt-2.5">
            {[
              { key: "all", label: `Inbox (${filterCounts.all})` },
              { key: "unread", label: `Unread (${filterCounts.unread})` },
              { key: "read", label: `Read (${filterCounts.read})` },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  activeFilter === f.key
                    ? "bg-sky-50 text-sky-700"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table header row */}
        <div className="flex items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wide text-slate-400 font-semibold border-b border-slate-100 bg-slate-50/60">
          <span className="w-5 flex-shrink-0" />
          <span className="w-9 flex-shrink-0">From</span>
          <span className="flex-[2] min-w-0">Subject</span>
          <span className="flex-[3] hidden sm:block min-w-0 preview-col">Preview</span>
          <span className="w-14 text-right flex-shrink-0">Date</span>
        </div>

        {/* Table rows */}
        <div className="flex-1 overflow-auto p-1.5 space-y-0.5">
          {loading ? (
            // Skeleton rows
            <div className="divide-y divide-slate-100">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 px-2.5 py-3">
                  <span className="w-5 h-2 rounded-full bg-slate-100 animate-pulse" />
                  <span className="w-9 h-9 rounded-lg bg-slate-100 animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-1/3 rounded bg-slate-100 animate-pulse" />
                    <div className="h-3 w-2/3 rounded bg-slate-100 animate-pulse" />
                  </div>
                  <span className="h-3 w-12 rounded bg-slate-100 animate-pulse" />
                </div>
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <FiBell className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-slate-600 font-semibold">No notifications yet</p>
              <p className="text-sm text-slate-400 mt-1">
                Alerts from the admin will appear here.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-slate-600 font-semibold">No matching notifications</p>
              <p className="text-sm text-slate-400 mt-1">Try a different search term.</p>
              {(query || activeFilter !== "all") && (
                <button
                  onClick={() => {
                    setQuery("");
                    setActiveFilter("all");
                  }}
                  className="text-xs text-sky-600 hover:text-sky-700 mt-2"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            filtered.map((a) => {
              const unread = !a.read;
              const selected = selectedId === a._id;
              return (
                <button
                  key={a._id}
                  onClick={() => openAlert(a._id)}
                  className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-colors text-left ${
                    selected
                      ? "bg-sky-100/70"
                      : unread
                      ? "bg-sky-50/70 hover:bg-sky-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  {/* Unread dot */}
                  <span className="w-5 flex-shrink-0 flex justify-center">
                    {unread ? (
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                    ) : (
                      <span className="w-2 h-2 rounded-full border border-slate-300" />
                    )}
                  </span>

                  {/* Sender icon */}
                  <span
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      unread ? "bg-sky-100 text-sky-600" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <FiBell className="w-4 h-4" />
                  </span>

                  {/* Subject */}
                  <span className="flex-[2] min-w-0">
                    <span
                      className={`block truncate text-sm ${
                        unread
                          ? "font-semibold text-slate-900"
                          : "font-normal text-slate-500"
                      }`}
                    >
                      {a.title}
                    </span>
                  </span>

                  {/* Preview (hidden on small screens) */}
                  <span
                    className="flex-[3] hidden sm:block min-w-0 truncate text-xs text-slate-400"
                    title={a.message}
                  >
                    {a.message}
                  </span>

                  {/* Date */}
                  <span
                    className={`w-14 text-right text-xs tabular-nums flex-shrink-0 ${
                      unread ? "text-sky-700 font-medium" : "text-slate-400"
                    }`}
                  >
                    {formatRelativeTime(a.createdAt)}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer count */}
        {!loading && alerts.length > 0 && (
          <p className="text-xs text-slate-400 px-4 py-2 border-t border-slate-100">
            {filterCounts.unread > 0
              ? `${alerts.length} total · ${filterCounts.unread} unread`
              : `${alerts.length} total · all read`}
            {query.trim()
              ? ` · showing ${filtered.length} matched`
              : activeFilter !== "all"
              ? ` · showing ${filtered.length}`
              : ""}
          </p>
        )}
      </div>

      {/* ============ RIGHT: Detail view ============ */}
      <div
        className={`bg-white rounded-2xl shadow-sm border border-slate-100 flex-col flex-1 min-h-[420px] ${
          mobilePane === "list" ? "hidden lg:flex" : "flex"
        }`}
      >
        {/* Detail header */}
        {selectedAlert ? (
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <button
              onClick={() => setMobilePane("list")}
              title="Back to notifications"
              className="lg:hidden p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:bg-slate-100 flex-shrink-0"
            >
              <FiArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
              <FiBell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate">
                {selectedAlert.title}
              </h3>
              <p className="text-xs text-slate-400">
                Marketplace Admin ·{" "}
                {formatFullDate(selectedAlert.createdAt)}
              </p>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center flex-shrink-0">
              <FiBell className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              No notification selected
            </h3>
          </div>
        )}

        {/* Detail body */}
        <div className="flex-1 overflow-auto">
          {selectedAlert ? (
            <div className="p-5 md:p-6">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div className="w-11 h-11 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
                    <FiBell className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      Marketplace Admin
                    </p>
                    <p className="text-xs text-slate-400">
                      From: admin@marketplace · To: you
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                    {formatFullDate(selectedAlert.createdAt)}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-slate-900 mt-5">
                  {selectedAlert.title}
                </h2>

                <div className="mt-4 bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {selectedAlert.message}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <FiBell className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-sm font-medium">
                Select a notification to view its content
              </p>
              <p className="text-xs mt-1 text-slate-400">
                Click a row on the left to see the full message
              </p>
            </div>
          )}
        </div>

        {/* Reply composer */}
        {selectedAlert && (
          <div className="p-4 border-t border-slate-100">
            {replyStatusForSelected && (
              <p
                className={`text-xs px-3 py-2 rounded-lg mb-2 ${
                  replyStatusForSelected.ok
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {replyStatusForSelected.text}
              </p>
            )}
            {repliedIds.has(selectedAlert._id) && !replyStatusForSelected && (
              <p className="text-xs text-slate-400 mb-2">
                You already replied to this notification. You can send a follow-up
                below.
              </p>
            )}
            <form onSubmit={handleSendReply} className="flex items-center gap-2">
              <input
                type="text"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Message admin about this notification…"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="submit"
                disabled={sendingReply || !reply.trim()}
                className="px-4 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-40 flex items-center gap-2 flex-shrink-0"
              >
                {sendingReply ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FiSend className="w-4 h-4" />
                )}
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
