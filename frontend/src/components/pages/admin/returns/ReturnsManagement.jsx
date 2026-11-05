import React, { useEffect, useState, useCallback } from "react";
import api from "@/utils/api";
import { FiPackage, FiAlertCircle, FiCheckCircle, FiXCircle, FiDollarSign, FiRefreshCw, FiInfo, FiChevronDown, FiChevronUp, FiMessageSquare, FiX, FiSend } from "react-icons/fi";
import Swal from "sweetalert2";
import { onSocketEvent } from "@/utils/socket";

export default function ReturnsManagement() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  // Message-seller dialog state
  const [msgTarget, setMsgTarget] = useState(null); // return request being messaged
  const [msgSellerId, setMsgSellerId] = useState("");
  const [msgText, setMsgText] = useState("");
  const [msgSending, setMsgSending] = useState(false);

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit });
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await api.get(`/api/feedback/returns?${params}`);
      if (res.data.success) {
        setReturns(res.data.returns || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch returns:", err);
      Swal.fire({ icon: "error", title: "Error", text: "Failed to load return requests" });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, limit]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  // Live refresh: new return requests + status changes (from any admin device)
  useEffect(() => {
    return onSocketEvent(["returns:new", "returns:updated"], () => fetchReturns());
  }, [fetchReturns]);

  const handleApprove = async (id) => {
    try {
      const result = await Swal.fire({
        title: "Approve Return?",
        text: "This will notify the customer that their return request has been approved.",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#2563eb",
        cancelButtonColor: "#dc2626",
        confirmButtonText: "Yes, approve",
        cancelButtonText: "Cancel"
      });

      if (!result.isConfirmed) return;

      await api.put(`/api/feedback/returns/${id}/approve`);
      Swal.fire({ icon: "success", title: "Approved", text: "Return request approved" });
      fetchReturns();
    } catch (err) {
      console.error("Failed to approve:", err);
      Swal.fire({ icon: "error", title: "Error", text: "Failed to approve return" });
    }
  };

  const handleReject = async (id, reason) => {
    try {
      await api.put(`/api/feedback/returns/${id}/reject`, { rejectionReason: reason });
      Swal.fire({ icon: "success", title: "Rejected", text: "Return request rejected" });
      fetchReturns();
    } catch (err) {
      console.error("Failed to reject:", err);
      Swal.fire({ icon: "error", title: "Error", text: "Failed to reject return" });
    }
  };

  const handleProcessRefund = async (id, amount) => {
    try {
      await api.put(`/api/feedback/returns/${id}/process-refund`, { refundAmount: amount });
      Swal.fire({ icon: "success", title: "Processing", text: "Refund initiated" });
      fetchReturns();
    } catch (err) {
      console.error("Failed to process refund:", err);
      Swal.fire({ icon: "error", title: "Error", text: "Failed to process refund" });
    }
  };

  const handleComplete = async (id, method) => {
    try {
      await api.put(`/api/feedback/returns/${id}/complete`, { refundMethod: method });
      Swal.fire({ icon: "success", title: "Completed", text: "Return completed" });
      fetchReturns();
    } catch (err) {
      console.error("Failed to complete:", err);
      Swal.fire({ icon: "error", title: "Error", text: "Failed to complete return" });
    }
  };

  const openMessageSeller = (returnRequest) => {
    setMsgTarget(returnRequest);
    setMsgSellerId(returnRequest.sellers?.[0]?.id || "");
    setMsgText("");
  };

  const closeMessageSeller = () => {
    setMsgTarget(null);
    setMsgSellerId("");
    setMsgText("");
  };

  const handleSendMessage = async () => {
    if (!msgTarget || !msgText.trim()) return;
    setMsgSending(true);
    try {
      await api.post(`/api/feedback/returns/${msgTarget._id}/message`, {
        sellerId: msgSellerId || undefined,
        message: msgText.trim(),
      });
      closeMessageSeller();
      fetchReturns();
    } catch (err) {
      console.error("Failed to send message:", err);
      Swal.fire({ icon: "error", title: "Error", text: "Failed to send message to seller" });
    } finally {
      setMsgSending(false);
    }
  };

  // Slim status: dot + colored text (no big pills)
  const statusStyles = {
    pending: { dot: "bg-amber-500", text: "text-amber-700", label: "Pending" },
    approved: { dot: "bg-blue-500", text: "text-blue-700", label: "Approved" },
    rejected: { dot: "bg-red-500", text: "text-red-700", label: "Rejected" },
    processing: { dot: "bg-purple-500", text: "text-purple-700", label: "Processing" },
    shipped: { dot: "bg-indigo-500", text: "text-indigo-700", label: "Shipped" },
    completed: { dot: "bg-emerald-500", text: "text-emerald-700", label: "Completed" },
    refunded: { dot: "bg-emerald-500", text: "text-emerald-700", label: "Refunded" },
  };

  const getStatusBadge = (status) => {
    const s = statusStyles[status] || statusStyles.pending;
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${s.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    );
  };

  const getReasonLabel = (reason) => {
    const labels = {
      defective: "Defective",
      wrong_item: "Wrong Item",
      not_as_described: "Not as Described",
      damaged_on_arrival: "Damaged on Arrival",
      change_of_mind: "Change of Mind",
      other: "Other"
    };
    return labels[reason] || reason;
  };

  if (loading && returns.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-52 rounded-lg bg-slate-200/70 animate-pulse" />
          <div className="mt-6 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-slate-200/50 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Page-level stats (same source as before: rows on the current page)
  const pendingCount = returns.filter((r) => r.status === "pending").length;
  const approvedCount = returns.filter((r) => r.status === "approved").length;
  const refundedCount = returns.filter((r) => r.status === "refunded").length;

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header — compact */}
        <div className="flex items-baseline gap-3 min-w-0">
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Returns</h1>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.14em] truncate">
            {total} total requests
          </p>
        </div>

        {/* Slim stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 bg-white rounded-xl border border-slate-200/80 divide-x divide-slate-100">
          {[
            { label: "Total", value: total, dot: "bg-slate-400" },
            { label: "Pending", value: pendingCount, dot: "bg-amber-500" },
            { label: "Approved", value: approvedCount, dot: "bg-blue-500" },
            { label: "Refunded", value: refundedCount, dot: "bg-emerald-500" },
          ].map((stat) => (
            <div key={stat.label} className="px-4 py-2.5 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.1em] text-slate-400">
                <span className={`w-1.5 h-1.5 rounded-full ${stat.dot}`} />
                {stat.label}
              </span>
              <span className="text-base font-display font-bold text-slate-900 tabular-nums">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Quick guide — slim collapsed bar */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowGuide((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100/70 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FiInfo size={15} className="text-slate-400" />
              How to use this page (quick guide)
            </span>
            {showGuide ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>
          {showGuide && (
            <div className="px-4 pb-4 text-[13px] text-slate-600 space-y-3">
              <div>
                <p className="font-semibold text-slate-800 mb-1">How does a return work (step by step)?</p>
                <ol className="list-decimal list-inside space-y-1 leading-relaxed">
                  <li>The customer requests a return from their account — it appears here as <strong>Pending</strong> and the sidebar shows a "PENDING" badge.</li>
                  <li>Click <strong>Approve</strong> — the customer is messaged that the return is approved.</li>
                  <li>When the return is approved, click <strong>Process Refund</strong> — the requested refund amount is set, the status becomes <strong>Processing</strong>, and the returned items are put back in stock automatically.</li>
                  <li>Click <strong>Complete</strong> once the refund is actually paid out — the status becomes <strong>Refunded</strong>. The flow ends here.</li>
                </ol>
              </div>
              <div>
                <p className="font-semibold text-slate-800 mb-1">Understanding the table columns</p>
                <ul className="list-disc list-inside space-y-1 leading-relaxed">
                  <li><strong>ID</strong> — short return number (last 8 characters).</li>
                  <li><strong>Customer</strong> — who requested the return (name + email).</li>
                  <li><strong>Order</strong> — the order the returned items came from.</li>
                  <li><strong>Items</strong> — which products are being returned and how many.</li>
                  <li><strong>Sellers</strong> — the seller(s) whose products are being returned. Use the <strong>Message Seller</strong> button to send them a note about the return.</li>
                  <li><strong>Reason</strong> — why the customer wants the return (e.g. Defective, Damaged on Arrival).</li>
                  <li><strong>Amount</strong> — the refund amount in Rs.</li>
                  <li><strong>Status</strong> — where the return is in the workflow (see above).</li>
                  <li><strong>Actions</strong> — the button to click for the next step of this return.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-800 mb-1">Useful tips</p>
                <ul className="list-disc list-inside space-y-1 leading-relaxed">
                  <li>Only <strong>Pending</strong>, <strong>Approved</strong> and <strong>Processing</strong> rows have action buttons — finished ones just stay in the list.</li>
                  <li>The filter buttons let you view only one status at a time (e.g. click <strong>Pending</strong> to see everything waiting for you).</li>
                  <li>The stats only count the rows on the current page (10 per page), so big numbers may look smaller on page 1.</li>
                  <li>Every approve/reject decision sends a message to the customer AND the affected sellers automatically — no separate notification needed.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Status filter tabs — slim */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {["all", "pending", "approved", "rejected", "processing", "refunded"].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-all ${
                statusFilter === status
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Dense table */}
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          {returns.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              <FiPackage className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              No return requests found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead className="bg-slate-50/70 sticky top-0 z-10">
                    <tr className="border-b border-slate-200/80">
                      <th className="pl-4 pr-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">ID</th>
                      <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Customer</th>
                      <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Order</th>
                      <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Items</th>
                      <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Sellers</th>
                      <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Reason</th>
                      <th className="px-2 py-2.5 text-right text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Amount</th>
                      <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Status</th>
                      <th className="px-2 py-2.5 pr-4 text-right text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {returns.map((returnRequest) => (
                      <tr key={returnRequest._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="pl-4 pr-2 py-2 font-mono font-semibold text-slate-700 whitespace-nowrap">
                          #{returnRequest._id.slice(-8)}
                        </td>
                        <td className="px-2 py-2">
                          <p className="text-slate-900 font-medium max-w-[180px] truncate">
                            {returnRequest.user?.name || "N/A"}
                          </p>
                          <p className="text-[11px] text-slate-400 max-w-[180px] truncate">
                            {returnRequest.user?.email || ""}
                          </p>
                        </td>
                        <td className="px-2 py-2 font-mono text-slate-500 whitespace-nowrap">
                          #{returnRequest.order?._id?.slice(-8) || "N/A"}
                        </td>
                        <td className="px-2 py-2 text-slate-500 max-w-[240px]">
                          {returnRequest.items?.map((item, i) => (
                            <div key={i} className="text-xs truncate">
                              {item.product?.name?.slice(0, 20) || "Product"} ×{item.quantity}
                            </div>
                          ))}
                        </td>
                        <td className="px-2 py-2 text-slate-500 max-w-[180px]">
                          {(returnRequest.sellers || []).length ? (
                            returnRequest.sellers.map((s) => (
                              <div key={s.id} className="text-xs truncate">
                                <span className="font-medium text-slate-700">{s.name || "Seller"}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-slate-500 whitespace-nowrap">
                          {getReasonLabel(returnRequest.items?.[0]?.reason || "other")}
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          Rs. {(returnRequest.refundAmount || 0).toLocaleString()}
                        </td>
                        <td className="px-2 py-2">
                          {getStatusBadge(returnRequest.status)}
                        </td>
                        <td className="px-2 py-2 pr-4">
                          <div className="flex justify-end gap-1">
                            {returnRequest.status === "pending" && (
                              <button
                                onClick={() => handleApprove(returnRequest._id)}
                                className="px-2 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-md text-[11px] font-semibold transition-colors"
                              >
                                Approve
                              </button>
                            )}
                            {returnRequest.status === "approved" && (
                              <button
                                onClick={() => handleProcessRefund(returnRequest._id, returnRequest.refundAmount || 0)}
                                className="px-2 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-md text-[11px] font-semibold transition-colors"
                              >
                                Process Refund
                              </button>
                            )}
                            {returnRequest.status === "processing" && (
                              <button
                                onClick={() => handleComplete(returnRequest._id, returnRequest.refundMethod || "stripe")}
                                className="px-2 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-md text-[11px] font-semibold transition-colors"
                              >
                                Complete
                              </button>
                            )}
                            {(returnRequest.sellers || []).length > 0 && (
                              <button
                                onClick={() => openMessageSeller(returnRequest)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-md text-[11px] font-semibold transition-colors"
                                title="Send a message to the seller about this return"
                              >
                                <FiMessageSquare size={12} />
                                Message Seller
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination — compact */}
              {total > limit && (
                <div className="border-t border-slate-100 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <p className="text-xs text-slate-400">
                    Showing <span className="font-semibold text-slate-600">{(page - 1) * limit + 1}</span> to{" "}
                    <span className="font-semibold text-slate-600">{Math.min(page * limit, total)}</span> of{" "}
                    <span className="font-semibold text-slate-600">{total}</span> returns
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-xs font-mono text-slate-500 tabular-nums">
                      {page} / {Math.ceil(total / limit)}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(Math.ceil(total / limit), p + 1))}
                      disabled={page >= Math.ceil(total / limit)}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Message Seller modal */}
      {msgTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeMessageSeller}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-slate-900">Message Seller</h3>
              <button
                onClick={closeMessageSeller}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <FiX size={16} />
              </button>
            </div>
            <p className="text-[12.5px] text-slate-500 mb-3">
              Return <span className="font-mono font-semibold text-slate-700">#{msgTarget._id.slice(-8)}</span>{" "}
              · Order <span className="font-mono font-semibold text-slate-700">#{msgTarget.order?._id?.slice(-8) || "—"}</span>
            </p>

            {(msgTarget.sellers || []).length > 1 && (
              <div className="mb-3">
                <label className="block text-[11px] font-mono uppercase tracking-[0.1em] text-slate-400 mb-1">
                  Send to
                </label>
                <select
                  value={msgSellerId}
                  onChange={(e) => setMsgSellerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                >
                  {msgTarget.sellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || "Seller"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <textarea
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              rows={4}
              placeholder="Write a message about this return (e.g. return address, deadline, questions)…"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              Delivered to the seller's dashboard inbox with a live notification.
            </p>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={closeMessageSeller}
                className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={msgSending || !msgText.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSend size={13} />
                {msgSending ? "Sending…" : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
