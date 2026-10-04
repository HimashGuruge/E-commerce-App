import { useState, useEffect } from "react";
import { FiSave, FiUser, FiMapPin, FiCreditCard, FiShoppingBag } from "react-icons/fi";
import api from "@/utils/api";
import Swal from "sweetalert2";

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

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.put("/api/sellers/me", form);
      Swal.fire({ icon: "success", title: "Settings saved!", timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: "error", title: err.response?.data?.error || "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Shop Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your shop profile and account details</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-8">
        <section>
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4">
            <FiShoppingBag className="w-5 h-5 text-brand-600" /> Shop Info
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Shop Name</label>
              <input type="text" value={form.shopName} onChange={(e) => update("shopName", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea value={form.shopDescription} onChange={(e) => update("shopDescription", e.target.value)}
                rows={3} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Logo URL</label>
              <input type="text" value={form.shopLogo} onChange={(e) => update("shopLogo", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Banner URL</label>
              <input type="text" value={form.shopBanner} onChange={(e) => update("shopBanner", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none" />
            </div>
          </div>
        </section>

        <section>
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4">
            <FiUser className="w-5 h-5 text-brand-600" /> Owner Details
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input type="text" value={form.ownerName} onChange={(e) => update("ownerName", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input type="tel" value={form.ownerPhone} onChange={(e) => update("ownerPhone", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">NIC</label>
              <input type="text" value={form.ownerNic} onChange={(e) => update("ownerNic", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <textarea value={form.ownerAddress} onChange={(e) => update("ownerAddress", e.target.value)}
                rows={2} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none resize-none" />
            </div>
          </div>
        </section>

        <section>
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4">
            <FiMapPin className="w-5 h-5 text-brand-600" /> Addresses
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Warehouse/Pickup Address</label>
              <textarea value={form.warehouseAddress} onChange={(e) => update("warehouseAddress", e.target.value)}
                rows={2} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Return Address</label>
              <textarea value={form.returnAddress} onChange={(e) => update("returnAddress", e.target.value)}
                rows={2} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none resize-none" />
            </div>
          </div>
        </section>

        <section>
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4">
            <FiCreditCard className="w-5 h-5 text-brand-600" /> Bank Details
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
              <input type="text" value={form.bankName} onChange={(e) => update("bankName", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
              <input type="text" value={form.bankBranch} onChange={(e) => update("bankBranch", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Title</label>
              <input type="text" value={form.bankAccountTitle} onChange={(e) => update("bankAccountTitle", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
              <input type="text" value={form.bankAccountNo} onChange={(e) => update("bankAccountNo", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none" />
            </div>
          </div>
        </section>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-all font-medium flex items-center justify-center gap-2"
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
