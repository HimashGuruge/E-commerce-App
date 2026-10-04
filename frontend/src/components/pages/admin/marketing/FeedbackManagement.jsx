import React, { useState, useEffect } from "react";
import api from "@/utils/api";
import { useNavigate } from "react-router-dom";
import { Star, Trash2, CheckCircle, XCircle, Loader2, RefreshCw, MessageSquare } from "lucide-react";
import Swal from "sweetalert2";

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
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Feedback Management</h1>
          <button
            onClick={fetchFeedbacks}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Reviews", value: stats.total, color: "from-slate-500 to-slate-600", shadow: "shadow-slate-200", icon: "M3 21h18M3 10h18M3 7l9-4 9 4M3 14h18" },
            { label: "Pending", value: stats.pending, color: "from-amber-500 to-amber-600", shadow: "shadow-amber-200", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
            { label: "Approved", value: stats.approved, color: "from-emerald-500 to-emerald-600", shadow: "shadow-emerald-200", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
            { label: "Rejected", value: stats.rejected, color: "from-red-500 to-red-600", shadow: "shadow-red-200", icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" },
          ].map((stat, idx) => (
            <div key={idx} className="relative bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-200`} />
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-3xl font-black text-slate-900 group-hover:text-brand-600 transition-colors">{stat.value}</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-md ${stat.shadow} group-hover:scale-110 transition-transform duration-200`}>
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                  </svg>
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full bg-gradient-to-r ${stat.color} transition-all duration-500`} style={{ width: `${stats.total > 0 ? (stat.value / stats.total) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>

        {feedbacks.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No feedback found</p>
          </div>
        ) : (
          <ReviewTable feedbacks={feedbacks} handleApprove={handleApprove} handleReject={handleReject} handleDelete={handleDelete} />
        )}
      </div>
    </div>
  );
};

const ReviewTable = ({ feedbacks, handleApprove, handleReject, handleDelete }) => {
  const getStatusBadge = (status) => {
    if (status === "approved") return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-brand-100 text-brand-700">Approved</span>;
    if (status === "pending") return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">Pending</span>;
    return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">Rejected</span>;
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 overflow-hidden">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <span>⭐</span>Customer Reviews
          <span className="text-xs font-normal text-slate-400">({feedbacks.length} reviews)</span>
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              <th className="py-3 px-3 text-left">Product</th>
              <th className="py-3 px-3 text-left">Customer</th>
              <th className="py-3 px-3 text-left">Rating</th>
              <th className="py-3 px-3 text-left">Review</th>
              <th className="py-3 px-3 text-left">Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {feedbacks.map((fb) => (
              <tr key={fb._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <img
                      src={fb.product?.images?.[0] || "https://via.placeholder.com/40"}
                      alt={fb.product?.name || ""}
                      className="w-8 h-8 object-cover rounded border border-slate-100"
                      loading="lazy"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                    <span className="text-xs text-slate-700 truncate max-w-[140px]">{fb.product?.name || "—"}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-xs text-slate-600">{fb.user?.name || "Anonymous"}</td>
                <td className="py-3 px-3">
                  <div className="flex gap-px">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={`text-[11px] ${star <= fb.rating ? "text-yellow-400" : "text-gray-200"}`}>★</span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-3 max-w-[200px]">
                  <div className="text-xs text-slate-600 line-clamp-2" dangerouslySetInnerHTML={{ __html: fb.comment || "-" }} />
                </td>
                <td className="py-3 px-3">{getStatusBadge(fb.status)}</td>
                <td className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {fb.status === "pending" && (
                      <>
                        <button onClick={() => handleApprove(fb._id)} className="p-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors" title="Approve">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleReject(fb._id)} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors" title="Reject">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {fb.status === "approved" && (
                      <button onClick={() => handleReject(fb._id)} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors" title="Reject">
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(fb._id)} className="p-1.5 bg-white text-slate-500 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors border border-slate-200" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FeedbackManagement;
