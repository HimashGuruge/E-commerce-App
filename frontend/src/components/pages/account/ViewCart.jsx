import React, { useEffect, useState, useCallback, useRef } from "react";
import { loadCart, deleteItem, updateItemQty, saveCart } from "@/components/utils/Cart";
import api from "@/utils/api";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import {
  Trash2,
  ShoppingBag,
  AlertCircle,
  CreditCard,
  Minus,
  Plus,
  Truck,
  Info,
  Tag
} from "lucide-react";

const initialQuoteState = {
  orderedItems: [],
  total: 0,
  labeledTotal: 0,
  discount: 0,
  shipping: 0,
  coupon: null,
  couponError: null,
  message: "Calculating prices...",
};

function normalizeCartItem(item) {
  return {
    ...item,
    productId: String(item.productId),
    qty: Number(item.qty) || 1,
    stock: Number(item.stock) || 0,
    price: Number(item.price) || 0,
    sellingPrice: Number(item.sellingPrice) || Number(item.price) || 0,
    productName: item.productName || "Unknown Product",
    images: item.images || (item.image ? [item.image] : []),
  };
}

export default function ViewCart() {
  const [quoteData, setQuoteData] = useState(initialQuoteState);
  const [loading, setLoading] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const quoteFetchRef = useRef(null);

  const appliedCoupon = useRef("");

  const fetchQuote = useCallback(async (currentToken, code) => {
    const cart = loadCart();
    if (!cart.length) {
      setQuoteData({ ...initialQuoteState, message: "Your cart is empty." });
      return;
    }

    setLoading(true);
    try {
      const normalizedItems = cart.map((item) => ({
        productId: item.productId,
        qty: item.qty,
      }));

      const query = { orderedItems: normalizedItems };
      const activeCode =
        code !== undefined ? code : appliedCoupon.current;
      if (activeCode) query.couponCode = activeCode;

      const { data } = await api.post("/api/orders/quote", query);

      if (data && data.orderedItems) {
        setQuoteData({
          orderedItems: data.orderedItems,
          total: data.total || 0,
          labeledTotal: data.labeledTotal || 0,
          discount: data.discount || 0,
          shipping: data.shipping || 0,
          coupon: data.coupon || null,
          couponError: data.couponError || null,
          message: data.message || "",
        });
      } else {
        setQuoteData({
          orderedItems: cart.map(normalizeCartItem),
          total: 0,
          labeledTotal: 0,
          discount: 0,
          shipping: 0,
          coupon: null,
          couponError: null,
          message: "Price calculation pending...",
        });
      }
    } catch (error) {
      setQuoteData({
        orderedItems: cart.map(normalizeCartItem),
        total: 0,
        labeledTotal: 0,
        discount: 0,
        shipping: 0,
        coupon: null,
        couponError: null,
        message: error.response?.data?.message || "Failed to fetch prices. Using local cart data.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleApplyCoupon = async () => {
    const code = (couponInput || "").trim().toUpperCase();
    if (!code || !token) return;
    appliedCoupon.current = code;
    setCouponApplying(true);
    try {
      const cart = loadCart();
      const normalizedItems = cart.map((item) => ({
        productId: item.productId,
        qty: item.qty,
      }));
      const { data } = await api.post("/api/orders/quote", {
        orderedItems: normalizedItems,
        couponCode: code,
      });
      if (data && data.orderedItems) {
        setQuoteData({
          orderedItems: data.orderedItems,
          total: data.total || 0,
          labeledTotal: data.labeledTotal || 0,
          discount: data.discount || 0,
          shipping: data.shipping || 0,
          coupon: data.coupon || null,
          couponError: data.couponError || null,
          message: data.message || "",
        });
      } else if (data?.couponError) {
        appliedCoupon.current = "";
        setQuoteData((prev) => ({ ...prev, coupon: null, couponError: data.couponError }));
      }
    } catch (error) {
      appliedCoupon.current = "";
      setQuoteData((prev) => ({
        ...prev,
        coupon: null,
        couponError: error.response?.data?.message || "Could not apply coupon",
      }));
    } finally {
      setCouponApplying(false);
    }
  };

  const handleRemoveCoupon = () => {
    appliedCoupon.current = "";
    setQuoteData((prev) => ({ ...prev, coupon: null, couponError: null }));
    fetchQuote(token);
  };

  const validateCartStock = useCallback(async () => {
    const cart = loadCart();
    if (!cart.length || !token) return;

    const productIds = [...new Set(cart.map((item) => item.productId))];
    try {
      const { data } = await api.post("/api/products/batch-stock-check", { productIds });

      if (!data.success) return;

      let needsUpdate = false;
      const updatedCart = cart.map((item) => {
        const stockInfo = data.stockData.find(
          (s) => String(s.productId) === String(item.productId)
        );
        if (!stockInfo) return item;

        let updated = { ...item, stock: stockInfo.stock };
        if (item.stock !== stockInfo.stock) {
          needsUpdate = true;
        }
        if (item.qty > stockInfo.stock) {
          updated.qty = Math.max(0, stockInfo.stock);
          needsUpdate = true;
        }
        return updated;
      });

      if (data.missing && data.missing.length > 0) {
        const missingIds = new Set(data.missing.map(String));
        const filteredCart = updatedCart.filter(
          (item) => !missingIds.has(String(item.productId))
        );
        if (filteredCart.length !== updatedCart.length) {
          needsUpdate = true;
          saveCart(filteredCart);
          Swal.fire({
            icon: "info",
            title: "Items Removed",
            text: `${data.missing.length} product(s) no longer available and removed from cart.`,
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 3000,
          });
        }
      }

      if (needsUpdate) {
        saveCart(updatedCart);
        quoteFetchRef.current?.();
        Swal.fire({
          icon: "info",
          title: "Cart Updated",
          text: "Some items were updated due to stock changes.",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
        });
      }
    } catch (error) {
      console.error("Batch stock check error:", error);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setQuoteData({ ...initialQuoteState, message: "Please log in to view your cart." });
      return;
    }

    const init = async () => {
      setMounted(true);
      await validateCartStock();
      quoteFetchRef.current = fetchQuote;
      await fetchQuote(token);
    };
    init();
  }, [token, fetchQuote, validateCartStock]);

  const handleQtyChange = async (productId, currentQty, change, maxStock, variantSku) => {
    const newQty = currentQty + change;
    if (newQty < 1 || newQty > maxStock) {
      if (newQty > maxStock) {
        Swal.fire({
          icon: "info",
          title: "Maximum Quantity Reached",
          text: `Only ${maxStock} items available in stock.`,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 2000,
        });
      }
      return;
    }

    updateItemQty(productId, newQty, maxStock, variantSku);

    setQuoteData((prev) => ({
      ...prev,
      orderedItems: prev.orderedItems.map((item) =>
        String(item.productId) === String(productId) && (!variantSku || item.variantSku === variantSku) ? { ...item, qty: newQty } : item
      ),
    }));

    if (token) fetchQuote(token);
  };

  const handleDelete = (productId, productName, variantSku) => {
    Swal.fire({
      title: "Remove Item?",
      text: `Do you want to remove "${productName}" from cart?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, remove",
    }).then((result) => {
      if (result.isConfirmed) {
        deleteItem(productId, variantSku);
        const updatedCart = loadCart();
        if (updatedCart.length === 0) {
          setQuoteData({ ...initialQuoteState, message: "Your cart is empty." });
        } else if (token) {
          fetchQuote(token);
        }
      }
    });
  };

  const handleCheckout = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    const exceedingStockItems = quoteData.orderedItems.filter((item) => item.qty > item.stock);
    if (exceedingStockItems.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "Quantity Exceeds Stock",
        html: `
          <div class="text-left">
            <p class="mb-3">Some items exceed available stock:</p>
            ${exceedingStockItems.map((item) => `
              <div class="flex justify-between items-center bg-red-50 p-2 rounded-lg mb-2">
                <span class="font-bold">${item.productName}</span>
                <span class="text-red-600">Requested: ${item.qty} / Available: ${item.stock}</span>
              </div>
            `).join("")}
            <p class="mt-3 text-sm">Please adjust quantities before checkout.</p>
          </div>
        `,
        confirmButtonColor: "#f59e0b",
      });
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/api/orders/verify-stock", {
        orderedItems: quoteData.orderedItems.map((item) => ({
          productId: item.productId,
          qty: item.qty,
        })),
      });

      if (data.success) {
        const finalTotal = quoteData.total + quoteData.shipping;

        Swal.fire({
          title: "Confirm Checkout",
          html: `
            <div class="text-left text-sm p-4 bg-gray-50 rounded-2xl border border-gray-100">
                ${quoteData.labeledTotal > quoteData.total ? `<div class="flex justify-between mb-1 text-gray-400"><span>Original Total:</span> <span class="line-through">Rs. ${quoteData.labeledTotal.toLocaleString()}</span></div>` : ""}
                <div class="flex justify-between mb-2 text-gray-600 font-medium"><span>Items Subtotal:</span> <span>Rs. ${quoteData.total.toLocaleString()}</span></div>
                ${quoteData.discount > 0 ? `<div class="flex justify-between text-brand-600 font-medium mb-2"><span>Savings:</span> <span>-Rs. ${quoteData.discount.toLocaleString()}</span></div>` : ""}
                ${quoteData.coupon ? `<div class="flex justify-between text-brand-600 font-medium mb-2"><span>Coupon (${quoteData.coupon.code}):</span> <span>-Rs. ${(quoteData.coupon.discountAmount || 0).toLocaleString()}</span></div>` : ""}
                <div class="flex justify-between text-brand-600 font-medium"><span>Delivery Charge:</span> <span>${quoteData.shipping === 0 ? "FREE" : `Rs. ${quoteData.shipping.toLocaleString()}`}</span></div>
                <hr class="my-3 border-gray-200" />
                <div class="flex justify-between text-lg font-black text-slate-900"><span>Grand Total:</span> <span>Rs. ${finalTotal.toLocaleString()}</span></div>
            </div>
          `,
          icon: "question",
          showCancelButton: true,
          confirmButtonColor: "#10b981",
          confirmButtonText: "Secure Checkout",
        }).then((result) => {
          if (result.isConfirmed) {
            navigate("/shipping/", {
              state: { ...quoteData, finalTotal },
            });
          }
        });
      } else {
        const issueMessages = data.stockIssues
          .map((issue) => {
            const item = quoteData.orderedItems.find(
              (i) => String(i.productId) === String(issue.productId)
            );
            return `${item?.productName || "Item"}: ${issue.available} available`;
          })
          .join("\n");

        Swal.fire({
          icon: "error",
          title: "Stock Error",
          html: `<p class="text-left">${issueMessages}</p>`,
        });
        fetchQuote(token);
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.message || "Failed to verify stock",
      });
      fetchQuote(token);
    } finally {
      setLoading(false);
    }
  };

  const { orderedItems, total, labeledTotal, discount, shipping, message, coupon, couponError } = quoteData;
  const finalTotalDisplay = total > 0 ? total + (shipping || 0) : 0;

  return (
    <div className="min-h-screen bg-gray-50/50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-amber-500 p-3 rounded-2xl shadow-lg shadow-amber-100">
              <ShoppingBag className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900">Your Cart</h1>
          </div>
          <span className="text-gray-400 font-bold">{orderedItems.length} Items</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            {message && (
              <div className="p-4 bg-white border-l-4 border-amber-500 rounded-xl shadow-sm flex items-center text-amber-700 font-medium">
                <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                <span className="flex-1">{message}</span>
                {!token && (
                  <button
                    onClick={() => navigate("/login")}
                    className="ml-4 flex-shrink-0 px-4 py-1.5 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
                  >
                    Log In
                  </button>
                )}
              </div>
            )}

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              {orderedItems.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {orderedItems.map((item) => {
                    const originalPrice = item.price || 0;
                    const sellingPrice = item.sellingPrice || item.price || 0;
                    const discountPerUnit = item.discount || 0;
                    const isExceedingStock = item.qty > item.stock;

                    return (
                      <div
                        key={item.productId}
                        className={`p-8 flex flex-col md:flex-row items-center gap-8 hover:bg-gray-50/50 transition-all ${isExceedingStock ? "bg-red-50/30" : ""}`}
                      >
                        <div className="relative w-28 h-28 flex-shrink-0">
                          <img
                            src={
                              item.images && Array.isArray(item.images) && item.images[0]
                                ? item.images[0]
                                : "https://placehold.co/150"
                            }
                            className="w-full h-full object-cover rounded-2xl border shadow-sm"
                            alt={item.productName}
                            onError={(e) => {
                              e.target.src = "https://placehold.co/150";
                              e.target.onerror = null;
                            }}
                          />
                          {isExceedingStock && (
                            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-lg animate-bounce">
                              STOCK ALERT
                            </span>
                          )}
                        </div>

                        <div className="flex-1 text-center md:text-left">
                          <h3 className="text-xl font-bold text-slate-800 mb-1">
                            {item.productName}
                          </h3>

                          {isExceedingStock ? (
                            <p className="text-red-500 text-xs font-black flex items-center gap-1 mb-2">
                              <AlertCircle size={14} /> Only {item.stock} left. Please reduce
                              quantity!
                            </p>
                          ) : (
                            <div className="flex items-center gap-2 mb-2">
                              <p className="text-brand-500 text-[10px] font-bold uppercase tracking-widest">
                                In Stock: {item.stock}
                              </p>
                              {item.qty === item.stock && item.stock > 0 && (
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                                  Max
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                            {originalPrice > sellingPrice && (
                              <span className="text-gray-400 line-through text-sm font-medium">
                                Rs. {originalPrice.toLocaleString()}
                              </span>
                            )}
                            <span className="text-brand-600 font-black text-xl">
                              Rs. {sellingPrice.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center justify-center md:justify-start gap-6 mt-4">
                            <div
                              className={`flex items-center border-2 rounded-xl p-1 bg-white ${isExceedingStock ? "border-red-200" : "border-slate-100"}`}
                            >
                              <button
                                onClick={() =>
                                  handleQtyChange(item.productId, item.qty, -1, item.stock, item.variantSku)
                                }
                                disabled={item.qty <= 1}
                                className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                              >
                                <Minus size={18} />
                              </button>

                              <span
                                className={`px-5 font-black ${isExceedingStock ? "text-red-600" : "text-slate-700"}`}
                              >
                                {item.qty}
                              </span>

                              <button
                                disabled={item.qty >= item.stock}
                                onClick={() =>
                                  handleQtyChange(item.productId, item.qty, 1, item.stock, item.variantSku)
                                }
                                className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                              >
                                <Plus size={18} />
                              </button>
                            </div>

                            {item.qty >= item.stock && item.stock > 0 && (
                              <span className="text-[10px] text-amber-600 font-bold">
                                Max reached
                              </span>
                            )}

                            <button
                              onClick={() => handleDelete(item.productId, item.productName, item.variantSku)}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={22} />
                            </button>
                          </div>
                        </div>

                        <div className="text-right hidden md:block min-w-[140px]">
                          <p className="text-xl font-black text-slate-900">
                            Rs. {(sellingPrice * item.qty).toLocaleString()}
                          </p>
                          {discountPerUnit > 0 && (
                            <div className="flex flex-col items-end gap-1 mt-1">
                              <span className="text-[10px] text-gray-400 line-through font-bold">
                                Rs. {(originalPrice * item.qty).toLocaleString()}
                              </span>
                              <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-lg font-bold">
                                Saved Rs. {(discountPerUnit * item.qty).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-24 text-center">
                  <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingBag className="h-10 w-10 text-slate-200" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Your cart is empty</h3>
                  <button
                    onClick={() => navigate("/")}
                    className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black"
                  >
                    Start Shopping
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-50 sticky top-10">
              <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                Summary <Info size={18} className="text-slate-300" />
              </h2>

              <div className="space-y-5 text-slate-500 border-b border-dashed border-slate-100 pb-8 mb-8">
                {labeledTotal > total && (
                  <div className="flex justify-between font-medium">
                    <span className="flex items-center gap-2">
                      <Tag size={16} className="text-gray-400" /> Original Total
                    </span>
                    <span className="text-gray-400 line-through font-mono">
                      Rs. {labeledTotal.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex justify-between font-medium">
                  <span>Subtotal</span>
                  <span className="text-slate-800 font-bold font-mono">
                    Rs. {total.toLocaleString()}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between font-medium text-brand-500 bg-brand-50/50 p-3 rounded-xl border border-brand-100/50">
                    <span className="font-bold">Total Savings</span>
                    <span className="font-black">- Rs. {discount.toLocaleString()}</span>
                  </div>
                )}

                {orderedItems.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                      Coupon
                    </p>
                    {coupon ? (
                      <div className="flex items-center justify-between bg-brand-50/60 p-3 rounded-xl border border-brand-100/60">
                        <span className="text-sm font-bold text-brand-600 flex items-center gap-2">
                          <Tag size={15} /> {coupon.code}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-brand-600 font-mono">
                            -Rs. {(coupon.discountAmount || 0).toLocaleString()}
                          </span>
                          <button
                            onClick={handleRemoveCoupon}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                            title="Remove coupon"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponInput}
                            onChange={(e) =>
                              setCouponInput(e.target.value.toUpperCase())
                            }
                            onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                            placeholder="Enter code (e.g. SAVE10)"
                            maxLength={30}
                            disabled={couponApplying}
                            className="flex-1 min-w-0 px-3 py-2.5 border border-slate-200 rounded-xl text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50"
                          />
                          <button
                            onClick={handleApplyCoupon}
                            disabled={couponApplying || !couponInput.trim()}
                            className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors"
                          >
                            {couponApplying ? "Applying..." : "Apply"}
                          </button>
                        </div>
                        {couponError && (
                          <p className="text-xs font-bold text-red-500 mt-2">
                            {couponError}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                    <Truck size={18} className="text-brand-500" /> Delivery Fee
                  </span>
                  <span className="text-slate-900 font-black font-mono">
                    {shipping === 0 ? "FREE" : `Rs. ${(shipping || 0).toLocaleString()}`}
                  </span>
                </div>
              </div>

              <div className="mb-10">
                <p className="text-xs font-black text-slate-300 uppercase tracking-widest">
                  Final Grand Total
                </p>
                <span className="text-3xl font-black text-slate-900 font-mono">
                  Rs. {finalTotalDisplay.toLocaleString()}
                </span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={
                  loading ||
                  total <= 0 ||
                  orderedItems.some((item) => item.qty > item.stock)
                }
                className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 uppercase disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {loading
                  ? "Syncing..."
                  : orderedItems.some((item) => item.qty > item.stock)
                    ? "Fix Quantities"
                    : "Secure Checkout"}
              </button>

              {orderedItems.some((item) => item.qty > item.stock) && (
                <p className="text-red-500 text-[10px] font-bold text-center mt-3 uppercase tracking-tighter italic">
                  Please reduce quantities to proceed
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
