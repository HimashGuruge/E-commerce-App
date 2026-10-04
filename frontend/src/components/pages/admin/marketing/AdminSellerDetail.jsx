import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiPackage, FiShoppingCart, FiStar, FiCheck, FiX, FiToggleLeft, FiPercent, FiRefreshCw, FiExternalLink } from "react-icons/fi";
import api from "@/utils/api";
import Swal from "sweetalert2";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-slate-100 text-slate-700",
};

const tabs = [
  { key: "products", label: "Products", icon: FiPackage },
  { key: "orders", label: "Orders", icon: FiShoppingCart },
  { key: "reviews", label: "Reviews", icon: FiStar },
];

export default function AdminSellerDetail() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState([]);
  const [orderStats, setOrderStats] = useState({ totalOrders: 0, deliveredOrders: 0, pendingOrders: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("products");

  const fetchDetail = useCallback(async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/sellers/admin/${sellerId}/detail`);
      if (res.data?.success) {
        setSeller(res.data.seller);
        setProducts(res.data.products || []);
        setFeedbackStats(res.data.feedbackStats || []);
        setOrderStats(res.data.orderStats || { totalOrders: 0, deliveredOrders: 0, pendingOrders: 0 });
        setRecentOrders(res.data.recentOrders || []);
      }
    } catch (err) {
      console.error("Failed to load seller detail:", err);
      Swal.fire({ icon: "error", title: "Failed to load seller details" });
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handleApproveProduct = async (productId, name) => {
    const result = await Swal.fire({
      title: "Approve Product?",
      text: `Approve "${name}" to be visible in the store?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      confirmButtonText: "Approve",
    });
    if (!result.isConfirmed) return;
    try {
      await api.put(`/api/products/${productId}/approve`);
      Swal.fire({ icon: "success", title: "Product approved!", timer: 1500, showConfirmButton: false });
      fetchDetail();
    } catch (err) {
      Swal.fire({ icon: "error", title: err.response?.data?.error || "Failed to approve" });
    }
  };

  const handleSuspend = async () => {
    const result = await Swal.fire({
      title: "Suspend Store?",
      text: `Suspend "${seller?.shopName}"? They will not be able to sell until re-activated.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Suspend",
    });
    if (!result.isConfirmed) return;
    try {
      await api.put(`/api/sellers/admin/${sellerId}/suspend`);
      Swal.fire({ icon: "success", title: "Store suspended", timer: 1500, showConfirmButton: false });
      fetchDetail();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to suspend" });
    }
  };

  const handleCommission = async () => {
    const { value: rate } = await Swal.fire({
      title: "Set Commission Rate",
      input: "number",
      inputValue: seller?.commissionRate || 0,
      inputAttributes: { min: 0, max: 100, step: 0.5 },
      showCancelButton: true,
      confirmButtonText: "Save",
    });
    if (rate === undefined) return;
    try {
      await api.put(`/api/sellers/admin/${sellerId}/commission`, { commissionRate: Number(rate) });
      Swal.fire({ icon: "success", title: "Commission updated!", timer: 1500, showConfirmButton: false });
      fetchDetail();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to update commission" });
    }
  };

  const feedbackCount = (status) => {
    const found = feedbackStats.find((f) => f._id === status);
    return found ? found.count : 0;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="p-6">
        <button onClick={() => navigate("/admin/dashboard/sellers")} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4">
          <FiArrowLeft className="w-4 h-4" /> Back to Sellers
        </button>
        <p className="text-slate-500">Seller not found.</p>
      </div>
    );
  }

  const TabContent = () => {
    switch (activeTab) {
      case "products":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Product</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Price</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Stock</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Approval</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {products.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No products yet</td></tr>
                  ) : products.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={p.images?.[0] || "https://img.lazcdn.com/static/lk/p/default-product.jpg"} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                          <span className="font-medium text-slate-800 truncate max-w-[200px]">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">Rs. {(p.sellingPrice || p.price || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${p.stock > 10 ? "bg-green-100 text-green-700" : p.stock > 0 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${p.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.approvedByAdmin ? (
                          <span className="text-xs text-green-600 font-medium">Approved</span>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!p.approvedByAdmin && (
                            <button onClick={() => handleApproveProduct(p._id, p.name)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition" title="Approve">
                              <FiCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => navigate(`/admin/dashboard/editproducts/${p._id}`)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                            <FiExternalLink className="w-4 h-4" />
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
      case "orders":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Order ID</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Total</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentOrders.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No orders yet</td></tr>
                  ) : recentOrders.map((o) => (
                    <tr key={o._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{o._id.slice(-8)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${
                          o.orderStatus === "delivered" ? "bg-green-100 text-green-700" :
                          o.orderStatus === "cancelled" ? "bg-red-100 text-red-700" :
                          o.orderStatus === "shipped" ? "bg-blue-100 text-blue-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>{o.orderStatus}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">Rs. {(o.totalPrice || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{new Date(o.createdAt).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "reviews":
        return (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
              <p className="text-2xl font-bold text-slate-900">{feedbackCount("approved")}</p>
              <p className="text-xs text-slate-500 mt-1">Approved</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
              <p className="text-2xl font-bold text-amber-600">{feedbackCount("pending")}</p>
              <p className="text-xs text-slate-500 mt-1">Pending</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
              <p className="text-2xl font-bold text-red-600">{feedbackCount("rejected")}</p>
              <p className="text-xs text-slate-500 mt-1">Rejected</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/admin/dashboard/sellers")} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
          <FiArrowLeft className="w-4 h-4" /> Back to Sellers
        </button>
        <button onClick={fetchDetail} className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all text-sm">
          <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Seller Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {seller.shopBanner && (
          <div className="h-32 bg-gradient-to-r from-brand-500 to-brand-700">
            <img src={seller.shopBanner} alt="" className="w-full h-full object-cover opacity-40" />
          </div>
        )}
        <div className={`p-6 ${!seller.shopBanner ? "pt-6" : "-mt-12"}`}>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xl flex-shrink-0 border-4 border-white shadow-sm">
              {seller.shopLogo ? (
                <img src={seller.shopLogo} alt={seller.shopName} className="w-full h-full rounded-full object-cover" />
              ) : (
                seller.shopName?.charAt(0).toUpperCase() || "S"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{seller.shopName}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[seller.status]}`}>
                  {seller.status}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">{seller.user?.name || seller.ownerName} • {seller.ownerPhone}</p>
              <p className="text-xs text-slate-400 mt-0.5">{seller.user?.email} • {seller.businessType}</p>
              {seller.shopDescription && <p className="text-sm text-slate-600 mt-2">{seller.shopDescription}</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={handleCommission} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition">
                <FiPercent className="w-3.5 h-3.5" /> {seller.commissionRate}%
              </button>
              {seller.status === "approved" && (
                <button onClick={handleSuspend} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition">
                  <FiToggleLeft className="w-3.5 h-3.5" /> Suspend
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6 mt-4 text-xs text-slate-400 border-t border-slate-100 pt-4">
            <span>Member since {new Date(seller.createdAt).toLocaleDateString("en-LK", { day: "numeric", month: "long", year: "numeric" })}</span>
            <span>{products.length} products</span>
            <span>{orderStats.totalOrders} orders</span>
            <span>{orderStats.deliveredOrders} delivered</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <TabContent />
    </div>
  );
}
