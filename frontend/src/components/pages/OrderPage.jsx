import { clearCart } from "@/components/utils/Cart.jsx";
import api from "@/utils/api";
import { AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Filter,
  Heart,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const BACKEND_URL = "";
const PLACEHOLDER_IMAGE = "https://via.placeholder.com/150?text=No+Image";

const STATUS_STEPS = {
  pending: 0,
  processing: 1,
  shipped: 2,
  delivered: 3,
};

// ==================== INFO ICON COMPONENT ====================
const InfoIcon = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

// ==================== LIST ICON COMPONENT ====================
const ListIcon = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

// ==================== EXTERNAL LINK ICON ====================
const ExternalLinkIcon = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// ==================== STATUS BADGE ====================
const StatusBadge = ({ status }) => {
  const getStatusDetails = () => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return {
          bgLight: "bg-brand-50",
          icon: <CheckCircle2 size={14} className="text-brand-600" />,
          label: "Delivered",
        };
      case "pending":
        return {
          bgLight: "bg-amber-50",
          icon: <Clock size={14} className="text-amber-600" />,
          label: "Pending",
        };
      case "processing":
        return {
          bgLight: "bg-brand-50",
          icon: <Clock size={14} className="text-brand-600 animate-spin" />,
          label: "Processing",
        };
      case "shipped":
        return {
          bgLight: "bg-purple-50",
          icon: <Truck size={14} className="text-purple-600 animate-bounce" />,
          label: "Shipped",
        };
      case "cancelled":
        return {
          bgLight: "bg-red-50",
          icon: <AlertCircle size={14} className="text-red-600" />,
          label: "Cancelled",
        };
      case "failed":
        return {
          bgLight: "bg-red-50",
          icon: <AlertCircle size={14} className="text-red-600" />,
          label: "Failed",
        };
      default:
        return {
          bgLight: "bg-slate-50",
          icon: <Clock size={14} className="text-slate-600" />,
          label: status || "Pending",
        };
    }
  };
  const details = getStatusDetails();
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider ${details.bgLight} text-slate-700 border border-slate-200 shadow-sm`}
    >
      {details.icon}
      <span>{details.label}</span>
    </div>
  );
};

// ==================== ORDER PROGRESS TRACKER ====================
const OrderProgressTracker = ({ currentStatus }) => {
  const steps = [
    { label: "Ordered", icon: <Package size={14} />, desc: "Order confirmed" },
    { label: "Processing", icon: <Clock size={14} />, desc: "Preparing items" },
    { label: "Shipped", icon: <Truck size={14} />, desc: "On the way" },
    { label: "Arrived", icon: <CheckCircle2 size={14} />, desc: "Delivered" },
  ];

  const lowerStatus = currentStatus?.toLowerCase();
  if (lowerStatus === "cancelled" || lowerStatus === "failed") return null;

  const activeStep = STATUS_STEPS[lowerStatus] ?? 0;
  const progressWidth = (activeStep / (steps.length - 1)) * 100;

  return (
    <div className="w-full py-6">
      <div className="relative">
        {/* Progress Bar Background */}
        <div className="absolute top-5 left-0 w-full h-1 bg-slate-100 rounded-full" />

        {/* Animated Progress Bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressWidth}%` }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="absolute top-5 left-0 h-1 bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full shadow-sm"
        />

        {/* Steps */}
        <div className="relative z-10 flex justify-between">
          {steps.map((step, index) => {
            const isActive = index <= activeStep;
            const isCompleted = index < activeStep;

            return (
              <div
                key={step.label}
                className="flex flex-col items-center group"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  animate={{
                    backgroundColor: isActive ? "#3b82f6" : "#ffffff",
                    borderColor: isActive ? "#3b82f6" : "#e2e8f0",
                    color: isActive ? "#ffffff" : "#94a3b8",
                    boxShadow: isActive
                      ? "0 4px 12px rgba(59,130,246,0.3)"
                      : "none",
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center border-2 bg-white transition-all duration-300"
                >
                  {isCompleted ? (
                    <CheckCircle2 size={16} className="text-white" />
                  ) : (
                    step.icon
                  )}
                </motion.div>
                <span
                  className={`text-[10px] font-bold uppercase mt-2 transition-colors ${
                    isActive ? "text-brand-600" : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
                <span className="text-[8px] text-slate-400 hidden sm:block">
                  {step.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ==================== ORDER CARD COMPONENT ====================
const OrderCard = ({ order, onViewDetails, index }) => {
  const firstItem = order.items?.[0];

  const getDeliveryEstimate = () => {
    const createdAt = new Date(order.createdAt);
    const estimateDate = new Date(createdAt);
    estimateDate.setDate(estimateDate.getDate() + 5);
    return estimateDate.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group"
    >
      {/* Order Header */}
      <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <Package size={18} className="text-brand-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Order #{order.orderId?.slice(-8) || order._id?.slice(-8)}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Calendar size={12} className="text-slate-400" />
                <p className="text-xs font-medium text-slate-600">
                  {new Date(order.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Order Body */}
      <div className="p-5">
        {/* Items Preview */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <img
              src={firstItem?.imageUrl || firstItem?.image || PLACEHOLDER_IMAGE}
              alt={firstItem?.name}
              className="w-16 h-16 rounded-xl object-cover border border-slate-100 shadow-sm"
              onError={(e) => {
                e.target.src = PLACEHOLDER_IMAGE;
              }}
            />
            {order.items?.length > 1 && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[9px] font-bold shadow-lg">
                +{order.items.length - 1}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 line-clamp-1">
              {firstItem?.name || "Order Items"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {order.items?.length}{" "}
              {order.items?.length === 1 ? "item" : "items"}
            </p>
          </div>
          <div className="text-right">
            {order.labeledTotal && order.labeledTotal > order.totalAmount && (
              <p className="text-xs text-slate-400 line-through">
                Rs. {order.labeledTotal?.toLocaleString()}
              </p>
            )}
            <p className="text-lg font-black text-slate-900">
              Rs. {order.totalAmount?.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Progress Tracker */}
        <OrderProgressTracker currentStatus={order.status} />

        {/* Delivery Estimate */}
        {order.status?.toLowerCase() !== "delivered" &&
          order.status?.toLowerCase() !== "cancelled" &&
          order.status?.toLowerCase() !== "failed" && (
            <div className="mt-4 p-3 bg-amber-50/50 rounded-xl border border-amber-100">
              <div className="flex items-center gap-2">
                <Truck size={14} className="text-amber-600" />
                <p className="text-xs font-medium text-amber-700">
                  Estimated delivery: {getDeliveryEstimate()}
                </p>
              </div>
            </div>
          )}

        {/* Action Buttons */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => onViewDetails(order)}
            className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group"
          >
            View Details
            <ChevronRight
              size={14}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          </button>

          {order.status?.toLowerCase() === "delivered" && (
            <button
              onClick={() => {
                window.open(
                  `/productoverview/${order.items?.[0]?.productId}`,
                  "_blank",
                );
              }}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-1.5"
            >
              <Heart size={14} />
              Reorder
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ==================== ORDER MODAL ====================
const OrderModal = ({ order, onClose }) => {
  const [activeTab, setActiveTab] = useState("items");
  if (!order) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-900">Order Details</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              #{order.orderId || order._id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Modal Content */}
        <div
          className="overflow-y-auto p-6 space-y-6"
          style={{ maxHeight: "calc(85vh - 70px)" }}
        >
          {/* Status Banner */}
          <div
            className={`p-4 rounded-2xl border ${
              order.status === "Delivered"
                ? "bg-brand-50 border-brand-100"
                : order.status === "Cancelled" || order.status === "Failed"
                  ? "bg-red-50 border-red-100"
                  : "bg-brand-50 border-brand-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  order.status === "Delivered"
                    ? "bg-brand-100"
                    : order.status === "Cancelled" || order.status === "Failed"
                      ? "bg-red-100"
                      : "bg-brand-100"
                }`}
              >
                {order.status === "Delivered" ? (
                  <CheckCircle2 size={20} className="text-brand-600" />
                ) : order.status === "Cancelled" ||
                  order.status === "Failed" ? (
                  <AlertCircle size={20} className="text-red-600" />
                ) : (
                  <Package size={20} className="text-brand-600" />
                )}
              </div>
              <div>
                <p className="font-bold text-slate-800">
                  Order{" "}
                  {order.status === "Delivered"
                    ? "Completed"
                    : order.status === "Cancelled" || order.status === "Failed"
                      ? "Cancelled"
                      : "In Progress"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {order.status === "Delivered"
                    ? "Your order has been delivered successfully"
                    : order.status === "Cancelled" || order.status === "Failed"
                      ? "This order has been cancelled"
                      : "Your order is being processed"}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-100">
            {[
              { id: "items", label: "Items", icon: Package },
              { id: "details", label: "Details", icon: InfoIcon },
              { id: "tracking", label: "Tracking", icon: Truck },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-all relative ${
                  activeTab === tab.id
                    ? "text-brand-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Items Tab */}
          {activeTab === "items" && (
            <div className="space-y-4">
              {order.items?.map((item, idx) => {
                const itemTotal =
                  (item.sellingPrice || item.price || 0) * (item.qty || 1);
                return (
                  <div
                    key={idx}
                    className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100"
                  >
                    <img
                      src={item.imageUrl || item.image || PLACEHOLDER_IMAGE}
                      alt={item.name}
                      className="w-20 h-20 rounded-xl object-cover border border-slate-200"
                      onError={(e) => {
                        e.target.src = PLACEHOLDER_IMAGE;
                      }}
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800">{item.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Qty: {item.qty} × Rs.{" "}
                        {(item.sellingPrice || item.price)?.toLocaleString()}
                      </p>
                      {item.sellingPrice &&
                        item.price &&
                        item.sellingPrice < item.price && (
                          <p className="text-[10px] text-green-600 mt-1">
                            Saved Rs.{" "}
                            {(
                              (item.price - item.sellingPrice) *
                              item.qty
                            ).toLocaleString()}
                          </p>
                        )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">
                        Rs. {itemTotal.toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Details Tab */}
          {activeTab === "details" && (
            <div className="space-y-5">
              {/* Shipping Address */}
              {order.shippingAddress && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={16} className="text-brand-600" />
                    <h4 className="font-bold text-slate-800">
                      Shipping Address
                    </h4>
                  </div>
                  <p className="text-sm text-slate-700">
                    {order.shippingAddress.customerName}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    {order.shippingAddress.address}
                  </p>
                  <p className="text-sm text-slate-600">
                    {order.shippingAddress.city},{" "}
                    {order.shippingAddress.country}
                  </p>
                  <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                    <Phone size={12} /> {order.shippingAddress.phone}
                  </p>
                  {order.shippingAddress.email && (
                    <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                      <Mail size={12} /> {order.shippingAddress.email}
                    </p>
                  )}
                </div>
              )}

              {/* Payment Summary */}
              <div className="p-4 bg-gradient-to-r from-slate-50 to-white rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard size={16} className="text-brand-600" />
                  <h4 className="font-bold text-slate-800">Payment Summary</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium">
                      Rs.{" "}
                      {order.subtotal?.toLocaleString() ||
                        order.totalAmount?.toLocaleString()}
                    </span>
                  </div>
                  {order.deliveryFee && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Delivery Fee</span>
                      <span className="font-medium text-brand-600">
                        + Rs. {order.deliveryFee.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {order.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>- Rs. {order.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-800">Total</span>
                      <span className="text-xl font-black text-brand-600">
                        Rs. {order.totalAmount?.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Paid via {order.paymentMethod || "Card"}
                    </p>
                    {order.paidAt && (
                      <p className="text-xs text-green-600 mt-1">
                        Paid on {new Date(order.paidAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Timeline - FIXED */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={16} className="text-brand-600" />
                  <h4 className="font-bold text-slate-800">Order Timeline</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                      <Package size={14} className="text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Order Placed
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {order.status !== "Pending" && order.status !== "Failed" && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Clock size={14} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          Order Processed
                        </p>
                        <p className="text-xs text-slate-500">
                          Order confirmed and being prepared
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ✅ FIXED: Correct condition for Shipped */}
                  {(order.status === "Shipped" ||
                    order.status === "Delivered") && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <Truck size={14} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          Order Shipped
                        </p>
                        {order.trackingNumber && (
                          <p className="text-xs text-slate-500">
                            Tracking: {order.trackingNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {order.status === "Delivered" && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                        <CheckCircle2 size={14} className="text-brand-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          Order Delivered
                        </p>
                        <p className="text-xs text-slate-500">
                          Delivered successfully
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tracking Tab */}
          {activeTab === "tracking" && order.trackingNumber && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
                    <Truck size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-purple-600 font-bold">
                      TRACKING NUMBER
                    </p>
                    <p className="text-lg font-black text-purple-900">
                      {order.trackingNumber}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    window.open(
                      `https://domex.lk/Order-Details.php?wbno=${order.trackingNumber}`,
                      "_blank",
                    )
                  }
                  className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                >
                  Track on Domex
                  <ExternalLinkIcon size={14} />
                </button>
              </div>
            </div>
          )}

          {activeTab === "tracking" && !order.trackingNumber && (
            <div className="text-center py-12">
              <Truck size={48} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">
                No tracking information available yet
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Tracking will appear once order is shipped
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ==================== EMPTY STATE COMPONENT ====================
const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm"
  >
    <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
      <ShoppingBag size={40} className="text-slate-400" />
    </div>
    <h3 className="text-xl font-bold text-slate-800 mb-2">No orders yet</h3>
    <p className="text-slate-500 mb-6">
      Looks like you haven't placed any orders
    </p>
    <Link
      to="/"
      className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
    >
      Start Shopping
      <ArrowRight size={16} />
    </Link>
  </motion.div>
);

// ==================== LOADING SKELETON ====================
const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-slate-200 rounded-xl"></div>
          <div className="flex-1">
            <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-slate-200 rounded w-24"></div>
          </div>
          <div className="h-8 bg-slate-200 rounded-full w-24"></div>
        </div>
        <div className="h-2 bg-slate-200 rounded-full w-full mb-4"></div>
        <div className="flex gap-3">
          <div className="h-10 bg-slate-200 rounded-xl flex-1"></div>
          <div className="h-10 bg-slate-200 rounded-xl w-20"></div>
        </div>
      </div>
    ))}
  </div>
);

