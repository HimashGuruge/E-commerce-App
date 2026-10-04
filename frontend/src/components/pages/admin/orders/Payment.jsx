import api from "@/utils/api";
import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { clearCart } from "@/components/utils/Cart";
import {
  CreditCard,
  Truck,
  ShieldCheck,
  ChevronLeft,
  Lock,
  Package,
  Award,
  ShoppingBag,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Receipt,
} from "lucide-react";

const API_URL = `/api/payment`;
const USER_API_URL = `/api/users`;

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const orderedata = location.state;

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const response = await api.get(`/api/users/me`);

          if (response.data.success && response.data.user) {
            setUserProfile(response.data.user);
          } else if (response.data.user) {
            setUserProfile(response.data.user);
          }
        }
      } catch (error) {
        Swal.fire({
          title: "Profile Load Error",
          text: "Could not load your profile information. You can still proceed with checkout.",
          icon: "warning",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
        });
      } finally {
        setProfileLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // --- Accurate Price Computation ---
  const { subTotal, deliveryFee, finalTotal, items } = useMemo(() => {
    const orderItems = orderedata?.orderedItems || [];
    let calculatedSubtotal = 0;

    orderItems.forEach((item) => {
      const sellingPrice =
        item.sellingPrice ||
        item.lastPrice ||
        item.lastPrices ||
        item.price ||
        0;
      calculatedSubtotal += sellingPrice * (item.qty || 1);
    });

    const sub =
      orderedata?.total || orderedata?.finalTotal || calculatedSubtotal;
    const delivery = orderedata?.deliveryFee || 350;
    const final = orderedata?.finalTotal || sub + delivery;

    return {
      subTotal: sub,
      deliveryFee: delivery,
      finalTotal: final,
      items: orderItems,
    };
  }, [orderedata]);

  // ==================== ✅ STRIPE BACK BUTTON DETECTION ====================
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isPaymentFailed =
      params.has("payment-failed") || params.has("cancel");
    const isPaymentSuccess = params.has("payment-success");

    // Check if user came back from Stripe
    const cameFromStripe = sessionStorage.getItem("stripe_redirect_initiated");

    // Case 1: Payment Failed or Cancelled (with params)
    if (isPaymentFailed) {
      // Restore order data from sessionStorage (lost during Stripe redirect)
      const savedOrder = sessionStorage.getItem("pendingOrderData");
      const restoredOrder = savedOrder ? JSON.parse(savedOrder) : orderedata;

      if (restoredOrder) {
        sessionStorage.removeItem("pendingOrderData");
        navigate(location.pathname, { replace: true, state: restoredOrder });
      }

      Swal.fire({
        title: "Payment Cancelled",
        text: "Your transaction was cancelled or failed. You can try again or choose another method.",
        icon: "warning",
        confirmButtonColor: "#2563eb",
      });

      sessionStorage.removeItem("stripe_redirect_initiated");
    }

    // Case 2: User clicked Back button from Stripe (no params, but came from Stripe)
    if (cameFromStripe === "true" && !isPaymentFailed && !isPaymentSuccess) {
      sessionStorage.removeItem("stripe_redirect_initiated");

      const savedOrder = sessionStorage.getItem("pendingOrderData");
      const restoredOrder = savedOrder ? JSON.parse(savedOrder) : orderedata;

      if (restoredOrder) {
        sessionStorage.removeItem("pendingOrderData");
        navigate(location.pathname, { replace: true, state: restoredOrder });
      }

      Swal.fire({
        title: "Payment Not Completed",
        text: "ඔබ ගෙවීම සම්පූර්ණ කළේ නැහැ. ඔබට නැවත උත්සාහ කළ හැකියි.",
        icon: "info",
        confirmButtonColor: "#3b82f6",
        confirmButtonText: "හරි",
      });
    }
  }, [location.search, navigate, orderedata]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isPaymentFailed =
      params.has("payment-failed") || params.has("cancel");

    if (!orderedata && !isPaymentFailed) {
      navigate("/cart");
    }

    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 100 : prev + 0.5));
    }, 20);
    return () => clearInterval(interval);
  }, [orderedata, navigate, location.search]);

  const getUserInitials = () => {
    if (userProfile?.name) {
      return userProfile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (orderedata?.shippingAddress?.customerName) {
      return orderedata.shippingAddress.customerName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return "U";
  };

  const formatMemberSince = () => {
    if (userProfile?.createdAt) {
      return new Date(userProfile.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    return "N/A";
  };

  const getUserFullName = () => {
    if (userProfile?.name) return userProfile.name;
    if (orderedata?.shippingAddress?.customerName)
      return orderedata.shippingAddress.customerName;
    return "Guest Customer";
  };

  const getUserEmail = () => {
    if (userProfile?.email) return userProfile.email;
    if (orderedata?.userEmail) return orderedata.userEmail;
    return "No email provided";
  };

  const getUserPhone = () => {
    if (
      orderedata?.shippingAddress?.phone &&
      orderedata.shippingAddress.phone !== "No phone Number"
    ) {
      return orderedata.shippingAddress.phone;
    }
    if (
      orderedata?.contactPhone &&
      orderedata.contactPhone !== "No phone Number"
    ) {
      return orderedata.contactPhone;
    }
    if (userProfile?.phone && userProfile.phone !== "No phone Number") {
      return userProfile.phone;
    }
    return "Not provided";
  };

  const getDisplayPhone = () => {
    const phone = getUserPhone();
    return phone === "Not provided" ? "No phone number" : phone;
  };

  // ==================== ✅ STRIPE PAYMENT WITH FLAG ====================
  const handleCardPayment = async () => {
    if (!orderedata) return;
    setLoading(true);
    try {
      const shippingAddressWithName = {
        ...orderedata.shippingAddress,
        customerName:
          orderedata.shippingAddress?.customerName || getUserFullName(),
      };

      const itemsWithSellingPrice = items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        qty: item.qty,
        price: item.price || 0,
        sellingPrice:
          item.sellingPrice ||
          item.lastPrice ||
          item.lastPrices ||
          item.price ||
          0,
        images: item.images,
        lastPrices: item.lastPrices,
      }));

      const { data } = await api.post(
        `/api/payment/create-checkout-session`,
        {
          orderedItems: itemsWithSellingPrice,
          deliveryFee: deliveryFee,
          shippingAddress: shippingAddressWithName,
          contactPhone: getUserPhone(),
          userEmail: orderedata.userEmail || getUserEmail(),
        }
      );

      if (data.success && data.url) {
        // ✅ Save order data AND set flag before redirecting to Stripe
        sessionStorage.setItem("pendingOrderData", JSON.stringify(orderedata));
        sessionStorage.setItem("stripe_redirect_initiated", "true");
        window.location.href = data.url;
      } else {
        throw new Error("Failed to get checkout URL");
      }
    } catch (err) {
      setLoading(false);
      Swal.fire({
        title: "Error",
        text:
          err.response?.data?.message ||
          "Could not initiate Stripe payment. Please try again.",
        icon: "error",
      });
    }
  };

  // ==================== COD PAYMENT ====================
  const handleCOD = async () => {
    const { value: accept } = await Swal.fire({
      width: "95%",
      maxWidth: "1200px",
      padding: "1.5rem",
      background: "#fff",
      backdrop: `rgba(0,0,0,0.4)`,
      showClass: {
        popup: "animate__animated animate__fadeInUp animate__faster",
      },
      hideClass: {
        popup: "animate__animated animate__fadeOutDown animate__faster",
      },
      title: `
        <div class="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <div class="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-brand-500 to-green-600 flex items-center justify-center shadow-xl shadow-brand-200">
            <svg class="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div class="text-center sm:text-left">
            <h2 class="text-xl sm:text-2xl font-black text-slate-900">Confirm Your Order</h2>
            <p class="text-xs sm:text-sm text-slate-500">Please review your order details before confirming</p>
          </div>
        </div>
      `,
      html: `
        <div class="font-sans">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <!-- Left Column - User & Delivery -->
            <div class="lg:col-span-1 space-y-5">
              <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <div class="flex items-center gap-4 mb-4">
                  <div class="relative">
                    <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-green-600 flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-lg">
                      ${getUserInitials()}
                    </div>
                    <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div class="flex-1">
                    <h3 class="font-bold text-slate-900 text-base sm:text-lg">${getUserFullName()}</h3>
                    <p class="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Mail size="12" /> ${getUserEmail()}
                    </p>
                    <p class="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Phone size="12" /> ${getDisplayPhone()}
                    </p>
                  </div>
                </div>
              </div>

              <div class="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-5 border border-slate-200">
                <div class="flex items-center gap-2 mb-3">
                  <MapPin size="18" class="text-brand-600" />
                  <h3 class="font-bold text-slate-900">Delivery Address</h3>
                </div>
                <div class="space-y-1 text-sm">
                  <p class="font-medium text-slate-800">${orderedata?.shippingAddress?.address || "No address provided"}</p>
                  <p class="text-slate-500">${orderedata?.shippingAddress?.city || ""}</p>
                </div>
              </div>
            </div>

            <!-- Middle Column - Order Items -->
            <div class="lg:col-span-1">
              <div class="bg-white rounded-2xl p-5 border border-slate-200 h-full">
                <div class="flex items-center gap-2 mb-4">
                  <Package size="18" class="text-brand-600" />
                  <h3 class="font-bold text-slate-900">Order Items (${items.length})</h3>
                </div>
                <div class="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  ${items
                    .map((item) => {
                      const displayPrice =
                        item.sellingPrice ||
                        item.lastPrice ||
                        item.lastPrices ||
                        item.price ||
                        0;
                      const itemTotal = displayPrice * (item.qty || 1);
                      return `
                      <div class="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div class="relative shrink-0">
                          <img src="${Array.isArray(item.images) ? item.images[0] : item.images}"
                               alt="${item.productName}"
                               class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-slate-200"
                               onerror="this.src='https://placehold.co/150?text=No+Image'" />
                        </div>
                        <div class="flex-1">
                          <p class="text-sm font-bold text-slate-900">${item.productName}</p>
                          <p class="text-xs text-slate-500">Rs. ${displayPrice.toLocaleString()} each</p>
                        </div>
                        <div class="text-right">
                          <p class="text-sm font-bold text-brand-600">Rs. ${itemTotal.toLocaleString()}</p>
                          <p class="text-[10px] text-slate-400">Qty: ${item.qty}</p>
                        </div>
                      </div>
                    `;
                    })
                    .join("")}
                </div>
              </div>
            </div>

            <!-- Right Column - Payment Summary -->
            <div class="lg:col-span-1">
              <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white h-full">
                <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
                  <Receipt size="18" />
                  Payment Summary
                </h3>
                <div class="space-y-3">
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-300">Subtotal</span>
                    <span class="font-bold">Rs. ${subTotal.toLocaleString()}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-300">Delivery Fee</span>
                    <span class="font-bold text-brand-400">+ Rs. ${deliveryFee.toLocaleString()}</span>
                  </div>
                  <div class="border-t border-slate-700 my-3 pt-3">
                    <div class="flex justify-between items-center">
                      <span class="text-slate-300">Total</span>
                      <span class="text-2xl font-bold text-white">Rs. ${finalTotal.toLocaleString()}</span>
                    </div>
                    <p class="text-xs text-slate-400 mt-1">Cash on Delivery</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-5 bg-brand-50/30 rounded-xl p-4 border border-brand-100">
            <label class="flex items-start gap-3 cursor-pointer group">
              <div class="relative mt-0.5">
                <input type="checkbox" id="codTerms" class="sr-only" />
                <div class="w-5 h-5 rounded-md border-2 border-emerald-300 group-hover:border-emerald-600 transition-colors flex items-center justify-center checked-indicator">
                  <svg class="w-3 h-3 text-brand-600 hidden check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div class="flex-1">
                <span class="text-sm text-slate-700 font-medium">
                  I agree to pay <span class="font-bold text-brand-600">Rs. ${finalTotal.toLocaleString()}</span> in cash upon delivery
                </span>
                <p class="text-xs text-slate-500 mt-1">By confirming, you agree to our terms and conditions</p>
              </div>
            </label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: `
        <div class="flex items-center gap-2 px-3 sm:px-4">
          <span class="text-sm sm:text-base">Confirm Order</span>
          <ArrowRight size="16" />
        </div>
      `,
      cancelButtonText: "Go Back",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#64748b",
      customClass: {
        popup: "!rounded-2xl sm:!rounded-3xl !shadow-2xl !p-4 sm:!p-6",
        confirmButton:
          "!rounded-xl !px-5 sm:!px-8 !py-3 sm:!py-4 !font-bold !text-sm sm:!text-base !bg-brand-600 hover:!bg-brand-700",
        cancelButton:
          "!rounded-xl !px-5 sm:!px-8 !py-3 sm:!py-4 !font-bold !text-sm sm:!text-base !bg-slate-100 !text-slate-700 hover:!bg-slate-200",
      },
      buttonsStyling: true,
      reverseButtons: true,
      preConfirm: () => {
        if (!document.getElementById("codTerms")?.checked) {
          Swal.showValidationMessage(`
            <div class="flex items-center gap-2 text-red-600 text-sm">
              <span>Please accept the terms to continue</span>
            </div>
          `);
          return false;
        }
        return true;
      },
      didOpen: () => {
        const checkbox = document.getElementById("codTerms");
        if (checkbox) {
          checkbox.addEventListener("change", function () {
            const indicator =
              this.closest(".relative").querySelector(".checked-indicator");
            const checkIcon =
              this.closest(".relative").querySelector(".check-icon");
            if (this.checked) {
              indicator.classList.add("bg-brand-600", "border-emerald-600");
              checkIcon.classList.remove("hidden");
            } else {
              indicator.classList.remove(
                "bg-brand-600",
                "border-emerald-600",
              );
              checkIcon.classList.add("hidden");
            }
          });
        }
      },
    });

    if (!accept) return;

    setLoading(true);
    try {
      const shippingAddressWithName = {
        ...orderedata.shippingAddress,
        customerName:
          orderedata.shippingAddress?.customerName || getUserFullName(),
      };

      const itemsWithSellingPrice = items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        qty: item.qty,
        price: item.price || 0,
        sellingPrice:
          item.sellingPrice ||
          item.lastPrice ||
          item.lastPrices ||
          item.price ||
          0,
        images: item.images,
        lastPrices: item.lastPrices,
      }));

      const response = await api.post(
        `/api/payment/cod`,
        {
          orderedItems: itemsWithSellingPrice,
          shippingAddress: shippingAddressWithName,
          contactPhone: getUserPhone(),
          totalAmount: finalTotal,
          paymentMethod: "COD",
        }
      );

      window.dispatchEvent(new Event("orderUpdate"));
      clearCart();

      Swal.fire({
        icon: "success",
        width: "90%",
        maxWidth: "500px",
        title:
          '<span class="text-xl sm:text-2xl font-bold">Order Placed Successfully! 🎉</span>',
        html: `
          <div class="space-y-3">
            <p class="text-sm text-slate-600">Your order has been confirmed and will be delivered soon.</p>
            <div class="bg-brand-50 rounded-xl p-4">
              <p class="text-base font-bold text-brand-800">Order Total: Rs. ${finalTotal.toLocaleString()}</p>
              <p class="text-xs text-brand-600 mt-1">Payment Method: Cash on Delivery</p>
            </div>
          </div>
        `,
        confirmButtonText: "Track Order",
        confirmButtonColor: "#10b981",
        showCancelButton: true,
        cancelButtonText: "Continue Shopping",
        cancelButtonColor: "#64748b",
        customClass: {
          popup: "!rounded-2xl !p-6",
          confirmButton: "!rounded-xl !px-6 !py-3 !font-bold",
          cancelButton: "!rounded-xl !px-6 !py-3 !font-bold",
        },
        reverseButtons: true,
      }).then((result) => {
        if (result.isConfirmed) {
          navigate("/orders");
        } else {
          navigate("/");
        }
      });
    } catch (err) {
      setLoading(false);
      Swal.fire({
        title: "Order Failed",
        text:
          err.response?.data?.message ||
          "Something went wrong. Please try again.",
        icon: "error",
        confirmButtonColor: "#10b981",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-20 lg:pb-6 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-white/80 z-[100] flex flex-col items-center justify-center backdrop-blur-md">
            <div className="relative">
              <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-brand-100 border-t-emerald-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-brand-600" />
              </div>
            </div>
            <p className="mt-4 sm:mt-6 font-bold text-slate-800 text-sm sm:text-lg animate-pulse">
              Processing Secure Payment...
            </p>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 hover:text-brand-600 transition-all font-semibold group bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm text-sm"
          >
            <ChevronLeft
              size={16}
              className="group-hover:-translate-x-1 transition-transform"
            />
            Back to Shipping
          </button>
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
            <Lock size={12} className="text-brand-600" />
            <span className="text-xs sm:text-sm font-bold text-slate-600">
              Secure Checkout
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          {/* Left Column - Payment Methods */}
          <div className="lg:col-span-7 space-y-5 sm:space-y-6">
            <div className="mb-4 sm:mb-6">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                Complete Your Purchase
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 sm:mt-2">
                Choose your preferred payment method
              </p>
            </div>

            {/* User Profile Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-lg border border-slate-100">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                <div className="relative">
                  {profileLoading ? (
                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-slate-200 animate-pulse"></div>
                  ) : userProfile?.avatar || userProfile?.profileImage ? (
                    <img
                      src={userProfile.avatar || userProfile.profileImage}
                      alt="Profile"
                      className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl object-cover border-3 border-emerald-500 shadow-lg"
                    />
                  ) : (
                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-green-600 flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-lg">
                      {getUserInitials()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div className="flex-1">
                  <h2 className="text-base sm:text-lg lg:text-xl font-black text-slate-900">
                    {getUserFullName()}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 break-all">
                    {getUserEmail()}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 sm:mt-2">
                    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-400">
                      <MapPin size={10} />{" "}
                      {orderedata?.shippingAddress?.city || "City"}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-400">
                      <Phone size={10} /> {getDisplayPhone()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div
                onClick={() => {
                  setPaymentMethod("card");
                  handleCardPayment();
                }}
                className={`group p-5 sm:p-6 rounded-2xl border-2 transition-all cursor-pointer
                  ${paymentMethod === "card" ? "border-emerald-600 bg-brand-50 shadow-xl shadow-emerald-500/10" : "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md"}`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div
                    className={`p-3 sm:p-4 rounded-xl transition-colors ${paymentMethod === "card" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    <CreditCard size={24} className="sm:w-7 sm:h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-lg text-slate-900">
                      Card Payment
                    </h3>
                    <p className="text-[10px] sm:text-sm text-slate-500">
                      Visa, Mastercard, AMEX
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => {
                  setPaymentMethod("cod");
                  handleCOD();
                }}
                className={`group p-5 sm:p-6 rounded-2xl border-2 transition-all cursor-pointer
                  ${paymentMethod === "cod" ? "border-emerald-600 bg-brand-50 shadow-xl shadow-emerald-500/10" : "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md"}`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div
                    className={`p-3 sm:p-4 rounded-xl transition-colors ${paymentMethod === "cod" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    <Truck size={24} className="sm:w-7 sm:h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-lg text-slate-900">
                      Cash on Delivery
                    </h3>
                    <p className="text-[10px] sm:text-sm text-slate-500">
                      Pay at your doorstep
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Badge */}
            <div className="bg-white rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3 shadow-sm border border-slate-100">
              <ShieldCheck className="text-brand-600" size={18} />
              <div>
                <p className="font-bold text-slate-900 text-xs sm:text-sm">
                  100% Secure Payment
                </p>
                <p className="text-[9px] sm:text-xs text-slate-500">
                  Your information is encrypted and secure
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xl sticky top-4 sm:top-6 border border-slate-100">
              <h2 className="text-base sm:text-lg lg:text-xl font-black text-slate-900 mb-4 sm:mb-6 flex items-center gap-2">
                <Package className="text-brand-600" size={18} />
                Order Summary
              </h2>

              <div className="space-y-3 sm:space-y-4 max-h-[250px] sm:max-h-[300px] overflow-y-auto pr-2 custom-scrollbar mb-4 sm:mb-6">
                {items.map((item, idx) => {
                  const displayPrice =
                    item.sellingPrice ||
                    item.lastPrice ||
                    item.lastPrices ||
                    item.price ||
                    0;
                  const itemTotal = displayPrice * (item.qty || 1);
                  return (
                    <div
                      key={idx}
                      className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-100"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={
                            Array.isArray(item.images)
                              ? item.images[0]
                              : item.images
                          }
                          alt={item.productName}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                          onError={(e) => {
                            e.target.src =
                              "https://placehold.co/150?text=No+Image";
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-900">
                          {item.productName}
                        </h4>
                        <p className="text-[10px] sm:text-xs text-slate-400">
                          Rs. {displayPrice.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-brand-600">
                          Rs. {itemTotal.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Qty: {item.qty}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t border-slate-200">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-bold text-slate-900">
                    Rs. {subTotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Delivery Fee</span>
                  <span className="font-bold text-brand-600">
                    + Rs. {deliveryFee.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-base sm:text-lg pt-3 border-t border-slate-200">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="font-black text-xl sm:text-2xl text-brand-600">
                    Rs. {finalTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mt-5 sm:mt-6">
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div
                    className="bg-brand-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-400 text-center mt-2">
                  Completing your secure checkout
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        .checked-indicator { transition: all 0.2s; }
        input#codTerms:checked + .checked-indicator {
          background-color: #10b981;
          border-color: #10b981;
        }
      `}</style>
    </div>
  );
}
