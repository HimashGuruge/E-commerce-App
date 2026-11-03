import React, { useEffect, useState } from "react";
import api from "@/utils/api";
import {
  FiRefreshCw,
  FiClock,
  FiTruck,
  FiCheckCircle,
  FiXCircle,
  FiSearch,
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiSave,
  FiExternalLink,
  FiInfo,
  FiX,
  FiGrid,
  FiList,
  FiTrash2,
  FiPackage,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

const STATUS_OPTIONS = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "failed",
];

const capitalize = (value = "") => value.charAt(0).toUpperCase() + value.slice(1);

const STATUS_CONFIG = {
  pending: {
    dot: "bg-amber-500",
    text: "text-amber-700",
    select: "border-amber-200 bg-amber-50/70 text-amber-800",
    icon: <FiClock />,
  },
  processing: {
    dot: "bg-indigo-500",
    text: "text-indigo-700",
    select: "border-indigo-200 bg-indigo-50/70 text-indigo-800",
    icon: <FiRefreshCw className="animate-spin" />,
  },
  shipped: {
    dot: "bg-purple-500",
    text: "text-purple-700",
    select: "border-purple-200 bg-purple-50/70 text-purple-800",
    icon: <FiTruck />,
  },
  delivered: {
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    select: "border-emerald-200 bg-emerald-50/70 text-emerald-800",
    icon: <FiCheckCircle />,
  },
  cancelled: {
    dot: "bg-rose-500",
    text: "text-rose-700",
    select: "border-rose-200 bg-rose-50/70 text-rose-800",
    icon: <FiXCircle />,
  },
  failed: {
    dot: "bg-red-500",
    text: "text-red-700",
    select: "border-red-200 bg-red-50/70 text-red-800",
    icon: <FiXCircle />,
  },
};

