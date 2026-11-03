import React, { useState, useEffect } from "react";
import api from "@/utils/api";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSearch, FiTag, FiInfo, FiChevronDown, FiChevronUp } from "react-icons/fi";

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
  const [showGuide, setShowGuide] = useState(false);

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

  // Slim status: dot + colored text (clickable, same as before)
  const statusStyles = {
    active: { dot: "bg-emerald-500", text: "text-emerald-700" },
    inactive: { dot: "bg-slate-400", text: "text-slate-500" },
    expired: { dot: "bg-amber-500", text: "text-amber-700" },
  };

  const inputClass =
    "w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/15";
  const labelClass = "block text-xs font-semibold text-slate-600 mb-1";

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header — compact */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Coupons</h1>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.14em] truncate">
              {items.length} codes
            </p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData(emptyForm);
              setApiError("");
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm font-medium transition-colors"
          >
            <FiPlus size={15} />
            Add Coupon
          </button>
        </div>

        {/* Quick guide — slim collapsed bar */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowGuide((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100/70 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FiInfo size={15} className="text-slate-400" />
              How to use this page (quick guide)
            </span>
            {showGuide ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>
          {showGuide && (
            <div className="px-4 pb-4 text-[13px] text-slate-600 space-y-3">
              <div>
                <p className="font-semibold text-slate-800 mb-1">Where do customers enter coupons?</p>
                <p className="leading-relaxed">
                  In the <strong>View Cart</strong> page — there's a "Coupon" box with an Apply button.
                  They can also enter a code at checkout. Codes are case-insensitive (a customer can
                  type <code className="font-mono bg-slate-100 px-1 rounded">save10</code> and it still matches <code className="font-mono bg-slate-100 px-1 rounded">SAVE10</code>).
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-800 mb-1">How to create your first coupon (5 steps)</p>
                <ol className="list-decimal list-inside space-y-1 leading-relaxed">
                  <li>Click <strong>Add Coupon</strong> (top-right).</li>
                  <li>Enter a <strong>Code</strong> — short and memorable, e.g. <code className="font-mono bg-slate-100 px-1 rounded">SAVE10</code>.</li>
                  <li>Pick the <strong>Type</strong>: percentage off, fixed amount off, or free shipping — then set the value.</li>
                  <li>Set the rules: <strong>Min order</strong> (cart must be at least this much), <strong>Max uses</strong> (0 = unlimited), and an optional <strong>expiry</strong>.</li>
                  <li>Click <strong>Add</strong>. The coupon is live immediately — test it from a customer cart.</li>
                </ol>
              </div>
              <div>
                <p className="font-semibold text-slate-800 mb-1">Understanding the table columns</p>
                <ul className="list-disc list-inside space-y-1 leading-relaxed">
                  <li><strong>Code</strong> — the code customers type; the line under it is your private note (customers never see it).</li>
                  <li><strong>Discount</strong> — what the coupon does (e.g. "10% (max Rs. 500)" or "Rs. 500").</li>
                  <li><strong>Min order</strong> — minimum cart value required to use it; "—" means no minimum.</li>
                  <li><strong>Uses</strong> — how many times it's been used vs. the limit (e.g. 3 / 50). "∞" = unlimited.</li>
                  <li><strong>Expires</strong> — when it stops working (or "Never").</li>
                  <li><strong>Status</strong> — <strong>active</strong> works now, <strong>inactive</strong> is switched off by you, <strong>expired</strong> ran out of time. Click it to turn the coupon on/off.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-800 mb-1">Important things to know</p>
                <ul className="list-disc list-inside space-y-1 leading-relaxed">
                  <li>Percentage coupons: set <strong>Max discount</strong> to cap the discount (e.g. 20% off but never more than Rs. 1,000). Leave 0 for no cap.</li>
                  <li><strong>Free shipping</strong> coupons: they remove the delivery fee; no discount value is needed.</li>
                  <li>Deleting a coupon does <em>not</em> change orders that already used it.</li>
                  <li>Coupons only apply to logged-in customers, and only one coupon per order.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {apiError && (
          <div className="px-4 py-2.5 bg-red-50 border border-red-100 text-red-600 text-[13px] rounded-lg">
            {apiError}
          </div>
        )}

        {/* Search — compact */}
        <div className="relative max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by code..."
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            className={`${inputClass} pl-9 font-mono`}
          />
        </div>

        {/* Dense table */}
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-slate-50/70 sticky top-0 z-10">
                <tr className="border-b border-slate-200/80">
                  <th className="pl-4 pr-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Code</th>
                  <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Discount</th>
                  <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Min Order</th>
                  <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Uses</th>
                  <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Expires</th>
                  <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Status</th>
                  <th className="px-2 py-2.5 pr-4 text-right text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[64, 80, 64, 48, 96, 64, 64].map((w, j) => (
                        <td key={j} className="px-2 py-2.5 pl-first:pl-4">
                          <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${w}px` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-12 text-center text-sm text-slate-400">
                      No coupons found
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const status = isExpired(item) ? "expired" : item.active ? "active" : "inactive";
                    const s = statusStyles[status];
                    return (
                      <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="pl-4 pr-2 py-2">
                          <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                            <FiTag size={12} className="text-brand-600" />
                            {item.code}
                          </span>
                          {item.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5 max-w-[220px] truncate">{item.description}</p>
                          )}
                        </td>
                        <td className="px-2 py-2 font-medium text-brand-700 whitespace-nowrap">
                          {typeLabel(item)}
                        </td>
                        <td className="px-2 py-2 text-slate-500 whitespace-nowrap tabular-nums">
                          {item.minOrderAmount > 0 ? `Rs. ${item.minOrderAmount.toLocaleString()}` : "—"}
                        </td>
                        <td className="px-2 py-2 text-slate-500 whitespace-nowrap tabular-nums">
                          {item.maxUses > 0
                            ? `${item.usedCount} / ${item.maxUses}`
                            : `${item.usedCount}∞`}
                        </td>
                        <td className={`px-2 py-2 whitespace-nowrap tabular-nums ${isExpired(item) ? "text-amber-600" : "text-slate-500"}`}>
                          {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : "Never"}
                        </td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() => handleToggle(item)}
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${s.text}`}
                            title="Click to toggle on/off"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                            {status}
                          </button>
                        </td>
                        <td className="px-2 py-2 pr-4">
                          <div className="flex items-center justify-end gap-0.5">
                            <button onClick={() => handleEdit(item)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors" title="Edit">
                              <FiEdit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(item._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                              <FiTrash2 size={14} />
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
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-base font-display font-bold text-slate-900">{editingId ? "Edit Coupon" : "Add Coupon"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-md">
                <FiX size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
              <p className="text-xs text-slate-500 -mt-1 leading-relaxed">
                A coupon lets customers type a code at checkout to get a discount. It works
                immediately after saving — even while this modal is open.
              </p>
              <div>
                <label className={labelClass}>Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SAVE10"
                  disabled={Boolean(editingId)}
                  maxLength={30}
                  className={`${inputClass} font-mono uppercase disabled:bg-slate-50 disabled:text-slate-400`}
                />
                <p className="text-[11px] text-slate-400 mt-1">3-30 characters: A-Z, 0-9, _ or -</p>
              </div>
              <div>
                <label className={labelClass}>
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Internal note about this coupon"
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Type</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option value="percent">Percentage</option>
                    <option value="fixed">Fixed amount</option>
                    <option value="freeshipping">Free shipping</option>
                  </select>
                </div>
                {formData.discountType !== "freeshipping" ? (
                  <div>
                    <label className={labelClass}>
                      {formData.discountType === "percent" ? "Value (%)" : "Value (Rs.)"}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={formData.discountType === "percent" ? 100 : undefined}
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                      placeholder={formData.discountType === "percent" ? "e.g. 10" : "e.g. 500"}
                      className={inputClass}
                    />
                  </div>
                ) : (
                  <div>
                    <label className={labelClass}>
                      Shipping waiver <span className="text-slate-400 font-normal">(auto)</span>
                    </label>
                    <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-500">
                      Waives the delivery fee
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Min order (Rs.)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Max uses</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    placeholder="0 = unlimited"
                    className={inputClass}
                  />
                </div>
              </div>
              {formData.discountType === "percent" && (
                <div>
                  <label className={labelClass}>Max discount (Rs.)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.maxDiscountAmount}
                    onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                    placeholder="0 = no cap"
                    className={inputClass}
                  />
                </div>
              )}
              <div>
                <label className={labelClass}>
                  Expires <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={formData.active ? "true" : "false"}
                  onChange={(e) => setFormData({ ...formData, active: e.target.value === "true" })}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors">
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
