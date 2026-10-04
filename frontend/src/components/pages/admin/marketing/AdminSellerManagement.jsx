import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiUsers, FiCheck, FiX, FiAlertCircle, FiSearch, FiRefreshCw, FiToggleLeft, FiPercent, FiEye } from "react-icons/fi";
import { MdStore, MdCheckCircle, MdCancel, MdBlock } from "react-icons/md";
import api from "@/utils/api";
import Swal from "sweetalert2";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-slate-100 text-slate-700",
};

export default function AdminSellerManagement() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    try {
      const [sellersRes, statsRes] = await Promise.all([
        api.get(`/api/sellers/admin/all?status=${filter === "all" ? "" : filter}`),
        api.get("/api/sellers/admin/stats"),
      ]);
      if (sellersRes.data.success) setSellers(sellersRes.data.sellers);
      if (statsRes.data.success) setStats(statsRes.data.stats);
    } catch (err) {
      console.error("Fetch sellers error:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchSellers(); }, [fetchSellers]);

  const handleApprove = async (id, name) => {
    const result = await Swal.fire({
      title: "Approve Seller?",
      text: `Approve "${name}" to start selling?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      confirmButtonText: "Approve",
    });
    if (!result.isConfirmed) return;
    try {
      await api.put(`/api/sellers/admin/${id}/approve`);
      Swal.fire({ icon: "success", title: `${name} approved!`, timer: 1500, showConfirmButton: false });
      fetchSellers();
    } catch (err) {
      Swal.fire({ icon: "error", title: err.response?.data?.error || "Failed to approve" });
    }
  };

  const handleReject = async (id) => {
    const { value: reason } = await Swal.fire({
      title: "Reject Seller",
      input: "text",
      inputLabel: "Reason for rejection",
      inputPlaceholder: "Enter reason...",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Reject",
    });
    if (!reason) return;
    try {
      await api.put(`/api/sellers/admin/${id}/reject`, { reason });
      Swal.fire({ icon: "info", title: "Seller rejected", timer: 1500, showConfirmButton: false });
      fetchSellers();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to reject" });
    }
  };

  const handleSuspend = async (id, name) => {
    const result = await Swal.fire({
      title: "Suspend Seller?",
      text: `Suspend "${name}"? They will not be able to sell until re-activated.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Suspend",
    });
    if (!result.isConfirmed) return;
    try {
      await api.put(`/api/sellers/admin/${id}/suspend`);
      Swal.fire({ icon: "success", title: "Suspended", timer: 1500, showConfirmButton: false });
      fetchSellers();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to suspend" });
    }
  };

  const handleCommission = async (id, current) => {
    const { value: rate } = await Swal.fire({
      title: "Set Commission Rate",
      input: "number",
      inputValue: current || 0,
      inputAttributes: { min: 0, max: 100, step: 0.5 },
      showCancelButton: true,
      confirmButtonText: "Save",
    });
    if (rate === undefined) return;
    try {
      await api.put(`/api/sellers/admin/${id}/commission`, { commissionRate: Number(rate) });
      Swal.fire({ icon: "success", title: "Commission updated!", timer: 1500, showConfirmButton: false });
      fetchSellers();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to update commission" });
    }
  };

  const filtered = sellers.filter((s) =>
    s.shopName?.toLowerCase().includes(search.toLowerCase()) ||
    s.ownerName?.toLowerCase().includes(search.toLowerCase()) ||
    s.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.user?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Seller Management</h1>
          <p className="text-sm text-slate-500 mt-1">Review and manage seller applications</p>
        </div>
        <button onClick={fetchSellers} className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all text-sm">
          <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.totalSellers, color: "text-slate-900" },
            { label: "Pending", value: stats.pendingSellers, color: "text-yellow-600" },
            { label: "Approved", value: stats.approvedSellers, color: "text-green-600" },
            { label: "Suspended", value: stats.suspendedSellers, color: "text-red-600" },
            { label: "Products", value: stats.totalSellerProducts, color: "text-brand-600" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "approved", "rejected", "suspended"].map((s) => (
            <button
              key={s}
              onClick={() => { setFilter(s); setSearch(""); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                filter === s ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sellers..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:border-brand-500 outline-none text-sm" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((seller) => (
            <div key={seller._id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-lg flex-shrink-0">
                    {seller.shopName?.charAt(0).toUpperCase() || "S"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900">{seller.shopName}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[seller.status]}`}>
                        {seller.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{seller.user?.name || seller.ownerName} &lt;{seller.user?.email || ""}&gt;</p>
                    <p className="text-xs text-slate-400 mt-1">{seller.ownerPhone} {seller.businessType === "company" ? `• ${seller.registrationNumber}` : ""}</p>
                    {seller.rejectionReason && (
                      <p className="text-xs text-red-500 mt-1">Reason: {seller.rejectionReason}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span>Bank: {seller.bankName}</span>
                      <span>A/C: {seller.bankAccountNo}</span>
                      <span>Commission: {seller.commissionRate}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => navigate(`/admin/dashboard/sellers/${seller._id}`)} className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all" title="View Details">
                    <FiEye className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleCommission(seller._id, seller.commissionRate)} className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all" title="Set commission">
                    <FiPercent className="w-4 h-4" />
                  </button>
                  {seller.status === "pending" && (
                    <>
                      <button onClick={() => handleApprove(seller._id, seller.shopName)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all" title="Approve">
                        <FiCheck className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleReject(seller._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Reject">
                        <FiX className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {seller.status === "approved" && (
                    <button onClick={() => handleSuspend(seller._id, seller.shopName)} className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-all" title="Suspend">
                      <FiToggleLeft className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {seller.status === "pending" && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-amber-600">
                  <FiAlertCircle className="w-3.5 h-3.5" />
                  Registered {new Date(seller.createdAt).toLocaleDateString("en-LK", { day: "numeric", month: "short" })} — Awaiting review
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <FiUsers className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No {filter !== "all" ? filter : ""} sellers found</p>
        </div>
      )}
    </div>
  );
}
