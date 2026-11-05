import React, { useState, useEffect } from "react";
import api from "@/utils/api";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSearch } from "react-icons/fi";
import { MdDragIndicator } from "react-icons/md";

const getTrendIcon = (name) => {
  const n = name.toLowerCase();
  if (n.includes("iphone") || n.includes("phone") || n.includes("mobile")) return "📱";
  if (n.includes("airpod") || n.includes("head") || n.includes("ear")) return "🎧";
  if (n.includes("watch") || n.includes("smart")) return "⌚";
  if (n.includes("laptop") || n.includes("mac") || n.includes("computer")) return "💻";
  if (n.includes("speaker") || n.includes("audio") || n.includes("sound")) return "🔊";
  if (n.includes("cam") || n.includes("photo") || n.includes("camera")) return "📷";
  if (n.includes("tab") || n.includes("ipad")) return "🖥️";
  if (n.includes("shoe") || n.includes("sneaker")) return "👟";
  if (n.includes("bag") || n.includes("purse")) return "👜";
  if (n.includes("skin") || n.includes("serum")) return "✨";
  return "🔥";
};

export default function TrendingManagement() {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", icon: "", status: "active", order: 0, productId: "" });
  const [search, setSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState([]);

  const fetchTrending = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/trending/all");
      setTrending(res.data?.trending || []);
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrending();
  }, []);

  useEffect(() => {
    const q = productSearch.trim();
    setProducts([]);
    if (!q) return;
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/api/products?search=${encodeURIComponent(q)}&limit=12&includeAll=true`);
        setProducts(res.data?.products || []);
      } catch (err) {
        console.error("Product search failed:", err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    try {
      if (editingId) {
        await api.put(`/api/trending/${editingId}`, formData);
      } else {
        await api.post("/api/trending", formData);
      }
      setShowModal(false);
      setFormData({ name: "", icon: "", status: "active", order: 0, productId: "" });
      setProductSearch("");
      setEditingId(null);
      fetchTrending();
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const handleEdit = (item) => {
    setFormData({ name: item.name, icon: item.icon || "", status: item.status || "active", order: item.order || 0, productId: item.productId || "" });
    setProductSearch("");
    setEditingId(item._id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this trending term?")) return;
    try {
      await api.delete(`/api/trending/${id}`);
      fetchTrending();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      await api.put(`/api/trending/${item._id}`, {
        ...item,
        status: item.status === "active" ? "inactive" : "active",
      });
      fetchTrending();
    } catch (err) {
      console.error("Failed to toggle:", err);
    }
  };

  const filtered = trending.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const statusStyles = {
    active: { dot: "bg-emerald-500", text: "text-emerald-700" },
    inactive: { dot: "bg-slate-400", text: "text-slate-500" },
  };

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
            Trending
          </h1>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.14em] truncate">
            {trending.length} terms
          </p>
        </div>
        <button
          onClick={() => { setEditingId(null); setFormData({ name: "", icon: "", status: "active", order: 0, productId: "" }); setProductSearch(""); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <FiPlus size={18} />
          Add Term
        </button>
      </div>

      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search terms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-700 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/15"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50/70 sticky top-0 z-10">
              <tr className="border-b border-slate-200/80">
                <th className="pl-4 pr-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Term</th>
                <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Icon</th>
                <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Status</th>
                <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Linked Product</th>
                <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Order</th>
                <th className="px-2 py-2.5 pr-4 text-right text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="pl-4 pr-2 py-2"><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="px-2 py-2"><div className="h-6 w-6 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="px-2 py-2"><div className="h-4 w-16 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="px-2 py-2"><div className="h-4 w-16 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="px-2 py-2"><div className="h-4 w-10 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="px-2 py-2 pr-4"><div className="h-4 w-16 bg-slate-100 rounded ml-auto animate-pulse" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-sm text-slate-400">No trending terms found</td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="pl-4 pr-2 py-2">
                      <span className="text-xs font-medium text-slate-900">{item.name}</span>
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-base">{item.icon || getTrendIcon(item.name)}</span>
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${statusStyles[item.status]?.text || statusStyles.active.text}`}
                        title="Click to toggle on/off"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyles[item.status]?.dot || statusStyles.active.dot}`} />
                        {item.status || "active"}
                      </button>
                    </td>
                    <td className="px-2 py-2">
                      {item.productId ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-brand-50 text-brand-600">product</span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs text-slate-500 whitespace-nowrap tabular-nums">{item.order || 0}</td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-base font-display font-bold text-slate-900">{editingId ? "Edit Term" : "Add Term"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-md">
                <FiX size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Term Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. iPhone 15"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/15"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">Preview: {getTrendIcon(formData.name)}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Icon <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="e.g. 🔥"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/15"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] cursor-pointer focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/15"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Order</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/15"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Link to a product <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                {productSearch ? (
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products…"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/15"
                  />
                ) : (
                  <p className="text-xs text-slate-400">
                    Linked terms become product cards (image + price) on the home page.
                  </p>
                )}

                {productSearch && products.length === 0 && (
                  <p className="text-[11px] text-slate-400 mt-1">No products found.</p>
                )}
                {products.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {products.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, productId: prev.productId === p._id ? "" : p._id }));
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors ${
                          formData.productId === p._id ? "bg-brand-50" : ""
                        }`}
                      >
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                        ) : (
                          <span className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-xs shrink-0">📦</span>
                        )}
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-medium text-slate-800 truncate">{p.productName || p.name}</span>
                          <span className="block text-[11px] text-slate-400">Rs. {Number(p.sellingPrice ?? p.price ?? 0).toLocaleString()}</span>
                        </span>
                        {formData.productId === p._id && (
                          <span className="text-xs font-semibold text-brand-600 shrink-0">Linked</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {formData.productId && !productSearch && (
                  <p className="text-xs text-brand-600 mt-1">
                    A product is linked.
                    <button
                      type="button"
                      className="ml-2 text-slate-400 hover:text-red-600 underline"
                      onClick={() => setFormData((prev) => ({ ...prev, productId: "" }))}
                    >
                      Unlink
                    </button>
                  </p>
                )}
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
    </div>
  );
}