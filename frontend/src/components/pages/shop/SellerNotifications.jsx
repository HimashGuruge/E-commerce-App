import { useState, useEffect, useCallback } from "react";
import { FiBell, FiCheck, FiCheckCircle, FiRefreshCw } from "react-icons/fi";
import api from "@/utils/api";
import { onSocketEvent } from "@/utils/socket";

export default function SellerNotifications() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

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

  const unreadCount = alerts.filter((a) => !a.read).length;

  const markRead = async (id) => {
    setBusyId(id);
    try {
      await api.patch(`/api/notifications/seller/read/${id}`);
      await fetchAlerts();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to mark as read");
    } finally {
      setBusyId(null);
    }
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      await api.post("/api/notifications/seller/mark-all-read");
      await fetchAlerts();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to mark all as read");
    } finally {
      setMarkingAll(false);
    }
  };

  const fmtDate = (d) =>
    new Date(d).toLocaleString("en-LK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Notifications</h2>
          <p className="text-sm text-slate-500 mt-0.5">Alerts from the marketplace admin</p>
        </div>
        {unreadCount > 0 && (
          <>
            <button
              onClick={markAll}
              disabled={markingAll}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl transition-all disabled:opacity-60"
            >
              {markingAll ? (
                <span className="w-4 h-4 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
              ) : (
                <FiCheckCircle className="w-4 h-4" />
              )}
              Mark all as read
            </button>
            <button
              onClick={fetchAlerts}
              className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all text-sm"
              title="Refresh"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : alerts.length > 0 ? (
        <div className="space-y-3 max-w-3xl">
          {alerts.map((a) => (
            <div
              key={a._id}
              className={`bg-white rounded-2xl border p-4 flex items-start gap-3 transition-all ${
                a.read ? "border-slate-100" : "border-brand-200 bg-brand-50/40 shadow-sm"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  a.read ? "bg-slate-100 text-slate-400" : "bg-brand-100 text-brand-600"
                }`}
              >
                <FiBell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`font-semibold text-sm truncate ${a.read ? "text-slate-500" : "text-slate-900"}`}>
                    {a.title}
                  </h3>
                  {!a.read && <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />}
                </div>
                <p className={`text-sm mt-1 whitespace-pre-wrap ${a.read ? "text-slate-500" : "text-slate-700"}`}>{a.message}</p>
                <p className="text-[11px] text-slate-400 mt-1.5">{fmtDate(a.createdAt)}</p>
              </div>
              {!a.read && (
                <button
                  onClick={() => markRead(a._id)}
                  disabled={busyId === a._id}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-brand-700 hover:bg-white rounded-lg transition-all flex-shrink-0 disabled:opacity-60"
                  title="Mark as read"
                >
                  {busyId === a._id ? (
                    <span className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                  ) : (
                    <FiCheck className="w-3.5 h-3.5" />
                  )}
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center max-w-3xl">
          <FiBell className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No notifications yet</p>
          <p className="text-sm text-slate-400 mt-1">Alerts from the admin will appear here.</p>
        </div>
      )}
    </div>
  );
}
