import React, { useEffect, useState } from "react";
import api from "@/utils/api";
import { FiPackage, FiAlertCircle, FiCheckCircle, FiXCircle, FiDollarSign, FiRefreshCw, FiDownload } from "react-icons/fi";
import Swal from "sweetalert2";

export default function ReturnsManagement() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchReturns();
  }, [page, statusFilter]);

  const fetchReturns = async () => {
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
  };

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

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: FiAlertCircle, label: "Pending" },
      approved: { color: "bg-blue-100 text-blue-800", icon: FiCheckCircle, label: "Approved" },
      rejected: { color: "bg-red-100 text-red-800", icon: FiXCircle, label: "Rejected" },
      processing: { color: "bg-purple-100 text-purple-800", icon: FiRefreshCw, label: "Processing" },
      shipped: { color: "bg-indigo-100 text-indigo-800", icon: FiPackage, label: "Shipped" },
      completed: { color: "bg-green-100 text-green-800", icon: FiCheckCircle, label: "Completed" },
      refunded: { color: "bg-emerald-100 text-emerald-800", icon: FiDollarSign, label: "Refunded" }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${badge.color}`}>
        <badge.icon size={12} />
        {badge.label}
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FiRefreshCw className="w-12 h-12 text-brand-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading return requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Return Requests</h1>
          <p className="text-gray-600">Manage customer return requests and process refunds</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Requests</p>
                <p className="text-3xl font-black text-gray-900">{total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FiPackage className="text-brand-600" size={24} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Pending</p>
                <p className="text-3xl font-black text-yellow-600">
                  {returns.filter(r => r.status === "pending").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <FiAlertCircle className="text-yellow-600" size={24} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Approved</p>
                <p className="text-3xl font-black text-blue-600">
                  {returns.filter(r => r.status === "approved").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FiCheckCircle className="text-blue-600" size={24} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Refunded</p>
                <p className="text-3xl font-black text-green-600">
                  {returns.filter(r => r.status === "refunded").length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <FiDollarSign className="text-green-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-sm font-bold text-gray-700 mr-2">Filter by:</span>
            {["all", "pending", "approved", "rejected", "processing", "refunded"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  statusFilter === status
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Returns List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {returns.length === 0 ? (
            <div className="text-center py-12">
              <FiPackage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No return requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {returns.map((returnRequest) => (
                    <tr key={returnRequest._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">#{returnRequest._id.slice(-8)}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{returnRequest.user?.name || "N/A"}</div>
                        <div className="text-xs text-gray-500">{returnRequest.user?.email || ""}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">#{returnRequest.order?._id?.slice(-8) || "N/A"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {returnRequest.items?.map((item, i) => (
                          <div key={i} className="text-xs">
                            {item.product?.name?.slice(0, 20) || "Product"} x{item.quantity}
                          </div>
                        ))}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-800">
                          {getReasonLabel(returnRequest.items?.[0]?.reason || "other")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">Rs. {returnRequest.refundAmount?.toLocaleString() || "0"}</td>
                      <td className="px-6 py-4">
                        {getStatusBadge(returnRequest.status)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          {returnRequest.status === "pending" && (
                            <button
                              onClick={() => handleApprove(returnRequest._id)}
                              className="text-green-600 hover:text-green-800 font-bold px-3 py-1 rounded-lg hover:bg-green-50 transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          {returnRequest.status === "approved" && (
                            <button
                              onClick={() => handleProcessRefund(returnRequest._id, returnRequest.refundAmount || 0)}
                              className="text-blue-600 hover:text-blue-800 font-bold px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                              Process Refund
                            </button>
                          )}
                          {returnRequest.status === "processing" && (
                            <button
                              onClick={() => handleComplete(returnRequest._id, returnRequest.refundMethod || "stripe")}
                              className="text-purple-600 hover:text-purple-800 font-bold px-3 py-1 rounded-lg hover:bg-purple-50 transition-colors"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} returns
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-bold rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                  disabled={page >= Math.ceil(total / limit)}
                  className="px-4 py-2 text-sm font-bold rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
