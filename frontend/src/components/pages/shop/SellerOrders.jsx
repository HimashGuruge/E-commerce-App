import { useState, useEffect, useCallback } from "react";
import { FiShoppingCart, FiSearch, FiChevronLeft, FiChevronRight, FiUser, FiPhone, FiMail, FiTruck, FiCheckCircle, FiClock } from "react-icons/fi";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import getApiError from "@/utils/errors";
import api from "@/utils/api";

const statusColors = {
  pending: "bg-[#fff1d6] text-[#ad6b00]",
  processing: "bg-[#e7f4ff] text-[#2168b5]",
  shipped: "bg-[#e5f1ff] text-[#2168b5]",
  delivered: "bg-[#def7e9] text-[#147c4f]",
  cancelled: "bg-[#fdeaea] text-[#b91c1c]",
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
        toast.error(getApiError({ response: { data } }, "Update failed"));
      }
    } catch (err) {
      toast.error(getApiError(err, "Update failed"));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h2 className="text-[26px] font-extrabold text-shoptext tracking-[-0.6px]">My Orders</h2>
        <p className="text-sm text-shopmuted mt-1.5">Orders containing your products</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "processing", "shipped", "delivered", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                statusFilter === s ? "bg-shopprimary text-white" : "bg-[#f1f3f8] text-[#677186] hover:bg-[#e8ebf2]"
              }`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-shopprimary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="bg-white rounded-[13px] border border-shopborder p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-bold text-shoptext">Order #{order._id.toString().slice(-8)}</p>
                  <p className="text-xs text-shopmuted">{new Date(order.createdAt).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusColors[order.orderStatus] || "bg-[#eef0f5] text-[#677186]"}`}>
                    {order.orderStatus}
                  </span>
                  <p className="text-sm font-bold text-shoptext mt-1">Rs. {(order.totalPrice || 0).toLocaleString()}</p>
                </div>
              </div>
              {(order.orderStatus === "pending" || order.orderStatus === "processing" || order.orderStatus === "shipped") && (
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  {order.orderStatus === "pending" && (
                    <button
                      onClick={() => handleStatus(order, "processing")}
                      disabled={updatingId === order._id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ad6b00] text-white text-sm font-medium hover:bg-[#935800] disabled:opacity-50"
                    >
                      <FiClock className="w-4 h-4" /> Start Processing
                    </button>
                  )}
                  {order.orderStatus === "processing" && (
                    <button
                      onClick={() => handleStatus(order, "shipped")}
                      disabled={updatingId === order._id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2168b5] text-white text-sm font-medium hover:bg-[#1a5394] disabled:opacity-50"
                    >
                      <FiTruck className="w-4 h-4" /> Mark as Shipped
                    </button>
                  )}
                  {order.orderStatus === "shipped" && (
                    <button
                      onClick={() => handleStatus(order, "delivered")}
                      disabled={updatingId === order._id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#15976a] text-white text-sm font-medium hover:bg-[#0f7c55] disabled:opacity-50"
                    >
                      <FiCheckCircle className="w-4 h-4" /> Mark as Delivered
                    </button>
                  )}
                  {order.trackingNumber && (
                    <span className="text-xs text-shopmuted">
                      Tracking: {order.trackingNumber}{order.courier ? ` · ${order.courier}` : ""}
                    </span>
                  )}
                </div>
              )}
              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-[#f7f8fc] rounded-xl">
                    <div className="w-12 h-12 rounded-lg bg-[#eef0f5] overflow-hidden flex-shrink-0">
                      {item.image ? <img src={item.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-[#a1a8b7]"><FiShoppingCart /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-shoptext truncate">{item.name}</p>
                      <p className="text-xs text-shopmuted">{item.quantity} × Rs. {(item.price || 0).toLocaleString()}</p>
                    </div>
                    <p className="text-sm font-bold text-shoptext">Rs. {((item.price || 0) * (item.quantity || 0)).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              {order.user && (
                <div className="mt-4 pt-4 border-t border-shopborder">
                  <div className="flex items-center gap-3 p-3 bg-[#f7f8fc] rounded-xl">
                    <div className={`w-10 h-10 rounded-full ${order.user.profileImage ? '' : 'bg-shopprimarylight'} overflow-hidden flex-shrink-0 flex items-center justify-center`}>
                      {order.user.profileImage ? (
                        <img src={order.user.profileImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <FiUser className="w-5 h-5 text-shopprimary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-shoptext">{order.user.name || "Unknown"}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-shopmuted mt-0.5">
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
                    <div className="mt-2 px-3 text-xs text-[#a1a8b7]">
                      Ship to: {[order.shippingAddress.address, order.shippingAddress.city, order.shippingAddress.state].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-2 rounded-lg bg-white border border-[#dfe3ec] disabled:opacity-30">
                <FiChevronLeft />
              </button>
              <span className="text-sm text-shopmuted">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-2 rounded-lg bg-white border border-[#dfe3ec] disabled:opacity-30">
                <FiChevronRight />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[13px] border border-shopborder p-12 text-center">
          <FiShoppingCart className="w-12 h-12 mx-auto text-[#c9cfda] mb-3" />
          <p className="text-shopmuted font-medium">No orders yet</p>
          <p className="text-xs text-[#a1a8b7] mt-1">Orders will appear here when customers purchase your products</p>
        </div>
      )}
    </div>
  );
}
