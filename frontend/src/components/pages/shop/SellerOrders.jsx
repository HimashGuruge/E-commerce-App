import { useState, useEffect, useCallback } from "react";
import { FiShoppingCart, FiSearch, FiChevronLeft, FiChevronRight, FiUser, FiPhone, FiMail, FiTruck, FiCheckCircle, FiClock } from "react-icons/fi";
import Swal from "sweetalert2";
import api from "@/utils/api";

const statusColors = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function SellerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/sellers/orders?page=${page}&limit=10&status=${statusFilter}`);
      if (data.success) {
        setOrders(data.orders);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error("Fetch orders error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatus = async (order, nextStatus) => {
    const labels = { processing: "Start processing", shipped: "Mark as shipped", delivered: "Mark as delivered" };
    let trackingNumber = undefined;
    let courier = undefined;

    if (nextStatus === "shipped") {
      const res = await Swal.fire({
        title: "Mark as shipped",
        html: `<input id="swal-tracking" class="swal2-input" placeholder="Tracking number (optional)" />
               <input id="swal-courier" class="swal2-input" placeholder="Courier (optional)" />`,
        showCancelButton: true,
        confirmButtonText: "Continue",
        cancelButtonText: "Cancel",
        preConfirm: () => {
          trackingNumber = document.querySelector("#swal-tracking")?.value?.trim() || undefined;
          courier = document.querySelector("#swal-courier")?.value?.trim() || undefined;
          return true;
        },
      });
      if (!res.isConfirmed) return;
    }

    setUpdatingId(order._id);
    try {
      const { data } = await api.put(`/api/sellers/orders/${order._id}/status`, {
        status: nextStatus,
        trackingNumber,
        courier,
      });
      if (data.success) {
        window.dispatchEvent(new Event("seller-orders-changed"));
        Swal.fire({ toast: true, position: "top-end", timer: 2000, showConfirmButton: false, icon: "success", title: labels[nextStatus] });
        await fetchOrders();
      } else {
        alert(data.error || "Update failed");
      }
    } catch (err) {
      alert(err.response?.data?.error || "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">My Orders</h2>
        <p className="text-sm text-slate-500 mt-1">Orders containing your products</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "processing", "shipped", "delivered", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                statusFilter === s ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-bold text-slate-900">Order #{order._id.toString().slice(-8)}</p>
                  <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusColors[order.orderStatus] || "bg-slate-100 text-slate-600"}`}>
                    {order.orderStatus}
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-1">Rs. {(order.totalPrice || 0).toLocaleString()}</p>
                </div>
              </div>
              {(order.orderStatus === "pending" || order.orderStatus === "processing" || order.orderStatus === "shipped") && (
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  {order.orderStatus === "pending" && (
                    <button
                      onClick={() => handleStatus(order, "processing")}
                      disabled={updatingId === order._id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
                    >
                      <FiClock className="w-4 h-4" /> Start Processing
                    </button>
                  )}
                  {order.orderStatus === "processing" && (
                    <button
                      onClick={() => handleStatus(order, "shipped")}
                      disabled={updatingId === order._id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                    >
                      <FiTruck className="w-4 h-4" /> Mark as Shipped
                    </button>
                  )}
                  {order.orderStatus === "shipped" && (
                    <button
                      onClick={() => handleStatus(order, "delivered")}
                      disabled={updatingId === order._id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      <FiCheckCircle className="w-4 h-4" /> Mark as Delivered
                    </button>
                  )}
                  {order.trackingNumber && (
                    <span className="text-xs text-slate-500">
                      Tracking: {order.trackingNumber}{order.courier ? ` · ${order.courier}` : ""}
                    </span>
                  )}
                </div>
              )}
              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl">
                    <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0">
                      {item.image ? <img src={item.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><FiShoppingCart /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.quantity} × Rs. {(item.price || 0).toLocaleString()}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900">Rs. {((item.price || 0) * (item.quantity || 0)).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              {order.user && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className={`w-10 h-10 rounded-full ${order.user.profileImage ? '' : 'bg-brand-100'} overflow-hidden flex-shrink-0 flex items-center justify-center`}>
                      {order.user.profileImage ? (
                        <img src={order.user.profileImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <FiUser className="w-5 h-5 text-brand-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{order.user.name || "Unknown"}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <FiMail className="w-3 h-3" /> {order.user.email || "—"}
                        </span>
                        {order.user.phone && (
                          <span className="flex items-center gap-1">
                            <FiPhone className="w-3 h-3" /> {order.user.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {order.shippingAddress?.address && (
                    <div className="mt-2 px-3 text-xs text-slate-400">
                      Ship to: {[order.shippingAddress.address, order.shippingAddress.city, order.shippingAddress.state].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-2 rounded-lg bg-white border border-slate-200 disabled:opacity-30">
                <FiChevronLeft />
              </button>
              <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-2 rounded-lg bg-white border border-slate-200 disabled:opacity-30">
                <FiChevronRight />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <FiShoppingCart className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No orders yet</p>
          <p className="text-xs text-slate-400 mt-1">Orders will appear here when customers purchase your products</p>
        </div>
      )}
    </div>
  );
}