// ==================== STATS CARD COMPONENT (Fixed Tailwind colors) ====================
const StatCard = ({ label, value, icon: Icon, bgColor, iconColor }) => (
  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
      </div>
      <div
        className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center`}
      >
        <Icon size={18} className={iconColor} />
      </div>
    </div>
  </div>
);

// ==================== MAIN COMPONENT ====================
export default function OrderPage() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [hasStatusChanges, setHasStatusChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  const location = useLocation();
  const navigate = useNavigate();
  const ordersRef = useRef([]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // Fetch Orders
  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await api.get(`/api/orders/my-orders`);

      if (data.success) {
        setOrders(data.orders || []);
        setFilteredOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply Filters
  useEffect(() => {
    let result = [...orders];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (order) =>
          order.orderId?.toLowerCase().includes(term) ||
          order.items?.some((item) => item.name?.toLowerCase().includes(term)),
      );
    }

    if (statusFilter !== "all") {
      result = result.filter(
        (order) => order.status?.toLowerCase() === statusFilter.toLowerCase(),
      );
    }

    setFilteredOrders(result);
  }, [searchTerm, statusFilter, orders]);

  // Stripe Redirect Logic
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = localStorage.getItem("token");

    const handleStripeRedirects = async () => {
      if (params.has("payment-failed") || params.has("cancel")) {
        const sessionId = params.get("session_id");
        try {
          if (sessionId) {
            await api.post(
              `/api/payment/stripe-fail`,
              { sessionId }
            );
          }
          Swal.fire({
            title: "Payment Failed",
            text: "Your payment was not completed. Please try again.",
            icon: "error",
            confirmButtonColor: "#ef4444",
            customClass: { popup: "!rounded-3xl" },
          });
          navigate("/orders", { replace: true });
          fetchOrders();
        } catch (err) {
          console.error("Fail update error", err);
        }
        sessionStorage.removeItem("stripe_redirect_initiated");
        return;
      }

      if (params.has("payment-success")) {
        const sessionId = params.get("session_id");
        try {
          const { data } = await api.post(
            `/api/payment/verify-stripe`,
            { sessionId }
          );
          if (data.success) {
            clearCart();
            Swal.fire({
              title: "Success!",
              text: "Your order has been placed successfully.",
              icon: "success",
            });
            navigate("/orders", { replace: true });
            fetchOrders();
          }
        } catch (err) {
          console.error("Verify error", err);
        }
        sessionStorage.removeItem("stripe_redirect_initiated");
        return;
      }

      const cameFromStripe = sessionStorage.getItem(
        "stripe_redirect_initiated",
      );
      if (cameFromStripe === "true") {
        sessionStorage.removeItem("stripe_redirect_initiated");
        Swal.fire({
          title: "Order Not Placed",
          text: "You didn't complete the payment. Your order was not created.",
          icon: "info",
          confirmButtonColor: "#3b82f6",
          confirmButtonText: "OK",
          customClass: { popup: "!rounded-3xl" },
        });
        navigate("/checkout", { replace: true });
      }
    };

    handleStripeRedirects();
  }, [location.search, navigate, fetchOrders]);

  // Polling Logic
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem("token");
        const { data } = await api.get(
          `/api/orders/my-orders`
        );
        if (data.success) {
          if (
            JSON.stringify(data.orders) !== JSON.stringify(ordersRef.current)
          ) {
            setOrders(data.orders || []);
            setHasStatusChanges(true);
            setTimeout(() => setHasStatusChanges(false), 5000);
          }
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const stats = {
    total: orders.length,
    delivered: orders.filter((o) => o.status === "Delivered").length,
    processing: orders.filter(
      (o) => o.status === "Processing" || o.status === "Pending",
    ).length,
    shipped: orders.filter((o) => o.status === "Shipped").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-gradient-to-br from-brand-600 to-indigo-600 rounded-2xl shadow-lg shadow-brand-200">
                  <ShoppingBag size={24} className="text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                  My Orders
                </h1>
              </div>
              <p className="text-slate-500">
                Track and manage all your orders in one place
              </p>
            </div>

            <button
              onClick={() => fetchOrders()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              <span className="text-sm font-medium">Refresh</span>
            </button>
          </div>
        </div>

        {/* Status Update Alert */}
        <AnimatePresence>
          {hasStatusChanges && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-brand-200 rounded-2xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={16} className="text-white" />
                </div>
                <p className="text-brand-700 font-medium">
                  Your orders have been updated!
                </p>
              </div>
              <button
                onClick={() => setHasStatusChanges(false)}
                className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 transition-all"
              >
                Got it
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Cards - FIXED with static colors */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Orders"
            value={stats.total}
            icon={Package}
            bgColor="bg-brand-100"
            iconColor="text-brand-600"
          />
          <StatCard
            label="Delivered"
            value={stats.delivered}
            icon={CheckCircle2}
            bgColor="bg-brand-100"
            iconColor="text-brand-600"
          />
          <StatCard
            label="In Progress"
            value={stats.processing}
            icon={Clock}
            bgColor="bg-amber-100"
            iconColor="text-amber-600"
          />
          <StatCard
            label="Shipped"
            value={stats.shipped}
            icon={Truck}
            bgColor="bg-purple-100"
            iconColor="text-purple-600"
          />
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search by order ID or product name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                <Filter size={16} />
                <span className="text-sm font-medium">Filter</span>
              </button>

              <div className="flex bg-white border border-slate-200 rounded-xl p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === "grid"
                      ? "bg-slate-900 text-white"
                      : "text-slate-500"
                  }`}
                >
                  <Package size={16} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === "list"
                      ? "bg-slate-900 text-white"
                      : "text-slate-500"
                  }`}
                >
                  <ListIcon size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Chips */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-slate-100"
              >
                <div className="flex flex-wrap gap-2">
                  {[
                    "all",
                    "pending",
                    "processing",
                    "shipped",
                    "delivered",
                    "cancelled",
                  ].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        statusFilter === status
                          ? "bg-slate-900 text-white shadow-md"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Orders List */}
        {loading ? (
          <LoadingSkeleton />
        ) : filteredOrders.length > 0 ? (
          <div className={viewMode === "grid" ? "grid gap-5" : "space-y-4"}>
            {filteredOrders.map((order, index) => (
              <OrderCard
                key={order._id}
                order={order}
                index={index}
                onViewDetails={(order) => {
                  setSelectedOrder(order);
                  setShowModal(true);
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}

        {/* Results Count */}
        {!loading && filteredOrders.length > 0 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Showing {filteredOrders.length} of {orders.length} orders
            </p>
          </div>
        )}
      </div>

      {/* Order Modal */}
      <AnimatePresence>
        {showModal && (
          <OrderModal
            order={selectedOrder}
            onClose={() => {
              setShowModal(false);
              setSelectedOrder(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
