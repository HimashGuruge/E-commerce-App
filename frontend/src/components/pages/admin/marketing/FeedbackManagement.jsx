import React, { useState, useEffect } from "react";
import api from "@/utils/api";
import { useNavigate } from "react-router-dom";
import { Star, Trash2, CheckCircle, XCircle, Loader2, MessageSquare } from "lucide-react";
import Swal from "sweetalert2";
import { onSocketEvent } from "@/utils/socket";

const statusStyles = {
  approved: { dot: "bg-emerald-500", text: "text-emerald-700" },
  pending: { dot: "bg-amber-500", text: "text-amber-700" },
  rejected: { dot: "bg-red-500", text: "text-red-700" },
};

const FeedbackManagement = () => {
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/feedback?limit=1000`);
      const data = res.data?.feedback || res.data?.data || res.data || [];
      setFeedbacks(data);
    } catch (err) {
      console.error("Error fetching feedbacks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  // Live update: the server sends admin:stats-changed on every feedback
  // create/approve/reject/delete, so the list stays current with no
  // manual refresh.
  useEffect(() => {
    return onSocketEvent("admin:stats-changed", (data) => {
      if (data?.type === "feedback") fetchFeedbacks();
    });
  }, []);

  const handleApprove = async (id) => {
    try {
      await api.post(`/api/feedback/${id}/approve`, {});
      setFeedbacks(feedbacks.map((fb) => (fb._id === id ? { ...fb, status: "approved" } : fb)));
      Swal.fire("Approved!", "Review has been approved.", "success");
    } catch (err) {
      console.error("Approve error:", err);
      Swal.fire("Error", err.response?.data?.message || "Failed to approve", "error");
    }
  };

  const handleReject = async (id) => {
    try {
      await api.put(`/api/feedback/${id}`, { status: "rejected" });
      setFeedbacks(feedbacks.map((fb) => (fb._id === id ? { ...fb, status: "rejected" } : fb)));
      Swal.fire("Rejected!", "Review has been rejected.", "success");
    } catch (err) {
      console.error("Reject error:", err);
      Swal.fire("Error", err.response?.data?.message || "Failed to reject", "error");
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete Review",
      text: "Are you sure you want to delete this review?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete!",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/feedback/${id}/admin`);
        setFeedbacks(feedbacks.filter((fb) => fb._id !== id));
        Swal.fire("Deleted!", "Review has been deleted.", "success");
      } catch (err) {
        console.error("Delete error:", err);
        Swal.fire("Error", err.response?.data?.message || "Failed to delete", "error");
      }
    }
  };

  const pendingFeedbacks = feedbacks.filter((fb) => fb.status === "pending");
  const stats = {
    total: feedbacks.length,
    pending: pendingFeedbacks.length,
    approved: feedbacks.filter((f) => f.status === "approved").length,
    rejected: feedbacks.filter((f) => f.status === "rejected").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header — compact */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Feedback</h1>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.14em] truncate">
              {feedbacks.length} reviews
            </p>
          </div>
          <span
            className="flex items-center gap-1.5 text-xs text-emerald-600 w-fit"
            title="This page updates live when feedback changes"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live
          </span>
        </div>

        {/* Slim stat strip */}
        <div className="bg-white rounded-xl border border-slate-200/80 px-4 py-2.5 flex flex-wrap items-center divide-x divide-slate-100">
          {[
            { label: "Total", value: stats.total, dot: "bg-slate-500" },
            { label: "Pending", value: stats.pending, dot: "bg-amber-500" },
            { label: "Approved", value: stats.approved, dot: "bg-emerald-500" },
            { label: "Rejected", value: stats.rejected, dot: "bg-red-500" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2.5 px-4 py-1 first:pl-0 last:pr-0">
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              <span className="text-sm font-semibold tabular-nums text-slate-900">{s.value}</span>
              <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400">{s.label}</span>
            </div>
          ))}
        </div>

        {feedbacks.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 px-4 py-14 text-center">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No feedback found</p>
          </div>
        ) : (
          <ReviewTable feedbacks={feedbacks} handleApprove={handleApprove} handleReject={handleReject} handleDelete={handleDelete} />
        )}
      </div>
    </div>
  );
};

const ReviewTable = ({ feedbacks, handleApprove, handleReject, handleDelete }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50/70 sticky top-0 z-10">
            <tr className="border-b border-slate-200/80">
              <th className="pl-4 pr-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Product</th>
              <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Customer</th>
              <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Rating</th>
              <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Review</th>
              <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Status</th>
              <th className="px-2 py-2.5 pr-4 text-right text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {feedbacks.map((fb) => {
              const s = statusStyles[(fb.status || "pending").toLowerCase()] || statusStyles.pending;
              return (
                <tr key={fb._id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="pl-4 pr-2 py-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={fb.product?.images?.[0] || "https://via.placeholder.com/40"}
                        alt={fb.product?.name || ""}
                        className="w-8 h-8 object-cover rounded border border-slate-100 shrink-0"
                        loading="lazy"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                      <span className="text-xs text-slate-700 truncate max-w-[140px]">{fb.product?.name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-600 whitespace-nowrap">{fb.user?.name || "Anonymous"}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-px items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={`text-[11px] ${star <= fb.rating ? "text-yellow-400" : "text-gray-200"}`}>★</span>
                      ))}
                      <span className="ml-1.5 text-[11px] tabular-nums text-slate-400">{fb.rating}/5</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 max-w-[260px]">
                    <div className="text-xs text-slate-600 line-clamp-2" dangerouslySetInnerHTML={{ __html: fb.comment || "-" }} />
                  </td>
                  <td className="px-2 py-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {fb.status || "pending"}
                    </span>
                  </td>
                  <td className="px-2 py-2 pr-4">
                    <div className="flex items-center justify-end gap-0.5">
                      {fb.status === "pending" && (
                        <>
                          <button onClick={() => handleApprove(fb._id)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Approve">
                            <CheckCircle size={14} />
                          </button>
                          <button onClick={() => handleReject(fb._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Reject">
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                      {fb.status === "approved" && (
                        <button onClick={() => handleReject(fb._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Reject">
                          <XCircle size={14} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(fb._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FeedbackManagement;
