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
  const [formData, setFormData] = useState({ name: "", icon: "", status: "active", order: 0 });
  const [search, setSearch] = useState("");

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
      setFormData({ name: "", icon: "", status: "active", order: 0 });
      setEditingId(null);
      fetchTrending();
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const handleEdit = (item) => {
    setFormData({ name: item.name, icon: item.icon || "", status: item.status || "active", order: item.order || 0 });
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

  const statusColors = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-slate-100 text-slate-500",
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trending Management</h1>
          <p className="text-slate-500 text-sm">Manage trending search terms</p>
        </div>
        <button
          onClick={() => { setEditingId(null); setFormData({ name: "", icon: "", status: "active", order: 0 }); setShowModal(true); }}
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
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Term</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Icon</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-6 w-6 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-10 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-8 w-16 bg-slate-100 rounded ml-auto animate-pulse" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center text-slate-400">No trending terms found</td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-900">{item.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-lg">{item.icon || getTrendIcon(item.name)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[item.status] || statusColors.active}`}
                      >
                        {item.status || "active"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-500">{item.order || 0}</span>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">{editingId ? "Edit Term" : "Add Term"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Term Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. iPhone 15"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">Preview: {getTrendIcon(formData.name)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Icon (optional)</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="e.g. 🔥"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Order</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
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