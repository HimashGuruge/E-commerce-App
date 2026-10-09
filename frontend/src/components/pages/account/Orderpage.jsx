import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShoppingBag, ArrowRight, RefreshCw, ChevronLeft, ChevronRight, Package, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/utils/api";
import { onSocketEvent } from "@/utils/socket";
import OrderStatusBadge from "@/components/pages/account/OrderStatusBadge";
import OrderProgressTracker from "@/components/pages/account/OrderProgressTracker";
import Swal from "sweetalert2";

const PLACEHOLDER_IMAGE = "https://placehold.co/150?text=No+Image";
const STATUS_FILTERS = ["all", "pending", "processing", "shipped", "delivered", "cancelled"];

function getItemImage(item) {
  return item?.image || item?.imageUrl || PLACEHOLDER_IMAGE;
}

function getItemQty(item) {
  return item?.quantity || item?.qty || 1;
}

const OrderCard = ({ order, index }) => {
  const status = order.orderStatus || order.status || "pending";
  const totalAmount = order.totalPrice || order.totalAmount || 0;
  const firstItem = order.items?.[0];
  const itemCount = order.items?.length || 0;
  const [showReturnModal, setShowReturnModal] = useState(false);

  const handleRequestReturn = () => {
    Swal.fire({
      title: "Request Return?",
      html: `
        <p class="mb-4">Are you sure you want to request a return for this order?</p>
        <p class="text-sm text-gray-600 mb-4">Order Total: Rs. ${totalAmount.toLocaleString()}</p>
        <p class="text-xs text-gray-500">You will receive an email with return instructions shortly.</p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#dc2626",
      confirmButtonText: "Yes, request return",
      cancelButtonText: "Cancel"
    }).then((result) => {
      if (result.isConfirmed) {
        setShowReturnModal(true);
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl ${
        status === "cancelled" ? "grayscale opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm">
            <img
              src={getItemImage(firstItem)}
              alt={firstItem?.name || "Product"}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
            />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              ID: #{order._id?.slice(-8)}
            </p>
            <h3 className="font-black text-slate-900">
              {new Date(order.createdAt).toLocaleDateString()}
            </h3>
            {itemCount > 1 && (
              <p className="text-xs text-slate-500 mt-1">+{itemCount - 1} more items</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <OrderStatusBadge status={status} />
          {order.trackingNumber && (
            <a
              href={`https://domex.lk/Order-Details.php?wbno=${order.trackingNumber.trim()}`}
              target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#f37021] text-white rounded-xl shadow-md hover:bg-slate-900 transition-all text-[11px] font-bold"
            >
              Track
            </a>
          )}
          {status === "delivered" && (
            <button
              onClick={handleRequestReturn}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-xl shadow-md hover:bg-slate-900 transition-all text-[11px] font-bold"
            >
              <Package size={14} />
              Request Return
            </button>
          )}
        </div>
      </div>

      <OrderProgressTracker currentStatus={status} />

      <div className="mt-6 pt-5 border-t border-slate-50 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase">Total Amount</p>
          <p className="text-xl font-black text-slate-900">Rs. {totalAmount.toLocaleString()}</p>
        </div>
        <Link
          to={`/orders/${order._id}`}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-black hover:bg-brand-600 transition-all"
        >
          View Details
          <ArrowRight size={16} />
        </Link>
      </div>

      {showReturnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Request Return</h3>
            <p className="text-slate-600 mb-6">
              You will be redirected to the return request form shortly.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReturnModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-slate-900 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  navigate(`/orders/${order._id}/return`);
                }}
                className="flex-1 px-4 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const EmptyState = () => (
  <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
      <ShoppingBag size={40} />
    </div>
    <h2 className="text-2xl font-black text-slate-900">No orders yet</h2>
    <p className="text-slate-500 mt-2 mb-6">Start shopping to see your orders here</p>
    <Link
      to="/"
      className="inline-flex items-center gap-2 bg-brand-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-brand-700 transition-all shadow-xl shadow-blue-100"
    >
      Start Shopping
      <ArrowRight size={18} />
    </Link>
  </div>
);

export default function OrderPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchOrders = useCallback(async (status, pageNum) => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/orders/my-orders", {
        params: { page: pageNum, limit: 10, status },
      });
      if (data.success) {
        setOrders(data.orders);
        setPage(data.page);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(statusFilter, 1);
  }, [statusFilter, fetchOrders]);

  // Real-time: refresh instantly when the server pushes a status change
  useEffect(() => {
    return onSocketEvent("order:update", () => {
      fetchOrders(statusFilter, page);
    });
  }, [fetchOrders, statusFilter, page]);

  const handleFilterChange = (s) => {
    setStatusFilter(s);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchOrders(statusFilter, newPage);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-600 text-white rounded-2xl shadow-xl shadow-blue-100">
              <ShoppingBag size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Order History</h1>
              <p className="text-slate-500 font-medium">{totalPages > 0 ? `${orders.length} order${orders.length !== 1 ? 's' : ''} (Page ${page}/${totalPages})` : "Track your orders"}</p>
            </div>
          </div>
          <button
            onClick={() => fetchOrders(statusFilter, page)}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-all group"
          >
            <RefreshCw size={16} className={`${loading ? "animate-spin" : "group-hover:rotate-180"} transition-all`} />
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </header>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => handleFilterChange(s)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize whitespace-nowrap transition-all ${
                statusFilter === s
                  ? "bg-brand-600 text-white shadow-md"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-brand-300"
              }`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-white rounded-3xl animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : orders.length > 0 ? (
          <>
            <div className="grid gap-6">
              {orders.map((order, i) => (
                <OrderCard key={order._id} order={order} index={i} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-4 py-2 bg-white rounded-xl border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:border-brand-300 transition-all text-sm font-medium"
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <span className="text-sm text-slate-500 font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-4 py-2 bg-white rounded-xl border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:border-brand-300 transition-all text-sm font-medium"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
