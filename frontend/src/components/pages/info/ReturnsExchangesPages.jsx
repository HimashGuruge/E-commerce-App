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
} from "lucide-react";
import Swal from "sweetalert2";
import api from "@/utils/api";
import { getPublicSettings } from "@/utils/siteSettings";

const ReturnsExchanges = () => {
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const settings = await getPublicSettings();
        if (settings?.returnPolicy) {
          setPolicy(settings.returnPolicy);
          if (settings.shipping) {
            setPolicy((prev) => ({
              ...prev,
              courierName: settings.shipping.courierName || "Domex",
            }));
          }
        }
      } catch {
        // fallback defaults
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  const p = policy || {};

  const checkUserAuthentication = async () => {
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
        navigate("/login", { state: { from: "/returns-exchanges" } });
      }
      return false;
    }

    try {
      setIsCheckingAuth(true);
      const { data } = await api.get("/api/users/me");
      if (!data.success) throw new Error("Invalid token");
      return data.success && data.user;
    } catch (error) {
      const result = await Swal.fire({
        title: "Session Expired",
        text: "Your session has expired. Please login again.",
        icon: "warning",
        confirmButtonText: "Login Now",
        confirmButtonColor: "#22c55e",
      });

      if (result.isConfirmed) {
        localStorage.removeItem("token");
        navigate("/login", { state: { from: "/returns-exchanges" } });
      }
      return false;
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const contactAdminSupport = async () => {
    const isAuthenticated = await checkUserAuthentication();

    if (!isAuthenticated) return;

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
      icon: <Mail className="w-8 h-8 text-green-600" />,
      title: "1. Contact Support",
      desc: `Chat with our support team using the button below. Have your order number ready.`,
    },
    {
      icon: <Info className="w-8 h-8 text-brand-600" />,
      title: "2. Describe Issue",
      desc: "Explain the reason for return. Our agent will review and guide you through the process.",
    },
    {
      icon: <Truck className="w-8 h-8 text-purple-600" />,
      title: `3. Ship via ${p.courierName || "Domex"}`,
      desc: `Once approved, arrange the return shipment through ${p.courierName || "Domex"}. Return shipping is ${p.shippingCostPaidBy === "store" ? "covered by us" : "borne by the customer"}.`,
    },
    {
      icon: <CreditCard className="w-8 h-8 text-brand-600" />,
      title: "4. Refund Processed",
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
      a: p.restockingFee && p.restockingFee > 0
        ? `A restocking fee of LKR ${p.restockingFee} applies to returned items.`
        : p.restockingFeeText || "No restocking fee applies.",
    },
    {
      q: "What items cannot be returned?",
      a: "Custom/personalized items, perishable goods, and items where the hygiene seal is broken cannot be returned. Contact support if you're unsure about your specific item.",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-green-600 transition-colors mb-6"
          >
            <ArrowLeft size={16} /> Back to Shopping
          </Link>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Returns & Exchanges
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            {p.policyText || "Items can be returned within 7 days of delivery if they are unused and in original packaging."}
          </p>
        </div>

        {p.enabled === false && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-16 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-amber-800">Returns Currently Disabled</h3>
              <p className="text-sm text-amber-700 mt-1">
                The return process is not available at this time. Please contact our support team for assistance.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">{p.windowDays || 7}-Day Window</h3>
            <p className="text-sm text-slate-500">
              Request a return within {p.windowDays || 7} days of delivery.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mb-4">
              <Truck className="w-6 h-6 text-brand-600" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">
              {p.shippingCostPaidBy === "store" ? "Free Return Shipping" : "Customer Pays Shipping"}
            </h3>
            <p className="text-sm text-slate-500">
              {p.shippingCostPaidBy === "store"
                ? "We cover the return shipping cost."
                : "Return shipping is at your expense."}
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Fast Refunds</h3>
            <p className="text-sm text-slate-500">
              Refund processed within {p.refundDays || 5} business days of inspection.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100 mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              How It Works
            </h2>
            <p className="text-slate-500 mt-2">
              {p.processDescription || "Contact our support team through the chat. An agent will guide you through the return process."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative">
                {idx !== steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-1/2 w-full h-0.5 bg-slate-100 -z-10"></div>
                )}
                <div className="flex flex-col items-center text-center">
                  <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-50 mb-4 transform hover:scale-105 transition-transform">
                    {step.icon}
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-8 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-green-600" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-xl p-6 hover:border-green-200 transition-colors"
              >
                <h3 className="font-bold text-slate-900 mb-2 flex items-start gap-2">
                  <span className="text-green-600 mt-1">Q:</span> {faq.q}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed pl-6">
                  <span className="font-bold text-slate-400 mr-1">A:</span>{" "}
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 text-center">
          <div className="flex items-center justify-center gap-2 text-amber-600 mb-4 font-bold text-sm">
            <AlertCircle size={18} />
            <span>Return Conditions</span>
          </div>
          <div className="text-slate-600 text-sm mb-8 max-w-2xl mx-auto text-left">
            {p.conditions
              ? p.conditions.split("\n").map((line, i) => line.trim() && (
                  <p key={i} className="mb-1 flex items-start gap-2">
                    <span className="text-amber-600 mt-1">•</span>
                    <span>{line.replace(/^-\s*/, "")}</span>
                  </p>
                ))
              : (
                <p className="text-center">
                  Items must be unused and in original packaging with all tags attached.
                  Custom or personalized items are not eligible for return.
                </p>
              )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={contactAdminSupport}
              disabled={isCheckingAuth}
              className="px-8 py-3 bg-green-600 text-white font-bold rounded-full hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCheckingAuth ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Mail size={18} />
              )}
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnsExchanges;
