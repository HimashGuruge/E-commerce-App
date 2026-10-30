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

const DISTRICTS = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha",
  "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kilinochchi", "Kurunegala",
  "Mannar", "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya",
  "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya", "Kegalle",
];

const COLOMBO_AREAS = [
  "Colombo 01 - 03 (City Centre)",
  "Colombo 7 (Maradana)",
  "Colombo 8 (Rajagiriya)",
  "Avicenna",
  "Dematagoda",
  "Deans Corner",
  "Grange",
  "Mount Lavinia",
  "Nugegoda",
  "Pannala",
  "Piliyandala",
  "Thalawathugoda",
  "Thottuwa",
];

export default function Shipping() {
  const location = useLocation();
  const orderData = location.state;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [addressMode, setAddressMode] = useState("saved");
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [newShippingInfo, setNewShippingInfo] = useState({ address: "", phone: "", city: "", customerName: "" });
  const [saveToAccount, setSaveToAccount] = useState(true);
  const [makeDefault, setMakeDefault] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
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

        const userAddresses = addressRes.data?.addresses || addressRes.data?.data || [];
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
  const coupon = orderData?.coupon || null;
  const selectedAddress =
    addressMode === "saved"
      ? savedAddresses.find(a => a._id === selectedAddressId) || null
      : {
          name: newShippingInfo.customerName.trim() || "New Address",
          addressLine1: newShippingInfo.address.trim(),
          city: newShippingInfo.city.trim(),
          phone: newShippingInfo.phone.trim(),
          type: "Home",
        };
  const deliveryFee = coupon?.discountType === "freeshipping"
    ? 0
    : subTotal >= shippingSettings.freeThreshold
      ? 0
      : shippingSettings.standardCost;

  const handleProceed = async () => {
    const toast = (icon, title, text) =>
      Swal.fire({ icon, title, text, confirmButtonColor: '#2563eb' });

    // No active order (direct URL / refresh): still show the address page,
    // but block payment.
    if (!orderData) {
      toast('info', 'Your Cart is Empty', 'Please add items to your cart before proceeding to payment.');
      navigate("/viewcart");
      return;
    }

    let finalData = {};

    if (addressMode === "saved") {
      const selected = savedAddresses.find(a => a._id === selectedAddressId);
      if (!selected) {
        toast('error', 'No Address Selected', 'Please select a saved address or enter a new one below.');
        return;
      }
      finalData = {
        customerName: selected.name,
        phone: selected.phone,
        address: `${selected.addressLine1}${selected.addressLine2 ? ', ' + selected.addressLine2 : ''}`,
        city: selected.city
      };
    } else {
      finalData = { ...newShippingInfo };
      if (!finalData.address?.trim() || !finalData.phone?.trim() || !finalData.customerName?.trim()) {
        toast('error', 'Missing Information', 'Please fill in all required delivery details.');
        return;
      }

      // Save the newly entered address to the account on proceed
      const token = localStorage.getItem("token");
      if (saveToAccount && token) {
        setSavingAddress(true);
        try {
          const res = await api.post(`/api/addresses`, {
            name: finalData.customerName.trim(),
            phone: finalData.phone.trim(),
            addressLine1: finalData.address.trim(),
            city: finalData.city.trim(),
            type: "Home",
            isDefault: makeDefault,
          });
          const newAddress = res.data?.address;
          const refreshRes = await api.get(`/api/addresses`);
          const freshList = refreshRes.data?.addresses || refreshRes.data?.data || [];
          setSavedAddresses(freshList);
          if (newAddress?._id) {
            setAddressMode("saved");
            setSelectedAddressId(newAddress._id);
          }
          toast('success', 'Address Saved', 'Your new address has been saved to your account.');
        } catch (_err) {
          console.error("Failed to save address:", _err);
          toast('error', 'Save Failed', 'Could not save your address. You can still continue to payment.');
        } finally {
          setSavingAddress(false);
        }
      }
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
        {!orderData && (
          <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 mt-6">
            <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl shrink-0">
              <Info size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-gray-900">Your Cart is Empty</h3>
              <p className="text-sm text-gray-600 mt-1 font-medium">You still need to select a delivery address. Add items to your cart first, then continue to payment.</p>
            </div>
            <button
              onClick={() => navigate("/viewcart")}
              className="shrink-0 bg-brand-600 text-white px-5 py-3 rounded-xl font-black text-sm hover:bg-brand-700 transition-colors"
            >
              Go to Cart
            </button>
          </div>
        )}

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
                {/* NO SAVED ADDRESS REMINDER */}
                {savedAddresses.length === 0 && (
                  <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-5">
                    <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl shrink-0">
                      <Info size={20} />
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 text-sm">Add Your Delivery Address</h4>
                      <p className="text-sm text-gray-600 mt-1 font-medium">You don't have a saved address yet. Enter one below so we know where to ship your order.</p>
                    </div>
                  </div>
                )}

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
                                  {addressMode === "saved" && selectedAddressId === addr._id && (
                                   <span className="inline-flex items-center gap-1 bg-brand-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                                     <CheckCircle2 size={12} />
                                     Selected
                                   </span>
                                 )}
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
                                <label className="text-xs font-black text-gray-400 uppercase ml-1">District / City</label>
                                <select
                                    required
                                    className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-brand-600 outline-none font-bold text-gray-700 transition-all"
                                    value={newShippingInfo.city}
                                    onChange={(e) => setNewShippingInfo({...newShippingInfo, city: e.target.value})}
                                >
                                    <option value="" disabled>Select District / City</option>
                                    {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            {newShippingInfo.city === "Colombo" && (
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-400 uppercase ml-1">Colombo Area (optional)</label>
                                    <select
                                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-brand-600 outline-none font-bold text-gray-700 transition-all"
                                        value={newShippingInfo.city.startsWith("Colombo - ") ? newShippingInfo.city.slice("Colombo - ".length) : ""}
                                        onChange={(e) => setNewShippingInfo({...newShippingInfo, city: e.target.value ? `Colombo - ${e.target.value}` : "Colombo"})}
                                    >
                                        <option value="">City Centre (no area)</option>
                                        {COLOMBO_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="flex flex-col gap-3 pt-2">
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                    type="checkbox"
                                    checked={saveToAccount}
                                    onChange={(e) => setSaveToAccount(e.target.checked)}
                                    className="w-5 h-5 rounded-md border-gray-300 text-brand-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                                    />
                                    <span className="text-sm font-bold text-gray-700">Save my address to my account</span>
                                </label>
                                {saveToAccount && (
                                    <label className="flex items-center gap-3 cursor-pointer select-none pl-8">
                                        <input
                                            type="checkbox"
                                            checked={makeDefault}
                                            onChange={(e) => setMakeDefault(e.target.checked)}
                                            className="w-5 h-5 rounded-md border-gray-300 text-brand-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                                        />
                                        <span className="text-sm font-bold text-gray-700">Set as my default address</span>
                                    </label>
                                )}
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

              
              <div className="px-4 py-3 bg-brand-50 border border-brand-100 rounded-2xl mb-6">
                <p className="text-[11px] font-black text-brand-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <MapPin size={13} />
                  Delivery to
                </p>
                {selectedAddress && (selectedAddress.addressLine1 || selectedAddress.city || selectedAddress.phone) ? (
                  <div className="space-y-1 text-sm text-gray-800">
                    <p className="font-black">{selectedAddress.name}</p>
                    {(selectedAddress.addressLine1 || selectedAddress.city) && (
                      <p className="font-medium text-gray-600">
                        {selectedAddress.addressLine1}{selectedAddress.city ? `, ${selectedAddress.city}` : ''}
                      </p>
                    )}
                    {selectedAddress.phone && (
                      <p className="font-bold text-gray-700 flex items-center gap-1.5"><Phone size={13} />{selectedAddress.phone}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-gray-500">No address selected yet</p>
                )}
              </div>

              <div className="space-y-4 pt-6 border-t border-dashed border-gray-200">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-gray-400">Items Subtotal</span>
                  <span className="text-gray-900">Rs. {(orderData?.total || 0).toLocaleString()}</span>
                </div>
                {coupon && (
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-brand-600 flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4V9z"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/></svg>
                      Coupon ({coupon.code})
                    </span>
                    <span className="text-brand-600">-Rs. {(coupon.discountAmount || 0).toLocaleString()}</span>
                  </div>
                )}
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
                disabled={savingAddress}
                className="w-full mt-8 py-5 bg-brand-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-brand-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {savingAddress ? 'Saving…' : 'Proceed to Payment'}
                {!savingAddress && <ChevronRight size={22} />}
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
