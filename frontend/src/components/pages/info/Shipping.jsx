import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "@/utils/api";
import { getPublicSettings } from "@/utils/siteSettings";
import {
  MapPin, Phone, Truck, CreditCard, ChevronRight,
  CheckCircle2, PlusCircle, Home, Package, Shield,
  Clock, ArrowLeft, User, Building, Mail, Heart,
  Star, Award, Gift, Zap, ShieldCheck, Info
} from "lucide-react";
import Swal from "sweetalert2";

export default function Shipping() {
  const location = useLocation();
  const orderData = location.state;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [addressMode, setAddressMode] = useState("saved");
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [newShippingInfo, setNewShippingInfo] = useState({ address: "", phone: "", city: "", customerName: "" });
  const [shippingSettings, setShippingSettings] = useState({
    standardCost: 350,
    freeThreshold: 10000,
  });

  useEffect(() => {
    const fetchShippingSettings = async () => {
      try {
        const settings = await getPublicSettings();
        if (settings?.shipping) {
          setShippingSettings({
            standardCost: settings.shipping.standardCost,
            freeThreshold: settings.shipping.freeThreshold,
          });
        }
      } catch (err) { console.error("Failed to load shipping settings:", err); }
    };
    fetchShippingSettings();
  }, []);

  useEffect(() => {
    const fetchUserCurrentDetails = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setAddressMode("new");
          setLoading(false);
          return;
        }

        // Fetch saved addresses from address API
        const addressRes = await api.get(`/api/addresses`);

        const userAddresses = addressRes.data || [];
        setSavedAddresses(userAddresses);

        if (userAddresses.length > 0) {
          setAddressMode("saved");
          const defaultAddress = userAddresses.find(a => a.isDefault) || userAddresses[0];
          setSelectedAddressId(defaultAddress._id);
        } else {
          // Fallback to profile address if no records in Address collection
          const userRes = await api.get(`/api/users/me`);

          if (userRes.data.success) {
            const user = userRes.data.user;
            const hasValidAddress = user.address && user.address !== "No address" && user.address.trim() !== "";
            const hasValidPhone = user.phone && user.phone !== "No phone Number" && user.phone.trim() !== "";

            if (hasValidAddress && hasValidPhone) {
              const fullName = `${user.name || ''} ${user.lastname || ''}`.trim() || user.name || '';
              const tempAddress = {
                _id: "temp_profile",
                name: fullName,
                phone: user.phone,
                addressLine1: user.address,
                city: user.city || "N/A",
                type: "Home",
                isDefault: true
              };
              setSavedAddresses([tempAddress]);
              setSelectedAddressId("temp_profile");
              setAddressMode("saved");
            } else {
              setAddressMode("new");
            }
          } else {
            setAddressMode("new");
          }
        }
      } catch (error) {
        console.error("Error fetching shipping details:", error);
        setAddressMode("new");
      } finally {
        setLoading(false);
      }
    };
    fetchUserCurrentDetails();
  }, []);

  const subTotal = orderData?.total || 0;
  const deliveryFee = subTotal >= shippingSettings.freeThreshold ? 0 : shippingSettings.standardCost;

  const handleProceed = () => {
    let finalData = {};

    if (addressMode === "saved") {
      const selected = savedAddresses.find(a => a._id === selectedAddressId);
      if (!selected) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Please select a saved address' });
        return;
      }
      finalData = {
        customerName: selected.name,
        phone: selected.phone,
        address: `${selected.addressLine1}${selected.addressLine2 ? ', ' + selected.addressLine2 : ''}`,
        city: selected.city
      };
    } else {
      finalData = newShippingInfo;
    }

    if (!finalData.address?.trim() || !finalData.phone?.trim() || !finalData.customerName?.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Information',
        text: 'Please fill in all required delivery details.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    const finalOrderData = {
      ...orderData,
      shippingAddress: { ...finalData },
      contactPhone: finalData.phone,
      deliveryFee,
      finalTotal: subTotal + deliveryFee,
    };

    navigate("/payment", { state: finalOrderData });
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FD] flex items-center justify-center">
      <div className="text-center">
        <div className="relative inline-block">
          <div className="w-24 h-24 border-4 border-brand-100 border-t-blue-600 rounded-full animate-spin"></div>
          <Package className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-brand-600" size={32} />
        </div>
        <h2 className="mt-8 font-black text-gray-800 text-2xl tracking-tight">Syncing Profile...</h2>
        <p className="text-gray-500 mt-2">Preparing your delivery options</p>
      </div>
    </div>
  );

  if (!orderData) return (
    <div className="min-h-screen bg-[#F8F9FD] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] p-12 text-center max-w-md shadow-2xl border border-gray-100">
        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
          <Package size={40} className="text-amber-500" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Cart is Empty</h2>
        <p className="text-gray-500 mb-8 font-medium">You need to add items to your cart before proceeding to shipping.</p>
        <button
          onClick={() => navigate("/")}
          className="w-full bg-brand-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-brand-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
        >
          Return to Store
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#F8F9FD] pb-20">
      {/* Dynamic Header */}
      <div className="relative bg-[#0F172A] pt-16 pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          {orderData?.orderedItems?.[0] && (
            <img
              src={Array.isArray(orderData.orderedItems[0].images) ? orderData.orderedItems[0].images[0] : (orderData.orderedItems[0].images || orderData.orderedItems[0].imageUrl)}
              alt=""
              className="w-full h-full object-cover object-center scale-105 opacity-70 transition-opacity duration-700"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/20 via-[#0F172A]/40 to-[#0F172A]"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-10 font-bold group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Back to Cart
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 transform -rotate-6">
                <Truck className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Shipping</h1>
                <p className="text-gray-400 font-medium mt-1">Configure your delivery destination</p>
              </div>
            </div>

            {/* Steps - Desktop Only */}
            <div className="hidden md:flex items-center gap-4 bg-white/5 backdrop-blur-md p-2 rounded-2xl border border-white/10">
                <div className="flex items-center gap-2 px-4 py-2 bg-brand-600 rounded-xl text-white">
                    <CheckCircle2 size={16} />
                    <span className="text-sm font-bold">Shipping</span>
                </div>
                <div className="w-8 h-[2px] bg-white/10"></div>
                <div className="flex items-center gap-2 px-4 py-2 text-white/40">
                    <CreditCard size={16} />
                    <span className="text-sm font-bold">Payment</span>
                </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-brand-600 rounded-full"></div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Delivery Address</h2>
                </div>
                <span className="text-xs font-black text-brand-600 bg-brand-50 px-3 py-1 rounded-full uppercase tracking-wider">Step 2 of 3</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* SAVED ADDRESSES LIST */}
                {savedAddresses.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Select from Saved Addresses</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {savedAddresses.map((addr) => (
                        <div
                          key={addr._id}
                          onClick={() => {
                            setAddressMode("saved");
                            setSelectedAddressId(addr._id);
                          }}
                          className={`relative p-5 rounded-[2rem] border-2 transition-all cursor-pointer group ${
                            addressMode === "saved" && selectedAddressId === addr._id
                            ? "border-brand-600 bg-brand-50/50 ring-4 ring-blue-50 text-brand-900"
                            : "border-gray-100 bg-gray-50/30 hover:border-gray-200 text-gray-700"
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl transition-colors ${
                              addressMode === "saved" && selectedAddressId === addr._id ? "bg-brand-600 text-white shadow-lg" : "bg-white text-gray-400 border border-gray-100"
                            }`}>
                              {addr.type === "Work" ? <Building size={18} /> : <Home size={18} />}
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-black uppercase tracking-tighter opacity-60">{addr.type}</span>
                                  {addressMode === "saved" && selectedAddressId === addr._id && <CheckCircle2 className="text-brand-600" size={16} />}
                               </div>
                               <p className="font-black truncate text-sm">{addr.name}</p>
                               <p className="text-xs font-medium line-clamp-2 mt-0.5 opacity-80">{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}, {addr.city}</p>
                               <div className="flex items-center gap-1.5 mt-2 opacity-60">
                                 <Phone size={14} />
                                 <span className="text-xs font-bold">{addr.phone}</span>
                               </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* NEW ADDRESS CARD */}
                <div
                  onClick={() => setAddressMode("new")}
                  className={`relative p-6 rounded-[2rem] border-2 transition-all cursor-pointer ${
                    addressMode === "new"
                    ? "border-brand-600 bg-brand-50/50 ring-4 ring-blue-50"
                    : "border-gray-100 bg-gray-50/30 hover:border-gray-200"
                  }`}
                >
                   <div className="flex items-start gap-5">
                      <div className={`p-4 rounded-2xl transition-colors ${
                        addressMode === "new" ? "bg-brand-600 text-white shadow-lg" : "bg-white text-gray-400"
                      }`}>
                        <PlusCircle size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-4">
                           <p className="text-xs font-black text-brand-600 uppercase tracking-widest">Ship to Different Location</p>
                           {addressMode === "new" && <CheckCircle2 className="text-brand-600" size={20} />}
                        </div>

                        {addressMode === "new" && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-400 uppercase ml-1">Recipient Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-brand-600 outline-none font-bold text-gray-700 transition-all"
                                        placeholder="Full Name"
                                        value={newShippingInfo.customerName}
                                        onChange={(e) => setNewShippingInfo({...newShippingInfo, customerName: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-400 uppercase ml-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-brand-600 outline-none font-bold text-gray-700 transition-all"
                                        placeholder="07X XXXXXXX"
                                        value={newShippingInfo.phone}
                                        onChange={(e) => setNewShippingInfo({...newShippingInfo, phone: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-400 uppercase ml-1">Shipping Address</label>
                                <textarea
                                    className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-brand-600 outline-none font-bold text-gray-700 transition-all resize-none"
                                    placeholder="House No, Street Name, Area"
                                    rows="3"
                                    value={newShippingInfo.address}
                                    onChange={(e) => setNewShippingInfo({...newShippingInfo, address: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-400 uppercase ml-1">City / Town</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-brand-600 outline-none font-bold text-gray-700 transition-all"
                                    placeholder="Colombo"
                                    value={newShippingInfo.city}
                                    onChange={(e) => setNewShippingInfo({...newShippingInfo, city: e.target.value})}
                                />
                            </div>
                          </div>
                        )}
                      </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: ShieldCheck, title: "Buyer Protection", color: "text-brand-600", bg: "bg-brand-50" },
                { icon: Clock, title: "Fast Delivery", color: "text-brand-600", bg: "bg-brand-50" },
                { icon: Award, title: "Quality Assured", color: "text-purple-600", bg: "bg-purple-50" }
              ].map((badge, i) => (
                <div key={i} className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center gap-4">
                  <div className={`w-12 h-12 ${badge.bg} ${badge.color} rounded-2xl flex items-center justify-center`}>
                    <badge.icon size={24} />
                  </div>
                  <span className="font-black text-gray-800 tracking-tight">{badge.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Sticky Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 lg:sticky lg:top-28 z-20 transition-all">
              <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <Package size={20} className="text-brand-600" />
                Order Summary
              </h2>

              <div className="space-y-4 mb-8 max-h-[320px] overflow-y-auto pt-2 scrollbar-hide">
                {orderData?.orderedItems?.map((item, idx) => (
                  <div key={idx} className="flex gap-4 group">
                    <div className="relative shrink-0">
                      <img
                        src={Array.isArray(item.images) ? item.images[0] : (item.images || item.imageUrl)}
                        className="w-16 h-16 rounded-2xl object-cover border border-gray-100 group-hover:scale-105 transition-transform"
                        alt="Product"
                      />
                      <span className="absolute -top-2 -right-2 bg-gray-900 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black z-10 shadow-sm ring-2 ring-white">
                        {item.qty}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-gray-800 truncate uppercase tracking-tighter">{item.productName}</p>
                      <p className="text-sm font-bold text-brand-600">Rs. {(item.sellingPrice || item.price).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 pt-6 border-t border-dashed border-gray-200">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-gray-400">Items Subtotal</span>
                  <span className="text-gray-900">Rs. {(orderData?.total || 0).toLocaleString()}</span>
                </div>
                 <div className="flex justify-between items-center text-sm font-bold">
                   <span className="text-gray-400">Delivery Fee</span>
                   <span className="text-brand-500">Rs. {deliveryFee.toLocaleString()}</span>
                 </div>

                 <div className="pt-4 mt-2 border-t-2 border-gray-900">
                   <div className="flex justify-between items-end">
                     <div>
                         <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Grand Total</p>
                         <p className="text-3xl font-black text-gray-900 tracking-tighter">
                             Rs. {((orderData?.total || 0) + deliveryFee).toLocaleString()}
                         </p>
                     </div>
                   </div>
                 </div>
              </div>

              <button
                onClick={handleProceed}
                className="w-full mt-8 py-5 bg-brand-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-brand-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98]"
              >
                Proceed to Payment
                <ChevronRight size={22} />
              </button>

              <div className="mt-6 flex items-center justify-center gap-3 px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100">
                <Shield size={16} className="text-brand-500" />
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">End-to-end encrypted</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `,
        }}
      />
    </div>
  );
}
