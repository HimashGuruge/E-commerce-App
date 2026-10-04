import React, { useEffect, useState } from "react";
import api from "@/utils/api";
import {
  FiRefreshCw,
  FiPackage,
  FiUser,
  FiMapPin,
  FiPhone,
  FiShoppingCart,
  FiTruck,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiArrowRight,
  FiSearch,
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiSave,
  FiPrinter,
  FiAlertCircle,
  FiBox,
  FiExternalLink,
  FiZap,
  FiMail,
  FiFilter,
  FiX,
  FiGrid,
  FiList,
  FiTrash2,
} from "react-icons/fi";
import toast, { Toaster } from "react-hot-toast";
import Swal from "sweetalert2";

const STATUS_OPTIONS = [
  "Pending",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

const API_BASE_URL = "";

const TRACKER_STEPS = { Pending: 0, Processing: 1, Shipped: 2, Delivered: 3 };

const STATUS_CONFIG = {
  Pending: {
    color: "bg-amber-50 text-amber-600 border-amber-100",
    icon: <FiClock className="animate-spin-slow" />,
    pulse: "shadow-amber-100 animate-pulse",
  },
  Processing: {
    color: "bg-brand-50 text-brand-600 border-brand-100",
    icon: <FiRefreshCw className="animate-spin" />,
    pulse: "shadow-emerald-100 animate-pulse",
  },
  Shipped: {
    color: "bg-purple-50 text-purple-600 border-purple-100",
    icon: <FiTruck className="translate-x-1 duration-700" />,
    pulse: "shadow-purple-100",
  },
  Delivered: {
    color: "bg-brand-50 text-brand-600 border-brand-100",
    icon: <FiCheckCircle />,
    pulse: "shadow-emerald-100",
  },
  Cancelled: {
    color: "bg-rose-50 text-rose-600 border-rose-100",
    icon: <FiXCircle />,
    pulse: "shadow-rose-100",
  },
  Failed: {
    color: "bg-red-50 text-red-600 border-red-100",
    icon: <FiXCircle />,
    pulse: "shadow-red-100",
  },
};

export default function AdminOrderedPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [tempTracking, setTempTracking] = useState({});
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [tempSearch, setTempSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    loadAllOrders();
  }, []);

  const loadAllOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/orders/userplace/orders");
      setOrders(res.data.orders);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkMarkDelivered = async () => {
    if (selectedOrders.length === 0) {
      toast.error("Select at least one order");
      return;
    }
    const result = await Swal.fire({
      title: "Mark as Delivered?",
      text: `${selectedOrders.length} order(s) will be marked as delivered.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#059669",
      confirmButtonText: "Yes, mark delivered",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;

    setBulkUpdating(true);
    let successCount = 0;
    for (const orderId of selectedOrders) {
      try {
        await api.put(`/api/orders/admin/update-order-status/${orderId}`, {
          status: "Delivered",
        });
        successCount++;
      } catch {
        console.error("Failed to update", orderId);
      }
    }
    toast.success(`${successCount}/${selectedOrders.length} marked as delivered`);
    setSelectedOrders([]);
    setSelectAll(false);
    setBulkUpdating(false);
    loadAllOrders();
  };

  const handleStatusUpdate = async (orderId, status, trackingNumber) => {
    setUpdatingId(orderId);
    try {
      await api.put(`/api/orders/admin/update-order-status/${orderId}`, {
        status,
        trackingNumber,
      });
      toast.success(`Order marked as ${status}`);
      loadAllOrders();
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Failed to update order");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteFailedOrder = async (orderId, orderIdString) => {
    const result = await Swal.fire({
      title: "Delete Failed Order?",
      text: "This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/orders/${orderId}`);
        toast.success("Order deleted");
        loadAllOrders();
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

  const filteredOrders = orders.filter((order) =>
    order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.shippingAddress?.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  const MobileFilters = () => {
    return (
      <div className="lg:hidden mb-4">
        <button
          onClick={() => {
            setTempSearch(searchTerm);
            setShowMobileFilters(true);
          }}
          className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-600 to-emerald-700 text-white rounded-xl shadow-lg hover:from-emerald-700 hover:to-emerald-800 transition-all"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <FiFilter size={18} />
            Search & Filter Orders
          </span>
          {searchTerm && (
            <span className="bg-white/20 px-2 py-1 rounded-lg text-xs">
              Active
            </span>
          )}
        </button>

        {searchTerm && (
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-100 text-brand-700 rounded-full text-xs">
              Search: {searchTerm}
              <button
                onClick={() => setSearchTerm("")}
                className="ml-1 hover:text-brand-900"
              >
                <FiX size={14} />
              </button>
            </span>
          </div>
        )}

        {showMobileFilters && (
          <div className="bg-white rounded-lg p-3 mt-3 space-y-2">
            <input
              type="text"
              placeholder="Search orders..."
              value={tempSearch}
              onChange={(e) => setTempSearch(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        )}
      </div>
    );
  };

  const MobileOrderCard = ({ order, index }) => {
    const [expandedOrderId, setExpandedOrderId] = useState(null);

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-3">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="font-mono font-bold text-brand-600 text-xs">
                #{order.orderId || order._id.slice(-6)}
              </span>
              <p className="text-xs text-slate-400 mt-1">
                {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[9px] font-black uppercase border ${STATUS_CONFIG[order.status]?.color || STATUS_CONFIG.Pending.color}`}
            >
              {STATUS_CONFIG[order.status]?.icon || <FiClock />}{" "}
              {order.status}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 truncate max-w-[150px]">
              {order.shippingAddress?.customerName || "Guest"}
            </p>
            <button
              onClick={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
              className="p-2 bg-slate-100 rounded-lg"
            >
              {expandedOrderId === order._id ? (
                <FiChevronUp size={16} />
              ) : (
                <FiChevronDown size={16} />
              )}
            </button>
          </div>

          {expandedOrderId === order._id && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 mb-2">
                  Items ({order.items?.length})
                </p>
                <div className="space-y-2">
                  {order.items?.slice(0, 2).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                        <img
                          src={item.image || item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = "https://placehold.co/150?text=No+Image";
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {item.name}
                        </p>
                        <p className="text-[9px] text-slate-400">Qty: {item.qty}</p>
                      </div>
                      <p className="text-xs font-bold text-brand-600">
                        Rs. {item.price?.toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {order.items?.length > 2 && (
                    <p className="text-[9px] text-slate-400 text-center">
                      +{order.items.length - 2} more items
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-400 mb-2">
                  Update Status
                </p>

                {order.status === "Failed" ? (
                  <button
                    onClick={() => handleDeleteFailedOrder(order._id, order.orderId)}
                    className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg text-xs font-black transition-all"
                  >
                    <FiTrash2 size={14} />
                    Delete Failed Order
                  </button>
                ) : (
                  <>
                    <select
                      value={order.status}
                      disabled={updatingId === order._id}
                      onChange={(e) => {
                        const val = e.target.value;

                        if (val === "Shipped") {
                          toast.error("Shipping details ඇතුළත් කරන්න.");
                          return;
                        }
                        handleStatusUpdate(
                          order._id,
                          val,
                          order.trackingNumber,
                        );
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 outline-none mb-2"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option
                          key={opt}
                          value={opt}
                          disabled={opt === "Shipped"}
                        >
                          {opt}
                        </option>
                      ))}
                    </select>

                    {(order.status === "Processing" ||
                      editingOrderId === order._id) && (
                      <div className="relative flex items-center">
                        <input
                          placeholder="Tracking ID..."
                          className="w-full bg-white border-2 border-emerald-500 rounded-lg px-3 py-2 text-xs font-bold outline-none pr-10"
                          value={tempTracking[order._id] || order.trackingNumber || ""}
                          onChange={(e) =>
                            setTempTracking({
                              ...tempTracking,
                              [order._id]: e.target.value,
                            })
                          }
                        />
                        <button
                          onClick={() =>
                            handleStatusUpdate(
                              order._id,
                              "Shipped",
                              tempTracking[order._id] || order.trackingNumber,
                            )
                          }
                          className="absolute right-1 bg-brand-600 text-white p-1.5 rounded-lg"
                        >
                          <FiSave size={14} />
                        </button>
                      </div>
                    )}

                    {order.status === "Shipped" && order.trackingNumber && (
                      <div className="flex items-center justify-between">
                        <button
                          onClick={(e) => handleTrackOnDomex(e, order.trackingNumber)}
                          className="flex items-center gap-1 bg-[#f37021] text-white px-3 py-2 rounded-lg text-xs font-bold"
                        >
                          <FiTruck size={12} /> Track{" "}
                          <FiExternalLink size={10} />
                        </button>
                        <button
                          onClick={() => setEditingOrderId(order._id)}
                          className="p-2 bg-slate-100 rounded-lg text-slate-500"
                        >
                          <FiEdit2 size={14} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-20 lg:pb-6 font-sans text-slate-900">
      <Toaster position="top-center" />

      <div className="max-w-7xl mx-auto mb-6 sm:mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Orders <span className="text-brand-600">Central</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Manage and track your customer orders in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleBulkMarkDelivered}
              disabled={selectedOrders.length === 0 || bulkUpdating}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200 active:scale-95 ${
                selectedOrders.length > 0 && !bulkUpdating
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <FiCheckCircle size={14} className={bulkUpdating ? "animate-spin" : ""} />
              <span className="hidden xs:inline">
                {bulkUpdating ? "Updating..." : `Deliver (${selectedOrders.length})`}
              </span>
              <span className="xs:hidden">{selectedOrders.length}</span>
            </button>

            <div className="relative">
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
          </div>
        </div>

        {viewMode === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentOrders.map((order, index) => (
              <MobileOrderCard key={order._id} order={order} index={index} />
            ))}
          </div>
        )}

        {viewMode === "table" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={() => {
                          if (selectAll) {
                            setSelectedOrders([]);
                            setSelectAll(false);
                          } else {
                            setSelectedOrders(currentOrders.map((o) => o._id));
                            setSelectAll(true);
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-600">#</th>
                    <th className="px-4 py-3 font-bold text-slate-600">Customer</th>
                    <th className="px-4 py-3 font-bold text-slate-600">Date</th>
                    <th className="px-4 py-3 font-bold text-slate-600">Status</th>
                    <th className="px-4 py-3 font-bold text-slate-600">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentOrders.map((order) => (
                    <tr
                      key={order._id}
                      onClick={() => {
                        setSelectedOrders((prev) =>
                          prev.includes(order._id)
                            ? prev.filter((id) => id !== order._id)
                            : [...prev, order._id]
                        );
                        setSelectAll(false);
                      }}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                        selectedOrders.includes(order._id) ? "bg-emerald-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order._id)}
                          onChange={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 pointer-events-auto cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-brand-600 font-bold">
                        #{order.orderId || order._id.slice(-6)}
                      </td>
                      <td className="px-4 py-3">
                        {order.shippingAddress?.customerName || "Guest"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase ${STATUS_CONFIG[order.status]?.color || STATUS_CONFIG.Pending.color}`}>
                          {STATUS_CONFIG[order.status]?.icon || <FiClock />} {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">
                        Rs. {(order.items?.reduce((sum, item) => sum + (item.price || 0), 0) || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredOrders.length > itemsPerPage && (
              <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 sm:px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className="px-3 sm:px-4 py-2 bg-brand-600 text-white rounded-xl text-xs sm:text-sm font-bold">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 sm:px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <FiPackage className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-sm text-slate-500 font-medium">No orders found</p>
          </div>
        )}
      </div>
    </div>
  );
};
