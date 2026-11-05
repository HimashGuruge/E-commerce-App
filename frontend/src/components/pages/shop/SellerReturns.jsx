import { useState, useEffect, useCallback } from "react";
import { FiRefreshCw, FiInfo, FiPackage } from "react-icons/fi";
import api from "@/utils/api";
import toast from "react-hot-toast";
import getApiError from "@/utils/errors";
import { onSocketEvent } from "@/utils/socket";

const REASON_LABELS = {
  defective: "Defective",
  wrong_item: "Wrong Item",
  not_as_described: "Not as Described",
  damaged_on_arrival: "Damaged on Arrival",
  change_of_mind: "Change of Mind",
  other: "Other",
};

const STATUS_STYLES = {
  pending: { cls: "bg-[#fff3df] text-[#ad6b00]", label: "Pending" },
  approved: { cls: "bg-[#e5edff] text-[#1d4ed8]", label: "Approved" },
  processing: { cls: "bg-[#f0e8ff] text-[#7c3aed]", label: "Processing" },
  refunded: { cls: "bg-[#e1f8ed] text-[#047857]", label: "Refunded" },
  rejected: { cls: "bg-[#fdeaea] text-shopred", label: "Rejected" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span className={`inline-block px-2.5 py-1 rounded-[7px] text-[11px] font-bold ${s.cls}`}>
      {s.label}
    </span>
  );
}

export default function SellerReturns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [openId, setOpenId] = useState(null);

  const fetchReturns = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      const { data } = await api.get(`/api/sellers/returns?${params}`);
      if (data.success) setReturns(data.returns || []);
    } catch (err) {
      console.error("Fetch returns error:", err);
      toast.error(getApiError(err) || "Failed to load returns");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  // Live refresh: admin status changes + new return requests
  useEffect(() => {
    const unsubscribe = onSocketEvent(["seller:new-message"], () => fetchReturns());
    return unsubscribe;
  }, [fetchReturns]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-9 w-44 bg-shopborder/60 rounded-lg animate-pulse mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-shopborder/60 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-extrabold text-shoptext">Returns</h1>
          <button
            onClick={fetchReturns}
            className="flex items-center gap-1.5 text-[13px] text-shopmuted hover:text-shopprimary transition-colors"
          >
            <FiRefreshCw size={14} /> Refresh
          </button>
        </div>
        <p className="text-[13px] text-shopmuted mb-5">
          Return requests that include your products. Read-only — the admin manages the
          refund workflow and you are notified of every status change in Messages.
        </p>

        {/* Info strip */}
        <div className="flex items-start gap-2.5 bg-[#e5edff] border border-[#c7d8fe] rounded-xl px-4 py-3 mb-5 text-[12.5px] text-[#1e40af]">
          <FiInfo size={15} className="mt-0.5 shrink-0" />
          <span>
            You can't approve, reject or refund here — that's handled by the admin panel. When
            a return is <strong>Approved</strong>, prepare to receive the item(s) back.
          </span>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4">
          {["all", "pending", "approved", "processing", "refunded", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 px-3 py-1.5 rounded-[9px] text-[13px] font-medium border transition-all ${
                statusFilter === s
                  ? "bg-shopprimary text-white border-shopprimary"
                  : "bg-white text-shopmuted border-shopborder hover:text-shoptext"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* List */}
        {returns.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-shopborder">
            <FiPackage className="w-10 h-10 mx-auto text-shopborder mb-3" />
            <p className="text-sm text-shopmuted">No return requests found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {returns.map((r) => {
              const open = openId === r._id;
              const reason = REASON_LABELS[r.items?.[0]?.reason || "other"] || "Other";
              return (
                <div
                  key={r._id}
                  className="bg-white rounded-2xl border border-shopborder overflow-hidden"
                >
                  <button
                    onClick={() => setOpenId(open ? null : r._id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#f8f9fd] transition-colors"
                  >
                    <div className="w-9 h-9 rounded-[10px] bg-shopprimarylight flex items-center justify-center text-shopprimary shrink-0">
                      <FiPackage size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-shoptext truncate">
                        Return #{r._id?.slice(-8)}
                        <span className="text-shopmuted font-medium"> · Order #{r.order?._id?.slice(-8) || "N/A"}</span>
                      </p>
                      <p className="text-[12px] text-shopmuted truncate">
                        {r.user?.name || "Customer"} · {reason} ·{" "}
                        {new Date(r.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                    <span
                      className={`text-shopmuted transition-transform ${open ? "rotate-180" : ""}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </button>

                  {open && (
                    <div className="px-4 pb-4 pt-1 border-t border-shopborder/70">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div className="text-[12px]">
                          <span className="text-shopmuted">Customer:</span>{" "}
                          <span className="font-semibold text-shoptext">
                            {r.user?.name || "N/A"}
                          </span>
                          {r.user?.email && <span className="text-shopmuted"> · {r.user.email}</span>}
                        </div>
                        <div className="text-[12px]">
                          <span className="text-shopmuted">Request:</span>{" "}
                          <span className="font-semibold text-shoptext">
                            {new Date(r.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[12px]">
                          <span className="text-shopmuted">Refund amount:</span>{" "}
                          <span className="font-semibold text-shoptext">
                            {r.refundAmount ? `Rs. ${Number(r.refundAmount).toLocaleString()}` : "Not set yet"}
                          </span>
                        </div>
                        {r.rejectionReason && (
                          <div className="text-[12px] sm:col-span-2">
                            <span className="text-shopmuted">Rejection reason:</span>{" "}
                            <span className="font-semibold text-shopred">{r.rejectionReason}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] font-bold uppercase tracking-wider text-shopmuted mb-2">
                        Your items in this return
                      </p>
                      <div className="space-y-2">
                        {(r.sellerItems || []).map((item, i) => {
                          const img =
                            item.product?.images?.[0] ||
                            item.product?.image ||
                            null;
                          return (
                            <div key={i} className="flex items-center gap-3 p-2.5 bg-[#f8f9fd] rounded-xl border border-shopborder/60">
                              {img ? (
                                <img src={img} alt="" className="w-10 h-10 rounded-lg object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-shopborder/40 flex items-center justify-center text-shopmuted">
                                  <FiPackage size={15} />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-shoptext truncate">
                                  {item.product?.name || "Product"}
                                </p>
                                <p className="text-[11px] text-shopmuted">
                                  Qty: {item.quantity} · {REASON_LABELS[item.reason] || item.reason || "No reason"}
                                </p>
                                {item.description && (
                                  <p className="text-[11.5px] text-shopmuted mt-0.5 italic">
                                    “{item.description}”
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
