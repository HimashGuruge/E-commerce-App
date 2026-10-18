import React, { useState, useEffect } from "react";
import api from "@/utils/api";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSearch, FiTag } from "react-icons/fi";

const emptyForm = {
  code: "",
  description: "",
  discountType: "percent",
  discountValue: "",
  maxDiscountAmount: "",
  minOrderAmount: "",
  maxUses: "",
  expiresAt: "",
  active: true,
};

export default function CouponManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [apiError, setApiError] = useState("");

  const fetchItems = async () => {
    setLoading(true);
    setApiError("");
    try {
      const res = await api.get("/api/coupons", {
        params: search.trim() ? { search: search.trim() } : undefined,
      });
      setItems(res.data?.coupons || []);
    } catch (err) {
      setApiError(err.response?.data?.error || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchItems(), 300);
    return () => clearTimeout(t);
  }, [search]);

  const toLocalInput = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const buildPayload = () => ({
    code: formData.code.trim().toUpperCase(),
    description: formData.description.trim(),
    discountType: formData.discountType,
    discountValue:
      formData.discountType === "freeshipping"
        ? 0
        : Number(formData.discountValue) || 0,
    maxDiscountAmount: Number(formData.maxDiscountAmount) || 0,
    minOrderAmount: Number(formData.minOrderAmount) || 0,
    maxUses: Number(formData.maxUses) || 0,
    expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : null,
    active: formData.active,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = buildPayload();
      if (editingId) {
        await api.put(`/api/coupons/${editingId}`, payload);
      } else {
        await api.post("/api/coupons", payload);
      }
      setShowModal(false);
      setFormData(emptyForm);
      setEditingId(null);
      fetchItems();
    } catch (err) {
      setApiError(err.response?.data?.error || "Failed to save coupon");
    }
  };

  const handleEdit = (item) => {
    setFormData({
      code: item.code,
      description: item.description || "",
      discountType: item.discountType,
      discountValue: item.discountValue ?? "",
      maxDiscountAmount: item.maxDiscountAmount || "",
      minOrderAmount: item.minOrderAmount || "",
      maxUses: item.maxUses || "",
      expiresAt: toLocalInput(item.expiresAt),
      active: item.active,
    });
    setEditingId(item._id);
    setApiError("");
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this coupon? Orders that already used it keep their discount.")) return;
    try {
      await api.delete(`/api/coupons/${id}`);
      fetchItems();
    } catch (err) {
      setApiError(err.response?.data?.error || "Failed to delete coupon");
    }
  };

  const handleToggle = async (item) => {
    try {
      await api.patch(`/api/coupons/${item._id}/toggle`, { active: !item.active });
      fetchItems();
    } catch (err) {
      setApiError(err.response?.data?.error || "Failed to toggle coupon");
    }
  };

  const typeLabel = (item) => {
    if (item.discountType === "percent") {
      const cap = item.maxDiscountAmount > 0 ? ` (max Rs. ${item.maxDiscountAmount.toLocaleString()})` : "";
      return `${item.discountValue}%${cap}`;
    }
    if (item.discountType === "fixed") {
      const cap =
        item.maxDiscountAmount > 0 && item.maxDiscountAmount < item.discountValue
          ? ` (capped at Rs. ${item.maxDiscountAmount.toLocaleString()})`
          : "";
      return `Rs. ${Number(item.discountValue).toLocaleString()}${cap}`;
    }
    return "Free shipping";
  };

  const isExpired = (item) => item.expiresAt && new Date(item.expiresAt) < new Date();

  const statusColors = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-slate-100 text-slate-500",
    expired: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Coupon Management</h1>
          <p className="text-slate-500 text-sm">Manage discount codes and vouchers for checkout</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData(emptyForm);
            setApiError("");
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <FiPlus size={18} />
          Add Coupon
        </button>
      </div>

      {apiError && (
        <div className="px-4 py-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
          {apiError}
        </div>
      )}

      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search by code..."
          value={search}
          onChange={(e) => setSearch(e.target.value.toUpperCase())}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Discount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Min Order</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Uses</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Expires</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="h-4 w-16 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-8 w-16 bg-slate-100 rounded ml-auto animate-pulse" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-slate-400">No coupons found</td>
                </tr>
              ) : (
                items.map((item) => {
                  const status = isExpired(item) ? "expired" : item.active ? "active" : "inactive";
                  return (
                    <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-slate-800">
                          <FiTag size={14} className="text-brand-600" />
                          {item.code}
                        </span>
                        {item.description && (
                          <p className="text-xs text-slate-400 mt-0.5 max-w-[220px] truncate">{item.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-brand-600">{typeLabel(item)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-500">
                          {item.minOrderAmount > 0 ? `Rs. ${item.minOrderAmount.toLocaleString()}` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-500">
                          {item.maxUses > 0
                            ? `${item.usedCount} / ${item.maxUses}`
                            : `${item.usedCount}∞`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${isExpired(item) ? "text-amber-600" : "text-slate-500"}`}>
                          {item.expiresAt ? new Date(item.expiresAt).toLocaleString() : "Never"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggle(item)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}
                        >
                          {status}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(item)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                            <FiEdit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(item._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">{editingId ? "Edit Coupon" : "Add Coupon"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SAVE10"
                  disabled={Boolean(editingId)}
                  maxLength={30}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
                />
                <p className="text-xs text-slate-400 mt-1">3-30 characters: A-Z, 0-9, _ or -</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Internal note about this coupon"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="percent">Percentage</option>
                    <option value="fixed">Fixed amount</option>
                    <option value="freeshipping">Free shipping</option>
                  </select>
                </div>
                {formData.discountType !== "freeshipping" ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {formData.discountType === "percent" ? "Value (%)" : "Value (Rs.)"}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={formData.discountType === "percent" ? 100 : undefined}
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                      placeholder={formData.discountType === "percent" ? "e.g. 10" : "e.g. 500"}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Shipping waiver <span className="text-slate-400 font-normal">(auto)</span>
                    </label>
                    <div className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500">
                      Waives the delivery fee
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Min order (Rs.)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Max uses
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    placeholder="0 = unlimited"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              {formData.discountType === "percent" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Max discount (Rs.)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.maxDiscountAmount}
                    onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                    placeholder="0 = no cap"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Expires <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                <select
                  value={formData.active ? "true" : "false"}
                  onChange={(e) => setFormData({ ...formData, active: e.target.value === "true" })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors">
                  {editingId ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
