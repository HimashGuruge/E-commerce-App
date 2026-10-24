import { useState, useEffect, useRef } from "react";
import { FiSave, FiUser, FiMapPin, FiCreditCard, FiShoppingBag, FiUpload, FiImage } from "react-icons/fi";
import api from "@/utils/api";
import Swal from "sweetalert2";
import uploadToMedia from "@/components/utils/Mediaupload";
import getApiError from "@/utils/errors";

export default function SellerSettings() {
  const [form, setForm] = useState({
    shopName: "", shopDescription: "", shopLogo: "", shopBanner: "",
    businessType: "individual", registrationNumber: "",
    ownerName: "", ownerPhone: "", ownerNic: "", ownerAddress: "",
    warehouseAddress: "", returnAddress: "",
    bankName: "", bankAccountTitle: "", bankAccountNo: "", bankBranch: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get("/api/sellers/me");
        if (data.success) {
          const s = data.seller;
          setForm({
            shopName: s.shopName || "", shopDescription: s.shopDescription || "",
            shopLogo: s.shopLogo || "", shopBanner: s.shopBanner || "",
            businessType: s.businessType || "individual", registrationNumber: s.registrationNumber || "",
            ownerName: s.ownerName || "", ownerPhone: s.ownerPhone || "",
            ownerNic: s.ownerNic || "", ownerAddress: s.ownerAddress || "",
            warehouseAddress: s.warehouseAddress || "", returnAddress: s.returnAddress || "",
            bankName: s.bankName || "", bankAccountTitle: s.bankAccountTitle || "",
            bankAccountNo: s.bankAccountNo || "", bankBranch: s.bankBranch || "",
          });
        }
      } catch (err) {
        console.error("Fetch settings error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((errs) => { const next = { ...errs }; delete next[field]; return next; });
  };

  const validateForm = () => {
    const errs = {};
    if (form.shopName.trim().length < 2) errs.shopName = "Shop name is required";
    if (form.shopDescription && form.shopDescription.length > 500) errs.shopDescription = "Description must be 500 characters or less";
    if (form.ownerPhone && !/^[0-9+\-\s]{7,15}$/.test(form.ownerPhone.trim())) errs.ownerPhone = "Enter a valid phone number (7-15 digits)";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Upload shop logo / banner image and store the returned URL on the form
  const handleImageUpload = async (field, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      Swal.fire({ icon: "error", title: "Invalid file", text: "Please choose an image file." });
      return;
    }
    const setUploading = field === "shopLogo" ? setLogoUploading : setBannerUploading;
    setUploading(true);
    try {
      const url = await uploadToMedia(file, "profile");
      if (!url) throw new Error("Upload failed");
      setForm((f) => ({ ...f, [field]: url }));
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Upload failed",
        text: err.response?.data?.error || err.message || "Could not upload the image. Try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      await api.put("/api/sellers/me", form);
      Swal.fire({ icon: "success", title: "Settings saved!", timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: "error", title: getApiError(err, "Failed to save settings") });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-shopprimary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-[26px] font-extrabold text-shoptext tracking-[-0.6px]">Shop Settings</h2>
        <p className="text-sm text-shopmuted mt-1.5">Manage your shop profile and account details</p>
      </div>

      <div className="bg-white rounded-[13px] border border-shopborder p-6 space-y-8">
        <section>
          <h3 className="flex items-center gap-2 text-lg font-bold text-shoptext mb-4">
            <FiShoppingBag className="w-5 h-5 text-shopprimary" /> Shop Info
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#3d4557] mb-1">Shop Name</label>
              <input type="text" value={form.shopName} onChange={(e) => update("shopName", e.target.value)}
                className="w-full px-4 py-2.5 border border-shopborder rounded-xl focus:border-shopprimary focus:ring-2 focus:ring-shopprimary/25 outline-none" />
              {errors.shopName && <p className="text-[11px] text-red-600 mt-1">{errors.shopName}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#3d4557] mb-1">Description</label>
              <textarea value={form.shopDescription} onChange={(e) => update("shopDescription", e.target.value)}
                rows={3} className="w-full px-4 py-2.5 border border-shopborder rounded-xl focus:border-shopprimary focus:ring-2 focus:ring-shopprimary/25 outline-none resize-none" />
              {errors.shopDescription && <p className="text-[11px] text-red-600 mt-1">{errors.shopDescription}</p>}
            </div>
            {/* Shop Logo */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#3d4557] mb-2">Shop Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#eef0f5] border border-shopborder flex items-center justify-center overflow-hidden flex-shrink-0">
                  {form.shopLogo ? (
                    <img src={form.shopLogo} alt="Shop logo" className="w-full h-full object-cover" />
                  ) : (
                    <FiImage className="w-6 h-6 text-[#a1a8b7]" />
                  )}
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-shopprimarylight text-shopprimary rounded-lg hover:bg-[#e0e7ff] disabled:opacity-50 transition-colors"
                  >
                    {logoUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-shopprimary border-t-transparent rounded-full animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <FiUpload className="w-4 h-4" />
                        Upload logo
                      </>
                    )}
                  </button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      handleImageUpload("shopLogo", e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#a1a8b7] flex-shrink-0">or paste URL:</span>
                    <input
                      type="text"
                      value={form.shopLogo}
                      onChange={(e) => update("shopLogo", e.target.value)}
                      placeholder="https://…"
                      className="flex-1 px-3 py-1.5 text-sm border border-shopborder rounded-lg focus:border-shopprimary focus:ring-2 focus:ring-shopprimary/25 outline-none min-w-0"
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* Shop Banner */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#3d4557] mb-2">Shop Banner</label>
              <div
                className={`w-full h-32 rounded-xl overflow-hidden border border-shopborder bg-[#eef0f5] ${
                  form.shopBanner ? "" : "flex items-center justify-center"
                }`}
              >
                {form.shopBanner ? (
                  <img src={form.shopBanner} alt="Shop banner" className="w-full h-full object-cover" />
                ) : (
                  <span className="flex items-center gap-2 text-sm text-[#a1a8b7]">
                    <FiImage className="w-5 h-5" /> No banner set
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={bannerUploading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-shopprimarylight text-shopprimary rounded-lg hover:bg-[#e0e7ff] disabled:opacity-50 transition-colors"
                >
                  {bannerUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-shopprimary border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FiUpload className="w-4 h-4" />
                      Upload banner
                    </>
                  )}
                </button>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleImageUpload("shopBanner", e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs text-[#a1a8b7] flex-shrink-0 sm:ml-2">or paste URL:</span>
                  <input
                    type="text"
                    value={form.shopBanner}
                    onChange={(e) => update("shopBanner", e.target.value)}
                    placeholder="https://…"
                    className="flex-1 px-3 py-1.5 text-sm border border-shopborder rounded-lg focus:border-shopprimary focus:ring-2 focus:ring-shopprimary/25 outline-none min-w-0"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="flex items-center gap-2 text-lg font-bold text-shoptext mb-4">
            <FiUser className="w-5 h-5 text-shopprimary" /> Owner Details
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3d4557] mb-1">Full Name</label>
              <input type="text" value={form.ownerName} onChange={(e) => update("ownerName", e.target.value)}
                className="w-full px-4 py-2.5 border border-shopborder rounded-xl focus:border-shopprimary focus:ring-2 focus:ring-shopprimary/25 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3d4557] mb-1">Phone</label>
              <input type="tel" value={form.ownerPhone} onChange={(e) => update("ownerPhone", e.target.value)}
                className="w-full px-4 py-2.5 border border-shopborder rounded-xl focus:border-shopprimary focus:ring-2 focus:ring-shopprimary/25 outline-none" />
              {errors.ownerPhone && <p className="text-[11px] text-red-600 mt-1">{errors.ownerPhone}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3d4557] mb-1">NIC</label>
              <input type="text" value={form.ownerNic} onChange={(e) => update("ownerNic", e.target.value)}
                className="w-full px-4 py-2.5 border border-shopborder rounded-xl focus:border-shopprimary focus:ring-2 focus:ring-shopprimary/25 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#3d4557] mb-1">Address</label>
              <textarea value={form.ownerAddress} onChange={(e) => update("ownerAddress", e.target.value)}
                rows={2} className="w-full px-4 py-2.5 border border-shopborder rounded-xl focus:border-shopprimary focus:ring-2 focus:ring-shopprimary/25 outline-none resize-none" />
            </div>
          </div>
        </section>

        <section>
          <h3 className="flex items-center gap-2 text-lg font-bold text-shoptext mb-4">
            <FiMapPin className="w-5 h-5 text-shopprimary" /> Addresses
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3d4557] mb-1">Warehouse/Pickup Address</label>
              <textarea value={form.warehouseAddress} onChange={(e) => update("warehouseAddress", e.target.value)}
                rows={2} className="w-full px-4 py-2.5 border border-shopborder rounded-xl focus:border-shopprimary focus:ring-2 focus:ring-shopprimary/25 outline-none resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3d4557] mb-1">Return Address</label>
              <textarea value={form.returnAddress} onChange={(e) => update("returnAddress", e.target.value)}
                rows={2} className="w-full px-4 py-2.5 border border-shopborder rounded-xl focus:border-shopprimary focus:ring-2 focus:ring-shopprimary/25 outline-none resize-none" />
            </div>
          </div>
        </section>

        <section>
          <h3 className="flex items-center gap-2 text-lg font-bold text-shoptext mb-4">
            <FiCreditCard className="w-5 h-5 text-shopprimary" /> Bank Details
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3d4557] mb-1">Bank Name</label>
              <input type="text" value={form.bankName} onChange={(e) => update("bankName", e.target.value)}
                className="w-full px-4 py-2.5 border border-shopborder rounded-xl focus:border-shopprimary focus:ring-2 focus:ring-shopprimary/25 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3d4557] mb-1">Branch</label>
              <input type="text" value={form.bankBranch} onChange={(e) => update("bankBranch", e.target.value)}
                className="w-full px-4 py-2.5 border border-shopborder rounded-xl focus:border-shopprimary focus:ring-2 focus:ring-shopprimary/25 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3d4557] mb-1">Account Title</label>
              <input type="text" value={form.bankAccountTitle} onChange={(e) => update("bankAccountTitle", e.target.value)}
                className="w-full px-4 py-2.5 border border-shopborder rounded-xl focus:border-shopprimary focus:ring-2 focus:ring-shopprimary/25 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3d4557] mb-1">Account Number</label>
              <input type="text" value={form.bankAccountNo} onChange={(e) => update("bankAccountNo", e.target.value)}
                className="w-full px-4 py-2.5 border border-shopborder rounded-xl focus:border-shopprimary focus:ring-2 focus:ring-shopprimary/25 outline-none" />
            </div>
          </div>
        </section>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-3 bg-shopprimary text-white rounded-xl hover:bg-[#4338ca] disabled:opacity-50 transition-all font-medium flex items-center justify-center gap-2"
        >
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
          ) : (
            <><FiSave className="w-4 h-4" /> Save Settings</>
          )}
        </button>
      </div>
    </div>
  );
}
