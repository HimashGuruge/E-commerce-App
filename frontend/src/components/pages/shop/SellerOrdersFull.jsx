import React, { useEffect, useState } from "react";
import api from "@/utils/api";
import { onSocketEvent } from "@/utils/socket";
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
} from "react-icons/fi";
import { apiError, showSuccess, showWarning } from "@/utils/notify";

const STATUS_OPTIONS = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "failed",
];

// Matches the seller endpoint's allowed transitions (PUT /api/sellers/orders/:id/status).
// Sellers can only move an order forward one step at a time.
const SELLER_ALLOWED = {
  pending: ["processing"],
  processing: ["shipped"],
  shipped: ["delivered"],
};

const API_BASE_URL = "";

const TRACKER_STEPS = { pending: 0, processing: 1, shipped: 2, delivered: 3 };

const capitalize = (value = "") => value.charAt(0).toUpperCase() + value.slice(1);

const NEW_ORDER_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

const isNewOrder = (order) =>
  !!order?.createdAt && Date.now() - new Date(order.createdAt).getTime() < NEW_ORDER_WINDOW_MS;

const STATUS_CONFIG = {
  pending: {
    color: "bg-[#fff1d6] text-[#ad6b00] border-[#f5ddae]",
    icon: <FiClock className="animate-spin-slow" />,
    pulse: "shadow-[#f5ddae] animate-pulse",
  },
  processing: {
    color: "bg-[#e7f4ff] text-[#2168b5] border-[#d7e9fb]",
    icon: <FiRefreshCw className="animate-spin" />,
    pulse: "shadow-[#d7e9fb] animate-pulse",
  },
  shipped: {
    color: "bg-[#e5f1ff] text-[#2168b5] border-[#d7e9fb]",
    icon: <FiTruck className="translate-x-1 duration-700" />,
    pulse: "shadow-[#d7e9fb]",
  },
  delivered: {
    color: "bg-[#def7e9] text-[#147c4f] border-[#c9efd9]",
    icon: <FiCheckCircle />,
    pulse: "shadow-[#c9efd9]",
  },
  cancelled: {
    color: "bg-[#fdeaea] text-[#b91c1c] border-[#f6d4d4]",
    icon: <FiXCircle />,
    pulse: "shadow-[#f6d4d4]",
  },
  failed: {
    color: "bg-[#fdeaea] text-[#b91c1c] border-[#f6d4d4]",
    icon: <FiXCircle />,
    pulse: "shadow-[#f6d4d4]",
  },
};