export default function AdminOrderedPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [tempTracking, setTempTracking] = useState({});
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showGuide, setShowGuide] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
    loadAllOrders();
  }, []);

  const loadAllOrders = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    if (silent) setRefreshing(true);
    try {
      const res = await api.get("/api/orders/userplace/orders");
      setOrders(res.data.orders);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      if (silent) toast.error("Failed to refresh orders");
    } finally {
      if (!silent) setLoading(false);
      if (silent) setRefreshing(false);
    }
  };

  const handleStatusUpdate = async (orderId, status, trackingNumber) => {
    setUpdatingId(orderId);
    try {
      await api.put(`/api/orders/admin/update-order-status/${orderId}`, {
        status,
        trackingNumber,
      });
      if (status === "pending" || status === "processing") {
        setTempTracking((prev) => {
          const next = { ...prev };
          delete next[orderId];
          return next;
        });
        setEditingOrderId((prev) => (prev === orderId ? null : prev));
      }
      toast.success(`Order marked as ${status}`);
      loadAllOrders({ silent: true });
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Failed to update order");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteFailedOrder = async (orderId, orderIdString) => {
    const result = await Swal.fire({
      title: "Delete this order?",
      text: "This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/orders/admin/failed-order/${orderId}`);
        toast.success("Order deleted");
        loadAllOrders({ silent: true });
      } catch (err) {
        console.error("Delete error:", err);
        toast.error("Failed to delete order");
      }
    }
  };

  const handleTrackOnDomex = async (e, trackingNumber) => {
    e.preventDefault();
    window.open(`https://www.domex.lk/track?tracking=${trackingNumber}`, "_blank");
  };

  const term = searchTerm.toLowerCase();
  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== "all" && order.orderStatus !== statusFilter) return false;
    return (
      String(order.orderId ?? "").toLowerCase().includes(term) ||
      String(order.shippingAddress?.fullName ?? "").toLowerCase().includes(term)
    );
  });
  const statusCounts = orders.reduce((acc, order) => {
    acc[order.orderStatus] = (acc[order.orderStatus] || 0) + 1;
    return acc;
  }, {});

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  const OrderStatusPicker = ({ order }) => {
    const isTerminal =
      order.orderStatus === "failed" || order.orderStatus === "cancelled";
    const canShowTracking =
      order.orderStatus === "processing" ||
      editingOrderId === order._id ||
      order.orderStatus === "shipped";

    return (
      <div className="flex items-center gap-1.5">
        {isTerminal ? (
          <button
            onClick={() => handleDeleteFailedOrder(order._id, order.orderId)}
            className="flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-md text-[11px] font-semibold transition-colors"
          >
            <FiTrash2 size={11} />
            Delete
          </button>
        ) : (
          <>
            <select
              value={order.orderStatus}
              disabled={updatingId === order._id}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const val = e.target.value;
                const trackingValue =
                  tempTracking[order._id] || order.trackingNumber || "";
                if (val === "shipped" && !trackingValue.trim()) {
                  toast.error("Shipping details ඇතුළත් කරන්න.");
                  return;
                }
                handleStatusUpdate(order._id, val, trackingValue);
              }}
              className={`min-w-[104px] px-2 py-1 rounded-md text-[11px] font-semibold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 ${STATUS_CONFIG[order.orderStatus]?.select || STATUS_CONFIG.pending.select}`}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {updatingId === order._id ? "Updating..." : capitalize(opt)}
                </option>
              ))}
            </select>
            {canShowTracking && (
              <input
                type="text"
                placeholder="Tracking No."
                value={tempTracking[order._id] ?? order.trackingNumber ?? ""}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  setTempTracking((prev) => ({
                    ...prev,
                    [order._id]: e.target.value,
                  }))
                }
                onBlur={(e) => {
                  const val = (e.target.value || "").trim();
                  const unchanged = val === (order.trackingNumber ?? "");
                  if (val && !unchanged) {
                    handleStatusUpdate(order._id, "shipped", val);
                  }
                }}
                className="w-32 px-2 py-1 border border-slate-200 rounded-md text-[11px] focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            )}
            {order.orderStatus === "shipped" && order.trackingNumber && (
              <>
                <button
                  onClick={(e) => handleTrackOnDomex(e, order.trackingNumber)}
                  className="flex items-center gap-1 px-2 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-md text-[11px] font-semibold transition-colors"
                  title="Track on Domex"
                >
                  <FiTruck size={11} />
                  Track
                  <FiExternalLink size={10} />
                </button>
                <button
                  onClick={() => setEditingOrderId(order._id)}
                  className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                  title="Edit tracking"
                >
                  <FiEdit2 size={13} />
                </button>
              </>
            )}
          </>
        )}
      </div>
    );
  };

  const OrderCard = ({ order }) => {
    const [expanded, setExpanded] = useState(false);
    const cfg = STATUS_CONFIG[order.orderStatus] || STATUS_CONFIG.pending;
    const name = order.shippingAddress?.fullName || order.user?.name || "Guest";

    return (
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
        <div className="p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono font-semibold text-brand-600 text-xs">
              #{order.orderId || order._id.slice(-6)}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${cfg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {order.orderStatus}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-slate-900 truncate">{name}</p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[13px] font-bold text-slate-900 tabular-nums">
                Rs. {(order.totalPrice ?? 0).toLocaleString()}
              </p>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[11px] text-slate-400 hover:text-brand-600 inline-flex items-center gap-0.5 mt-0.5 transition-colors"
              >
                Details
                {expanded ? <FiChevronUp size={11} /> : <FiChevronDown size={11} />}
              </button>
            </div>
          </div>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 mb-2">
                  Items ({order.items?.length})
                </p>
                <div className="space-y-1.5">
                  {order.items?.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        <img
                          src={item.image || item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 tabular-nums">
                        Rs. {item.price?.toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {order.items?.length > 3 && (
                    <p className="text-[10px] text-slate-400 text-center">
                      +{order.items.length - 3} more items
                    </p>
                  )}
                </div>
              </div>

              {order.trackingNumber && (
                <p className="text-[11px] text-slate-500 font-mono">
                  Tracking: {order.trackingNumber}
                </p>
              )}

              <div className="pt-1">
                <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 mb-2">
                  Update Status
                </p>
                <OrderStatusPicker order={order} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-48 rounded-lg bg-slate-200/70 animate-pulse" />
          <div className="mt-6 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-slate-200/50 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Orders</h1>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.14em] truncate">
              {filteredOrders.length} orders
            </p>
            {refreshing && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <FiRefreshCw className="animate-spin" size={12} />
                syncing
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search order # or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-700 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/15"
              />
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("table")}
                title="Table view"
                className={`p-1.5 rounded-md transition-colors ${viewMode === "table" ? "bg-brand-500 text-white" : "text-slate-400 hover:text-slate-600"}`}
              >
                <FiList size={15} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                title="Card view"
                className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-brand-500 text-white" : "text-slate-400 hover:text-slate-600"}`}
              >
                <FiGrid size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Quick guide — collapsed info bar */}
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
                <p className="font-semibold text-slate-800 mb-1">What this page is for</p>
                <p className="leading-relaxed">
                  This is the full order list for your store. Every customer order shows here as soon as
                  it's placed (the list updates in real-time). You move each order through its life cycle
                  here — the customer is automatically notified in their account whenever you change a status.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-800 mb-1">How to manage an order (4 steps)</p>
                <ol className="list-decimal list-inside space-y-1 leading-relaxed">
                  <li>In the <strong>Status</strong> column, pick the status from the dropdown: pending → processing → shipped → delivered.</li>
                  <li>Before marking an order <strong>shipped</strong>, type the courier's <strong>Tracking No.</strong> into the box under the status and save — the save happens automatically when you move to another field (or press the save icon in card view).</li>
                  <li>Once an order is shipped, you can open the <strong>Track</strong> link to check it live on Domex.</li>
                  <li>If an order fails or is cancelled, a red <strong>Delete</strong> button appears — this permanently removes the record.</li>
                </ol>
              </div>
              <div>
                <p className="font-semibold text-slate-800 mb-1">Understanding the table columns</p>
                <ul className="list-disc list-inside space-y-1 leading-relaxed">
                  <li><strong>#</strong> — the order ID (e.g. #4821). This is what customers see in their own order history.</li>
                  <li><strong>Customer</strong> — the delivery name (falling back to the account name for guest checkouts).</li>
                  <li><strong>Date</strong> — when the order was placed.</li>
                  <li><strong>Status</strong> — the current stage of the order; the dropdown changes it. Marking it "shipped" without a tracking number is blocked on purpose.</li>
                  <li><strong>Amount</strong> — the total charged to the customer. Note: for COD orders, "delivered" only creates a pending cash-settlement record — the money isn't counted as collected until it's verified in Payouts.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-800 mb-1">Useful things to know</p>
                <ul className="list-disc list-inside space-y-1 leading-relaxed">
                  <li>Switch to <strong>card view</strong> (grid icon, top-right) for a bigger interface with full order details per order — the table view is faster for bulk status updates.</li>
                  <li>Use the <strong>search box</strong> to find an order by its number or the customer's name, and the <strong>status tabs</strong> to jump to only one status (e.g. only Pending orders).</li>
                  <li>Changing a status to <strong>cancelled</strong> on a COD order marks its pending cash settlement as failed.</li>
                  <li>When an order first becomes <strong>delivered</strong>, the customer automatically gets a review reminder.</li>
                  <li>Pagination shows 10 orders per page; the status-tab counts reflect all orders, not just the current page.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Status tabs — slim */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { key: "all", label: "All", count: orders.length },
            ...STATUS_OPTIONS.map((s) => ({
              key: s,
              label: capitalize(s),
              count: statusCounts[s] || 0,
            })),
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key);
                setCurrentPage(1);
              }}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-all ${
                statusFilter === tab.key
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {tab.label}
              <span
                className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full tabular-nums ${
                  statusFilter === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Grid view — compact cards */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentOrders.map((order) => (
              <OrderCard key={order._id} order={order} />
            ))}
          </div>
        )}

        {/* Table view — dense */}
        {viewMode === "table" && (
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
            {filteredOrders.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                <FiPackage className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No orders found — try a different search or status
              </div>
            ) : (
              <>
                <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-slate-50/70 sticky top-0 z-10">
                      <tr className="border-b border-slate-200/80">
                        <th className="pl-4 pr-2 py-2.5 text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">#</th>
                        <th className="px-2 py-2.5 text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Customer</th>
                        <th className="px-2 py-2.5 text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Date</th>
                        <th className="px-2 py-2.5 text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Status</th>
                        <th className="px-2 py-2.5 text-right text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Amount</th>
                        <th className="px-2 py-2.5 pr-4 text-right text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentOrders.map((order) => (
                        <tr key={order._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="pl-4 pr-2 py-2 font-mono text-brand-600 font-semibold whitespace-nowrap">
                            #{order.orderId || order._id.slice(-6)}
                          </td>
                          <td className="px-2 py-2 text-slate-900 font-medium max-w-[200px] truncate">
                            {order.shippingAddress?.fullName || order.user?.name || "Guest"}
                          </td>
                          <td className="px-2 py-2 text-slate-500 whitespace-nowrap">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                            <OrderStatusPicker order={order} />
                          </td>
                          <td className="px-2 py-2 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                            Rs. {(order.totalPrice ?? 0).toLocaleString()}
                          </td>
                          <td className="px-2 py-2 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                            {(order.orderStatus === "failed" ||
                              order.orderStatus === "cancelled") && (
                              <button
                                onClick={() =>
                                  handleDeleteFailedOrder(order._id, order.orderId)
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-md text-[11px] font-semibold transition-colors"
                              >
                                <FiTrash2 size={11} />
                                Delete
                              </button>
                            )}
                            {order.orderStatus === "shipped" && order.trackingNumber && (
                              <button
                                onClick={(e) => handleTrackOnDomex(e, order.trackingNumber)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-md text-[11px] font-semibold transition-colors"
                              >
                                <FiTruck size={11} />
                                Track
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="border-t border-slate-100 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="text-xs text-slate-400">
                      Showing <span className="font-semibold text-slate-600">{startIndex + 1}</span> to{" "}
                      <span className="font-semibold text-slate-600">{Math.min(endIndex, filteredOrders.length)}</span> of{" "}
                      <span className="font-semibold text-slate-600">{filteredOrders.length}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <span className="text-xs font-mono text-slate-500 tabular-nums">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
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
        )}

        {/* Empty state (no orders at all in table mode) */}
        {viewMode === "table" && filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <FiPackage className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-sm text-slate-500 font-medium">No orders found</p>
          </div>
        )}
      </div>
    </div>
  );
}
