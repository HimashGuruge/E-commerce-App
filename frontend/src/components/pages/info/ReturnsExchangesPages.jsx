import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  CreditCard,
  Truck,
  HelpCircle,
  AlertCircle,
  Mail,
  MessageSquare,
  Shield,
  Loader2,
  Info,
  Package,
  ChevronDown,
  Check,
  Minus,
  Plus,
  CalendarDays,
  RotateCcw,
} from "lucide-react";
import Swal from "sweetalert2";
import api from "@/utils/api";
import { getPublicSettings } from "@/utils/siteSettings";

const REASONS = [
  { value: "defective", label: "Defective" },
  { value: "wrong_item", label: "Wrong item" },
  { value: "not_as_described", label: "Not as described" },
  { value: "damaged_on_arrival", label: "Damaged on arrival" },
  { value: "change_of_mind", label: "Changed my mind" },
  { value: "other", label: "Other" },
];

const reasonLabel = (value) =>
  REASONS.find((r) => r.value === value)?.label || "Other";

const statusChip = (status) => {
  if (status === "delivered")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
        <Check size={12} /> Delivered
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-bold">
      <Clock size={12} /> Processing
    </span>
  );
};

const ReturnsExchanges = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState(null);

  // ---- auth state: "checking" | "guest" | "user" ----
  const [authState, setAuthState] = useState("checking");

  // ---- return form state ----
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [itemForm, setItemForm] = useState({}); // { [index]: { quantity, reason, description } }
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null); // { id }

  useEffect(() => {
    const init = async () => {
      // Fetch public settings (return policy)
      try {
        const settings = await getPublicSettings();
        if (settings?.returnPolicy) {
          const p = { ...settings.returnPolicy };
          if (settings.shipping) {
            p.courierName = settings.shipping.courierName || "Domex";
          }
          setPolicy(p);
        }
      } catch {
        // fallback defaults used below
      } finally {
        setLoading(false);
      }

      // Check auth + load orders
      const token = localStorage.getItem("token");
      if (!token) {
        setAuthState("guest");
        return;
      }
      try {
        const me = await api.get("/api/users/me");
        if (!me.data.success) throw new Error("Invalid token");
        setAuthState("user");

        const res = await api.get("/api/orders/my-orders?limit=50");
        const eligible = (res.data.orders || []).filter((o) =>
          ["delivered", "processing"].includes(o.orderStatus)
        );
        setOrders(eligible);
      } catch {
        localStorage.removeItem("token");
        setAuthState("guest");
      }
    };
    init();
  }, []);

  const p = policy || {};

  const eligibleOrder = orders.find((o) => o._id === selectedOrderId);

  const selectOrder = (orderId) => {
    setSelectedOrderId(orderId);
    setSubmitted(null);
    const order = orders.find((o) => o._id === orderId);
    const form = {};
    (order?.items || []).forEach((item, idx) => {
      form[idx] = {
        quantity: Math.min(item.quantity || 1, Math.max(1, item.quantity || 1)),
        reason: "defective",
        description: "",
      };
    });
    setItemForm(form);
  };

  const setItemField = (idx, field, value) => {
    setItemForm((prev) => ({
      ...prev,
      [idx]: { ...prev[idx], [field]: value },
    }));
  };

  const contactAdminSupport = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      const result = await Swal.fire({
        title: "Login Required",
        text: "Please login to contact our support team.",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Login Now",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#22c55e",
        cancelButtonColor: "#64748b",
      });
      if (result.isConfirmed) {
        navigate("/login", { state: { from: "/returns" } });
      }
      return;
    }

    try {
      const { data } = await api.get("/api/users/me");
      if (!data.success) throw new Error("Invalid token");
    } catch {
      localStorage.removeItem("token");
      navigate("/login", { state: { from: "/returns" } });
      return;
    }

    const result = await Swal.fire({
      title: "Contact Support Team",
      html: `
        <div class="text-left">
          <p class="text-slate-700 mb-3">You're about to contact our support team regarding a return request.</p>
          <div class="bg-brand-50 p-3 rounded-lg mb-3">
            <p class="text-sm text-brand-800 flex items-start gap-2">
              <MessageSquare size="16" class="mt-0.5 flex-shrink-0" />
              <span>Our support team will respond to your inquiry within 24 hours.</span>
            </p>
          </div>
          <div class="bg-green-50 p-3 rounded-lg">
            <p class="text-sm text-green-800 flex items-start gap-2">
              <Shield size="16" class="mt-0.5 flex-shrink-0" />
              <span>Please provide your order number and reason for return in the chat for faster assistance.</span>
            </p>
          </div>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Contact Support",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#22c55e",
      cancelButtonColor: "#64748b",
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      title: "Connecting to Support...",
      html: '<div class="flex flex-col items-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-3"></div><p class="text-sm text-slate-600">Please wait while we connect you to our support team.</p></div>',
      showConfirmButton: false,
      allowOutsideClick: false,
    });

    setTimeout(() => {
      Swal.close();
      window.dispatchEvent(
        new CustomEvent("trigger-chatbot-message", {
          detail: {
            message: "@admin I would like to request a return for my recent order. Please assist me with the return process.",
            autoSend: true,
          },
        })
      );
      Swal.fire({
        title: "Connected!",
        text: "You are now connected to our support team. Please check the chat window.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
    }, 1500);
  };

  const steps = [
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Request a return",
      desc: `Pick your order below and tell us what went wrong. Have your order number ready.`,
    },
    {
      icon: <Info className="w-6 h-6" />,
      title: "We review it",
      desc: "Our team checks your request and replies with the next steps within 24 hours.",
    },
    {
      icon: <Truck className="w-6 h-6" />,
      title: `Ship via ${p.courierName || "Domex"}`,
      desc: `Once approved, ship the item back through ${p.courierName || "Domex"}. Return shipping is ${p.shippingCostPaidBy === "store" ? "covered by us" : "paid by the customer"}.`,
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: "Refund processed",
      desc: p.refundDaysText || "Refunds are processed within 5 business days after we receive and inspect the returned item.",
    },
  ];

  const faqs = [
    {
      q: `How many days do I have to return an item?`,
      a: p.windowDays
        ? `You have ${p.windowDays} days from delivery to request a return. Items must meet the conditions below.`
        : "Return windows are handled on a case-by-case basis. Contact support for details.",
    },
    {
      q: "Who pays for return shipping?",
      a: p.shippingCostText || "Return shipping cost is borne by the customer.",
    },
    {
      q: "Can I exchange an item for a different size?",
      a: p.exchangesAllowed
        ? "Yes, exchanges are available. Contact our support team to arrange an exchange."
        : "Exchanges are currently not available. You can return the item and place a new order for the desired size.",
    },
    {
      q: "When will I receive my refund?",
      a: p.refundDaysText || "Refunds are processed within 5 business days after we receive and inspect the returned item.",
    },
    {
      q: "Is there a restocking fee?",
      a:
        p.restockingFee && p.restockingFee > 0
          ? `A restocking fee of LKR ${p.restockingFee} applies to returned items.`
          : p.restockingFeeText || "No restocking fee applies.",
    },
    {
      q: "What items cannot be returned?",
      a: "Custom/personalized items, perishable goods, and items where the hygiene seal is broken cannot be returned. Contact support if you're unsure about your specific item.",
    },
  ];

  const [openFaq, setOpenFaq] = useState(0);

  const handleSubmit = async () => {
    if (!eligibleOrder) return;
    const items = eligibleOrder.items.map((item, idx) => {
      const f = itemForm[idx] || { quantity: 1, reason: "other", description: "" };
      if (f.reason === "other" && !f.description.trim()) {
        Swal.fire({
          icon: "warning",
          title: "Missing Info",
          text: `Please describe the issue for "${item.name || "this item"}".`,
        });
        return null;
      }
      return {
        product: item.product,
        variant: item.variant || undefined,
        quantity: f.quantity,
        reason: f.reason,
        description: f.description.trim() || undefined,
      };
    });
    if (items.includes(null)) return;

    setSubmitting(true);
    try {
      const res = await api.post("/api/feedback/returns/initiate", {
        order: eligibleOrder._id,
        items,
      });
      if (res.data.success) {
        setSubmitted({ id: res.data.returnRequest._id });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Failed to submit return request. Please try again.";
      Swal.fire({ icon: "error", title: "Could not submit", text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#fcfcfc] overflow-hidden">
      {/* entrance animation */}
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
        .fade-up { animation: fadeUp .55s cubic-bezier(.22,1,.36,1) both; }
      `}</style>

      {/* soft background glows */}
      <div className="pointer-events-none absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full bg-green-200/30 blur-3xl" />
      <div className="pointer-events-none absolute top-64 -left-40 w-[420px] h-[420px] rounded-full bg-brand-200/25 blur-3xl" />

      <div className="relative max-w-4xl mx-auto px-6 py-12 md:py-16">
        {/* ---------------- HERO ---------------- */}
        <div className="mb-10 fade-up">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-green-600 transition-colors mb-6"
          >
            <ArrowLeft size={16} /> Back to Shopping
          </Link>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider mb-4">
            <RotateCcw size={12} /> Returns &amp; Refunds
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Returns &amp; Exchanges
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            {p.policyText ||
              "Items can be returned within 7 days of delivery if they are unused and in original packaging."}
          </p>
        </div>

        {/* ---------------- DISABLED BANNER ---------------- */}
        {p.enabled === false && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-10 flex items-start gap-3 fade-up">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-amber-800">Returns Currently Disabled</h3>
              <p className="text-sm text-amber-700 mt-1">
                The return process is not available at this time. Please contact our support team for assistance.
              </p>
            </div>
          </div>
        )}

        {/* ---------------- AT A GLANCE ---------------- */}
        <div
          className="mb-12 bg-white rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 fade-up"
          style={{ animationDelay: "80ms" }}
        >
          <div className="flex items-center gap-4 p-6">
            <div className="w-11 h-11 rounded-2xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-black text-slate-900 text-lg leading-tight">{p.windowDays || 7}-Day Window</p>
              <p className="text-xs text-slate-500 mt-0.5">From date of delivery</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-6">
            <div className="w-11 h-11 rounded-2xl bg-brand-50 flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="font-black text-slate-900 text-lg leading-tight">
                {p.shippingCostPaidBy === "store" ? "Free Return Shipping" : "Customer Pays Shipping"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {p.shippingCostPaidBy === "store"
                  ? "We cover the return shipping cost"
                  : "Return shipping is at your expense"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-6">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-black text-slate-900 text-lg leading-tight">Fast Refunds</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Within {p.refundDays || 5} business days of inspection
              </p>
            </div>
          </div>
        </div>

        {/* ---------------- HOW IT WORKS ---------------- */}
        <div
          className="mb-12 bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 fade-up"
          style={{ animationDelay: "160ms" }}
        >
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              How It Works
            </h2>
            <p className="text-slate-500 mt-2">
              {p.processDescription ||
                "Request a return below. Our team will guide you through the rest."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative">
                {idx !== steps.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-0.5 bg-gradient-to-r from-slate-200 to-transparent -z-0" />
                )}
                <div className="relative flex flex-col items-center text-center">
                  <div className="relative w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-4 shadow-lg shadow-slate-900/20">
                    {step.icon}
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-brand-600 text-white text-[11px] font-black flex items-center justify-center">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1.5">{step.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ---------------- REQUEST A RETURN ---------------- */}
        {p.enabled !== false && (
          <div
            className="mb-12 rounded-3xl border-2 border-green-200 bg-gradient-to-b from-green-50/80 to-white p-6 md:p-10 shadow-sm fade-up"
            style={{ animationDelay: "240ms" }}
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                Request a Return
              </h2>
              <p className="text-slate-500 mt-2">
                Choose the order, tell us what went wrong, and we handle the rest.
              </p>
            </div>

            {/* success state */}
            {submitted ? (
              <div className="max-w-xl mx-auto bg-white rounded-2xl border border-green-200 p-8 text-center shadow-sm">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-7 h-7 text-green-600" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Return Request Received</h3>
                <p className="text-sm text-slate-600 mb-1">
                  Reference:{" "}
                  <span className="font-mono font-bold text-green-700">
                    #{submitted.id.slice(-8)}
                  </span>
                </p>
                <p className="text-sm text-slate-500 mb-6">
                  Our team will review it and respond within 24 hours. You can follow its
                  status in your orders.
                </p>
                <Link
                  to="/orders"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-full hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
                >
                  Track in My Orders
                </Link>
              </div>
            ) : authState === "checking" ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-7 h-7 animate-spin text-brand-600" />
              </div>
            ) : authState === "guest" ? (
              <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-100 p-8 text-center shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">
                  Login to request a return
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  We need to know which account and order this return is for. It only
                  takes a moment.
                </p>
                <button
                  onClick={() => navigate("/login", { state: { from: "/returns" } })}
                  className="px-8 py-3 bg-green-600 text-white font-bold rounded-full hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
                >
                  Login to Continue
                </button>
              </div>
            ) : orders.length === 0 ? (
              <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-100 p-8 text-center shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Package className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">
                  No eligible orders
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  Returns can be requested for orders that are delivered or still
                  processing. Check your order history for more.
                </p>
                <Link
                  to="/orders"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-800 transition-colors"
                >
                  View My Orders
                </Link>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto">
                {/* Step 1: pick order */}
                <div className="mb-6">
                  <p className="text-sm font-black text-slate-700 uppercase tracking-wide mb-3">
                    1 · Choose your order
                  </p>
                  <div className="space-y-3">
                    {orders.map((order) => {
                      const selected = order._id === selectedOrderId;
                      return (
                        <button
                          key={order._id}
                          type="button"
                          onClick={() => selectOrder(order._id)}
                          className={`w-full text-left flex items-center gap-4 p-4 rounded-2xl border-2 transition-all bg-white ${
                            selected
                              ? "border-green-500 shadow-md shadow-green-600/10"
                              : "border-slate-100 hover:border-slate-200"
                          }`}
                        >
                          <img
                            src={order.items?.[0]?.image || "https://placehold.co/96"}
                            alt={order.items?.[0]?.name || "Order"}
                            className="w-14 h-14 object-cover rounded-xl flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-slate-900 text-sm">
                                #{order._id.slice(-8)}
                              </span>
                              {statusChip(order.orderStatus)}
                            </div>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                              <CalendarDays size={12} />
                              {new Date(order.createdAt).toLocaleDateString()} ·{" "}
                              {order.items?.length || 0} item
                              {order.items?.length === 1 ? "" : "s"}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-slate-900 text-sm">
                              Rs. {(order.totalPrice || 0).toLocaleString()}
                            </p>
                          </div>
                          <span
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              selected ? "border-green-500 bg-green-500" : "border-slate-300"
                            }`}
                          >
                            {selected && <Check size={14} className="text-white" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: item details */}
                {eligibleOrder && (
                  <div className="mb-8">
                    <p className="text-sm font-black text-slate-700 uppercase tracking-wide mb-3">
                      2 · What went wrong?
                    </p>
                    <div className="space-y-4">
                      {eligibleOrder.items.map((item, idx) => {
                        const f = itemForm[idx] || {
                          quantity: item.quantity || 1,
                          reason: "defective",
                          description: "",
                        };
                        return (
                          <div
                            key={idx}
                            className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm"
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <img
                                src={item.image || "https://placehold.co/72"}
                                alt={item.name || "Item"}
                                className="w-12 h-12 object-cover rounded-xl flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-900 text-sm truncate">
                                  {item.name || "Item"}
                                </p>
                                {item.sku && (
                                  <p className="text-xs text-slate-400 font-mono">{item.sku}</p>
                                )}
                              </div>
                              <p className="text-sm font-bold text-slate-700 flex-shrink-0">
                                Rs. {((item.price || 0) * f.quantity).toLocaleString()}
                              </p>
                            </div>

                            {/* quantity */}
                            <div className="flex items-center gap-3 mb-4">
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                Qty to return
                              </span>
                              <div className="inline-flex items-center rounded-full border border-slate-200 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setItemField(idx, "quantity", Math.max(1, f.quantity - 1))
                                  }
                                  className="w-8 h-8 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40"
                                  disabled={f.quantity <= 1}
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="w-8 text-center text-sm font-bold">
                                  {f.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setItemField(
                                      idx,
                                      "quantity",
                                      Math.min(item.quantity || 1, f.quantity + 1)
                                    )
                                  }
                                  className="w-8 h-8 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40"
                                  disabled={f.quantity >= (item.quantity || 1)}
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                              <span className="text-xs text-slate-400">
                                of {item.quantity} ordered
                              </span>
                            </div>

                            {/* reason */}
                            <div className="mb-3">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                                Reason
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {REASONS.map((r) => (
                                  <button
                                    key={r.value}
                                    type="button"
                                    onClick={() => setItemField(idx, "reason", r.value)}
                                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                                      f.reason === r.value
                                        ? "border-green-500 bg-green-50 text-green-700"
                                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                                    }`}
                                  >
                                    {r.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* description */}
                            <textarea
                              value={f.description}
                              onChange={(e) => setItemField(idx, "description", e.target.value)}
                              placeholder={
                                f.reason === "other"
                                  ? "Describe the issue (required)…"
                                  : "Add any details (optional)…"
                              }
                              rows={2}
                              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* submit */}
                <div className="text-center">
                  <button
                    onClick={handleSubmit}
                    disabled={!selectedOrderId || submitting}
                    className="px-10 py-4 bg-green-600 text-white font-bold rounded-full hover:bg-green-700 transition-all shadow-lg shadow-green-600/25 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Check size={18} />
                    )}
                    {submitting ? "Submitting…" : "Submit Return Request"}
                  </button>
                  {!selectedOrderId && (
                    <p className="text-xs text-slate-400 mt-3">
                      Select an order above to continue.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- FAQ ---------------- */}
        <div className="mb-12 fade-up" style={{ animationDelay: "320ms" }}>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-green-600" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const open = openFaq === idx;
              return (
                <div
                  key={idx}
                  className={`bg-white rounded-2xl border transition-colors ${
                    open ? "border-green-200 shadow-sm" : "border-slate-100"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? -1 : idx)}
                    className="w-full flex items-center gap-3 p-5 text-left"
                  >
                    <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-black flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="flex-1 font-bold text-slate-900 text-sm">{faq.q}</span>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open && (
                    <p className="px-5 pb-5 pl-14 text-sm text-slate-600 leading-relaxed">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------------- CONDITIONS + CONTACT ---------------- */}
        <div
          className="bg-slate-900 rounded-3xl p-8 md:p-10 text-center fade-up"
          style={{ animationDelay: "400ms" }}
        >
          <div className="flex items-center justify-center gap-2 text-amber-400 mb-5 font-bold text-sm uppercase tracking-wider">
            <AlertCircle size={16} />
            <span>Return Conditions</span>
          </div>
          <div className="text-slate-300 text-sm mb-8 max-w-2xl mx-auto text-left space-y-2">
            {p.conditions
              ? p.conditions.split("\n").map((line, i) =>
                  line.trim() ? (
                    <p key={i} className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5 flex-shrink-0">•</span>
                      <span>{line.replace(/^-\s*/, "")}</span>
                    </p>
                  ) : null
                )
              : (
                <p className="text-center">
                  Items must be unused and in original packaging with all tags attached.
                  Custom or personalized items are not eligible for return.
                </p>
              )}
          </div>
          <button
            onClick={contactAdminSupport}
            className="px-8 py-3.5 bg-white text-slate-900 font-bold rounded-full hover:bg-slate-100 transition-colors shadow-xl inline-flex items-center justify-center gap-2"
          >
            <Mail size={18} />
            Contact Support
          </button>
          <p className="text-xs text-slate-500 mt-3">
            We reply within 24 hours — bring your order number.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReturnsExchanges;