export default function SellerOrdersFull() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [tempTracking, setTempTracking] = useState({});
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [tempSearch, setTempSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadAllOrders();
    // A buyer placing a new order emits seller:new-order to this seller's room.
    // Re-fetch the list silently (no spinner) so the page updates live.
    const unsub = onSocketEvent(["seller:new-order"], () => loadAllOrders(true));
    return unsub;
  }, []);

  const loadAllOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Seller-scoped: only orders that include this seller's products.
      // The endpoint is paginated (max 50 per page), so collect every page.
      let page = 1;
      let all = [];
      while (true) {
        const res = await api.get("/api/sellers/orders", {
          params: { page, limit: 50 },
        });
        const body = res.data;
        all = all.concat(body.orders || []);
        if (page >= body.totalPages) break;
        page += 1;
      }
      setOrders(all);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, status, trackingNumber) => {
    // Sellers can only move an order forward one step (pending → processing →
    // shipped → delivered). Anything else is rejected by the endpoint.
    const current = orders.find((o) => o._id === orderId)?.orderStatus;
    const allowed = SELLER_ALLOWED[current];
    if (!allowed || !allowed.includes(status)) {
      showWarning(`This order is ${current}. It can only be moved to ${allowed ? capitalize(allowed[0]) : "nothing"}.`);
      return;
    }
    setUpdatingId(orderId);
    // Show the new status (and its color) immediately, before the API answer
    setOrders((prev) =>
      prev.map((o) =>
        o._id === orderId
          ? {
              ...o,
              orderStatus: status,
              trackingNumber: trackingNumber || o.trackingNumber,
            }
          : o
      )
    );
    try {
      await api.put(`/api/sellers/orders/${orderId}/status`, {
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
      showSuccess(`Order marked as ${status}`);
      // Re-sync in the background. Silent = no full-page spinner, so the
      // list updates in place instead of flashing to a loader.
      loadAllOrders(true);
    } catch (err) {
      console.error("Update error:", err);
      apiError(err, "Could not update this order. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleTrackOnDomex = async (e, trackingNumber) => {
    e.preventDefault();
    window.open(`https://domex.lk/Order-Details.php?wbno=${encodeURIComponent(trackingNumber)}`, "_blank");
  };

  const term = searchTerm.toLowerCase();
  const filteredOrders = orders.filter((order) => {
    if (statusFilter === "new" && !isNewOrder(order)) return false;
    if (statusFilter !== "all" && statusFilter !== "new" && order.orderStatus !== statusFilter) return false;
    return (
      String(order.orderId ?? "").toLowerCase().includes(term) ||
      String(order.shippingAddress?.fullName ?? "").toLowerCase().includes(term)
    );
  });
  const statusCounts = orders.reduce((acc, order) => {
    acc[order.orderStatus] = (acc[order.orderStatus] || 0) + 1;
    return acc;
  }, {});
  const newOrderCount = orders.filter((order) => isNewOrder(order)).length;

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  const MobileFilters = () => {
    return (
      <div className="lg:hidden mb-3">
        <button
          onClick={() => {
            setTempSearch(searchTerm);
            setShowMobileFilters(true);
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-shopprimary to-[#4338ca] text-white rounded-lg shadow-sm hover:from-[#4338ca] hover:to-[#3730a3] transition-all"
        >
          <span className="flex items-center gap-2 text-xs font-semibold">
            <FiFilter size={15} />
            Search & Filter Orders
          </span>
          {searchTerm && (
            <span className="bg-white/20 px-2 py-1 rounded-lg text-xs">
              Active
            </span>
          )}
        </button>

        {searchTerm && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-shopprimarylight text-shopprimary rounded-full text-xs">
              Search: {searchTerm}
              <button
                onClick={() => setSearchTerm("")}
                className="ml-1 hover:text-[#3730a3]"
              >
                <FiX size={14} />
              </button>
            </span>
          </div>
        )}

        {showMobileFilters && (
          <div className="bg-white rounded-lg p-2.5 mt-2.5 space-y-1.5">
            <input
              type="text"
              placeholder="Search orders..."
              value={tempSearch}
              onChange={(e) => setTempSearch(e.target.value)}
              className="w-full px-3 py-2 border border-[#dfe3ec] rounded-lg text-xs"
            />
          </div>
        )}
      </div>
    );
  };

  const MobileOrderCard = ({ order, index }) => {
    const [expandedOrderId, setExpandedOrderId] = useState(null);

    return (
      <div className={`bg-white rounded-lg border shadow-sm overflow-hidden mb-2.5 ${isNewOrder(order) ? "border-[#f5d98c] ring-2 ring-[#f5d98c]/70" : "border-[#dfe3ec]"}`}>
        <div className="p-3">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <span className="inline-flex items-center gap-1.5 font-mono font-bold text-shopprimary text-xs">
                #{order.orderId || order._id.slice(-6)}
                {isNewOrder(order) && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#d99a2b] text-white text-[8px] font-black uppercase tracking-wide">
                    New
                  </span>
                )}
              </span>
              <p className="text-xs text-[#a1a8b7] mt-1">
                {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${STATUS_CONFIG[order.orderStatus]?.color || STATUS_CONFIG.pending.color}`}
            >
              {STATUS_CONFIG[order.orderStatus]?.icon || <FiClock />}{" "}
              {order.orderStatus}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-shopmuted truncate max-w-[150px]">
              {order.shippingAddress?.fullName || order.user?.name || "Guest"}
            </p>
            <button
              onClick={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
              className="p-1.5 bg-[#eef0f5] rounded-md"
            >
              {expandedOrderId === order._id ? (
                <FiChevronUp size={14} />
              ) : (
                <FiChevronDown size={14} />
              )}
            </button>
          </div>

          {expandedOrderId === order._id && (
            <div className="mt-3 pt-3 border-t border-shopborder space-y-3">
              <div>
                <p className="text-[10px] font-bold text-[#a1a8b7] mb-1.5">
                  Items ({order.items?.length})
                </p>
                <div className="space-y-1.5">
                  {order.items?.slice(0, 2).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-[#eef0f5] overflow-hidden flex-shrink-0">
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
                        <p className="text-xs font-bold text-[#3d4557] truncate">
                          {item.name}
                        </p>
                        <p className="text-[9px] text-[#a1a8b7]">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-xs font-bold text-shopprimary">
                        Rs. {item.price?.toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {order.items?.length > 2 && (
                    <p className="text-[9px] text-[#a1a8b7] text-center">
                      +{order.items.length - 2} more items
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-shopborder pt-2.5">
                <p className="text-[10px] font-bold text-[#a1a8b7] mb-1.5">
                  Update Status
                </p>

                <>
                    <select
                      value={order.orderStatus}
                      disabled={updatingId === order._id}
                      onChange={(e) => {
                        const val = e.target.value;

                        if (val === "shipped") {
                          showWarning("Please enter the tracking number before marking as shipped.");
                          return;
                        }
                        handleStatusUpdate(
                          order._id,
                          val,
                          tempTracking[order._id] || order.trackingNumber,
                        );
                      }}
                      className="w-full bg-[#f7f8fc] border border-[#dfe3ec] rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-[#5b6577] outline-none mb-1.5"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option
                          key={opt}
                          value={opt}
                          disabled={opt === "shipped"}
                        >
                          {capitalize(opt)}
                        </option>
                      ))}
                    </select>

                    {(order.orderStatus === "processing" ||
                      editingOrderId === order._id) && (
                      <div className="relative flex items-center">
                        <input
                          placeholder="Tracking ID..."
                          className="w-full bg-white border-2 border-shopprimary rounded-lg px-2.5 py-1.5 text-[11px] font-bold outline-none pr-9"
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
                                  "shipped",
                                  tempTracking[order._id] || order.trackingNumber,
                                )
                          }
                          className="absolute right-1 bg-shopprimary text-white p-1.5 rounded-lg"
                        >
                          <FiSave size={14} />
                        </button>
                      </div>
                    )}

                    {order.orderStatus === "shipped" && order.trackingNumber && (
                      <div className="flex items-center justify-between">
                        <button
                          onClick={(e) => handleTrackOnDomex(e, order.trackingNumber)}
                          className="flex items-center gap-1 bg-shopprimary text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold hover:bg-[#4338ca]"
                        >
                          <FiTruck size={11} /> Track{" "}
                          <FiExternalLink size={10} />
                        </button>
                        <button
                          onClick={() => setEditingOrderId(order._id)}
                          className="p-1.5 bg-[#eef0f5] rounded-md text-shopmuted"
                        >
                          <FiEdit2 size={13} />
                        </button>
                      </div>
                    )}
                  </>
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
        <div className="w-10 h-10 border-4 border-shopprimary border-t-transparent rounded-full animate-spin mb-3"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] p-3 md:p-4 pb-16 lg:pb-4 font-sans text-shoptext">
      <div className="max-w-7xl mx-auto mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-[19px] md:text-[22px] font-bold text-shoptext">
              Orders <span className="text-shopprimary">Central</span>
            </h1>
            <p className="text-xs text-shopmuted font-medium mt-0.5">
              Manage and track your customer orders in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-60 pl-9 pr-3 py-2 bg-white border border-[#dfe3ec] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-shopprimary"
              />
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a8b7]" size={14} />
            </div>

            <div className="flex items-center gap-1 bg-white border border-[#dfe3ec] rounded-lg p-1">
              <button
                onClick={() => setViewMode("table")}
                title="Table view"
                className={`p-1.5 rounded-md transition-colors ${viewMode === "table" ? "bg-shopprimary text-white" : "text-[#a1a8b7] hover:text-[#5b6577]"}`}
              >
                <FiList size={14} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                title="Card view (status management)"
                className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-shopprimary text-white" : "text-[#a1a8b7] hover:text-[#5b6577]"}`}
              >
                <FiGrid size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
          {[
            { key: "all", label: "All", count: orders.length },
            { key: "new", label: "New", count: newOrderCount, isNew: true },
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
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                statusFilter === tab.key
                  ? tab.isNew
                    ? "bg-[#d99a2b] text-white border-[#d99a2b] shadow-md"
                    : "bg-shopprimary text-white border-shopprimary shadow-md"
                  : "bg-white text-[#5b6577] border-[#dfe3ec] hover:border-[#c7d2fe] hover:text-shopprimary"
              }`}
            >
              {tab.label}
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  statusFilter === tab.key ? "bg-white/20 text-white" : "bg-[#eef0f5] text-shopmuted"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {viewMode === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {currentOrders.map((order, index) => (
              <MobileOrderCard key={order._id} order={order} index={index} />
            ))}
          </div>
        )}

        {viewMode === "table" && (
          <div className="bg-white rounded-lg border border-[#dfe3ec] overflow-hidden">
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f7f8fc] sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5 font-bold text-[#5b6577]">#</th>
                    <th className="px-3 py-2.5 font-bold text-[#5b6577]">Customer</th>
                    <th className="px-3 py-2.5 font-bold text-[#5b6577]">Date</th>
                    <th className="px-3 py-2.5 font-bold text-[#5b6577]">Status</th>
                    <th className="px-3 py-2.5 font-bold text-[#5b6577]">Amount</th>
                    <th className="px-3 py-2.5 font-bold text-[#5b6577]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-shopborder">
                  {currentOrders.map((order) => (
                    <tr
                      key={order._id}
                      className={`transition-colors ${
                        isNewOrder(order)
                          ? "bg-[#fff6e3] hover:bg-[#fdeec9]"
                          : "hover:bg-[#f5f6fc]"
                      }`}
                    >
                      <td
                        className={`px-3 py-2.5 font-mono text-shopprimary font-bold ${
                          isNewOrder(order) ? "border-l-4 border-l-[#d99a2b]" : ""
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          #{order.orderId || order._id.slice(-6)}
                          {isNewOrder(order) && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#d99a2b] text-white text-[8px] font-black uppercase tracking-wide">
                              New
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {order.shippingAddress?.fullName || order.user?.name || "Guest"}
                      </td>
                      <td className="px-3 py-2.5 text-shopmuted">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-1">
                          <select
                            value={order.orderStatus}
                            disabled={updatingId === order._id}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const val = e.target.value;
                              const trackingValue =
                                tempTracking[order._id] || order.trackingNumber || "";
                              if (val === "shipped" && !trackingValue.trim()) {
                                showWarning("Please enter the tracking number before marking as shipped.");
                                return;
                              }
                              handleStatusUpdate(order._id, val, trackingValue);
                            }}
                            className={`min-w-[110px] px-2 py-1 rounded-lg text-[9px] font-black uppercase border cursor-pointer focus:outline-none focus:ring-2 focus:ring-shopprimary ${STATUS_CONFIG[order.orderStatus]?.color || STATUS_CONFIG.pending.color}`}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {updatingId === order._id ? "Updating..." : capitalize(opt)}
                              </option>
                            ))}
                          </select>
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
                            className="w-36 px-2 py-1 border border-[#dfe3ec] rounded-lg text-[10px] focus:outline-none focus:ring-2 focus:ring-shopprimary"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-bold text-[#3d4557]">
                        Rs. {(order.totalPrice ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredOrders.length > itemsPerPage && (
              <div className="p-3 border-t border-[#dfe3ec] flex flex-col sm:flex-row items-center justify-between gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 sm:px-3 py-1.5 bg-white border border-[#dfe3ec] rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f5f6fc] transition"
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className="px-2.5 sm:px-3 py-1.5 bg-shopprimary text-white rounded-lg text-xs font-bold">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-2.5 sm:px-3 py-1.5 bg-white border border-[#dfe3ec] rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f5f6fc] transition"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {filteredOrders.length === 0 && (
          <div className="text-center py-9">
            <FiPackage className="mx-auto text-[#c9cfda] mb-2.5" size={40} />
            <p className="text-xs text-shopmuted font-medium">No orders found</p>
          </div>
        )}
      </div>
    </div>
  );
};
