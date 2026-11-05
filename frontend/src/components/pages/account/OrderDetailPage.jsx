import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Tag, ShoppingBag, RotateCcw } from "lucide-react";
import api from "@/utils/api";
import OrderStatusBadge from "@/components/pages/account/OrderStatusBadge";
import OrderProgressTracker from "@/components/pages/account/OrderProgressTracker";
import { onSocketEvent } from "@/utils/socket";

const RETURN_STATUS_STYLES = {
  pending: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending review" },
  approved: { cls: "bg-blue-50 text-blue-700 border-blue-200", label: "Approved" },
  processing: { cls: "bg-purple-50 text-purple-700 border-purple-200", label: "Refund processing" },
  refunded: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Refunded" },
  rejected: { cls: "bg-red-50 text-red-700 border-red-200", label: "Rejected" },
};

function ReturnStatusCard({ orderId }) {
  const [returns, setReturns] = useState([]);

  const fetchReturns = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/feedback/returns/my?orderId=${orderId}`);
      if (data.success) setReturns(data.returns || []);
    } catch {
      // Not critical — the card simply stays hidden
    }
  }, [orderId]);

  useEffect(() => {
    fetchReturns();
    const unsubscribe = onSocketEvent(["return:updated"], (payload) => {
      if (payload?.returnId) fetchReturns();
    });
    return unsubscribe;
  }, [fetchReturns]);

  if (!returns.length) return null;

  return (
    <div className="mt-6 space-y-3">
      {returns.map((r) => {
        const s = RETURN_STATUS_STYLES[r.status] || RETURN_STATUS_STYLES.pending;
        return (
          <div key={r._id} className={`p-4 rounded-2xl border ${s.cls}`}>
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="flex items-center gap-2 text-sm font-bold">
                <RotateCcw size={15} />
                Return request #{r._id?.slice(-8)}
              </p>
              <span className={`text-xs font-black px-2.5 py-1 rounded-lg bg-white/70 border ${s.cls}`}>
                {s.label}
              </span>
            </div>
            <p className="text-xs opacity-80">
              Requested {new Date(r.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              {(r.approvedAt || r.refundedAt || r.rejectedAt) && (
                <>
                  {" "}· Last update {new Date(r.approvedAt || r.refundedAt || r.rejectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </>
              )}
            </p>
            {r.refundAmount > 0 && (
              <p className="text-xs font-bold mt-1.5">
                Refund amount: Rs. {Number(r.refundAmount).toLocaleString()}
              </p>
            )}
            {r.rejectionReason && (
              <p className="text-xs mt-1.5">
                <span className="font-bold">Reason for rejection:</span> {r.rejectionReason}
              </p>
            )}
            {(r.notes || r.rejectionReason || r.refundAmount > 0) && r.status === "approved" && !r.rejectionReason && (
              <p className="text-xs mt-1.5 italic">
                Prepare to send the item(s) back — we'll confirm once the refund is processed.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

const PLACEHOLDER_IMAGE = "https://placehold.co/150?text=No+Image";

function getItemImage(item) {
  return item?.image || item?.imageUrl || PLACEHOLDER_IMAGE;
}

function getItemQty(item) {
  return item?.quantity || item?.qty || 1;
}

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await api.get(`/api/orders/${orderId}`);
        if (data.success) setOrder(data.order);
      } catch {
        navigate("/orders");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="h-12 w-48 bg-slate-200 rounded-2xl animate-pulse mb-8" />
          <div className="h-96 bg-white rounded-[3rem] animate-pulse" />
        </div>
      </div>
    );
  }

  if (!order) return null;

  const status = order.orderStatus || order.status || "pending";
  const totalAmount = order.totalPrice || order.totalAmount || 0;
  const items = order.items || [];

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <Link to="/orders" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft size={16} /> Back to Orders
      </Link>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate("/orders")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Orders</span>
        </button>

        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-black text-slate-900">Order #{order._id?.slice(-8)}</h1>
                  <OrderStatusBadge status={status} />
                </div>
                <p className="text-sm text-slate-500">
                  Placed on {new Date(order.createdAt).toLocaleDateString("en-US", {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium uppercase">Total</p>
                <p className="text-3xl font-black text-slate-900">Rs. {totalAmount.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">
                  via {(order.paymentMethod || "").toUpperCase()}
                </p>
              </div>
            </div>

            <OrderProgressTracker currentStatus={status} />

            <ReturnStatusCard orderId={order._id} />

            <div className="border-t border-slate-100 pt-6 mt-6">
              <h2 className="font-black text-sm text-slate-700 mb-4">Items ({items.length})</h2>
              <div className="space-y-4">
                {items.map((item, i) => {
                  const itemTotal = (item.price || 0) * getItemQty(item);
                  return (
                    <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                      <img
                        src={getItemImage(item)}
                        className="w-16 h-16 rounded-2xl object-cover bg-white shadow-sm border border-slate-200"
                        alt={item.name || "Product"}
                        onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE; }}
                      />
                      <div className="flex-1">
                        <p className="font-black text-slate-800">{item.name || "Product"}</p>
                        <p className="text-sm text-slate-600">
                          Rs. {(item.price || 0).toLocaleString()} x {getItemQty(item)}
                        </p>
                        {item.lastPrice > 0 && (
                          <p className="text-xs text-green-600">
                            Saved: Rs. {((item.lastPrice - (item.price || 0)) * getItemQty(item)).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <p className="font-black text-slate-900">Rs. {itemTotal.toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {order.trackingNumber && (
              <div className="mt-6 p-4 bg-brand-50 rounded-2xl border border-brand-100">
                <p className="text-xs font-black text-brand-600 mb-1 flex items-center gap-1">
                  <Tag size={12} /> TRACKING NUMBER
                </p>
                <p className="font-black text-brand-700">{order.trackingNumber}</p>
                <a
                  href={`https://domex.lk/Order-Details.php?wbno=${order.trackingNumber.trim()}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-brand-600 mt-2 inline-flex items-center gap-1 hover:underline"
                >
                  Track on Domex <ArrowLeft size={10} className="rotate-180" />
                </a>
              </div>
            )}

            <div className="mt-6 p-5 border border-slate-100 rounded-3xl">
              <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 mb-3">
                <MapPin size={12} /> Shipping To
              </p>
              {order.shippingAddress ? (
                <div className="space-y-1 text-sm">
                  <p className="font-black text-slate-700">{order.shippingAddress.fullName || order.shippingAddress.customerName || "Customer"}</p>
                  <p className="text-slate-600">{order.shippingAddress.address}</p>
                  {(order.shippingAddress.city || order.shippingAddress.country) && (
                    <p className="text-slate-600">
                      {[order.shippingAddress.city, order.shippingAddress.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <p className="text-slate-600">Phone: {order.shippingAddress.phone || "N/A"}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No shipping address</p>
              )}
            </div>

            <div className="mt-6 p-5 border border-slate-100 rounded-3xl">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Order Timeline</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Order Placed:</span>
                  <span className="font-black">{new Date(order.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Last Updated:</span>
                  <span className="font-black">{new Date(order.updatedAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Payment:</span>
                  <span className={`font-black ${order.paymentStatus === "paid" ? "text-green-600" : "text-amber-600"}`}>
                    {order.paymentStatus === "paid" ? "Paid" : order.paymentStatus === "failed" ? "Failed" : "Pending"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium">
            <ShoppingBag size={16} /> Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
