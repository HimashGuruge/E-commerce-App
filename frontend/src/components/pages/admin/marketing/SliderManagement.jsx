import React, { useState, useEffect, useRef } from "react";
import api from "@/utils/api";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSearch, FiImage, FiLink, FiExternalLink } from "react-icons/fi";
export default function SliderManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ imageUrl: "", link: "", altText: "", status: "active", order: 0 });
  const [search, setSearch] = useState("");
  const fileInputRef = useRef(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/slider");
      setItems(res.data?.items || []);
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "media");
      const res = await api.post("/api/upload/media", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data?.url || res.data?.data?.url;
      if (url) setFormData((prev) => ({ ...prev, imageUrl: url }));
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.imageUrl.trim()) return;
    try {
      if (editingId) {
        await api.put(`/api/slider/${editingId}`, formData);
      } else {
        await api.post("/api/slider", formData);
      }
      setShowModal(false);
      setFormData({ imageUrl: "", link: "", altText: "", status: "active", order: 0 });
      setEditingId(null);
      fetchItems();
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const handleEdit = (item) => {
    setFormData({
      imageUrl: item.imageUrl,
      link: item.link || "",
      altText: item.altText || "",
      status: item.status || "active",
      order: item.order || 0,
    });
    setEditingId(item._id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this slider item?")) return;
    try {
      await api.delete(`/api/slider/${id}`);
      fetchItems();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      await api.patch(`/api/slider/${item._id}/status`);
      fetchItems();
    } catch (err) {
      console.error("Failed to toggle:", err);
    }
  };

  const filtered = items.filter(
    (item) =>
      item.altText?.toLowerCase().includes(search.toLowerCase()) ||
      item.imageUrl?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-slate-100 text-slate-500",
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Slider Management</h1>
          <p className="text-slate-500 text-sm">Manage infinite slider images for the homepage</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ imageUrl: "", link: "", altText: "", status: "active", order: 0 });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <FiPlus size={18} />
          Add Image
        </button>
      </div>

      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search images..."
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Image</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Alt Text</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Link</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="h-12 w-20 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-10 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-8 w-16 bg-slate-100 rounded ml-auto animate-pulse" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-slate-400">No slider items found</td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <img
                        src={item.imageUrl}
                        alt={item.altText || ""}
                        className="h-12 w-20 object-cover rounded-lg border border-slate-200"
                        onError={(e) => { e.target.src = "https://via.placeholder.com/80x48?text=Error"; }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700">{item.altText || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {item.link ? (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:underline flex items-center gap-1">
                          <FiExternalLink size={12} />
                          Link
                        </a>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
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
              <h3 className="text-lg font-bold text-slate-900">{editingId ? "Edit Image" : "Add Image"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Image</label>
                {formData.imageUrl ? (
                  <div className="relative mb-2">
                    <img src={formData.imageUrl} alt="Preview" className="h-32 w-full object-cover rounded-xl border border-slate-200" />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, imageUrl: "" })}
                      className="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-slate-100"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ) : null}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full px-3 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600 transition-colors flex items-center justify-center gap-2"
                >
                  <FiImage size={18} />
                  {uploading ? "Uploading..." : "Upload Image"}
                </button>
                <p className="text-xs text-slate-400 mt-1">Or paste a URL below</p>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Alt Text</label>
                <input
                  type="text"
                  value={formData.altText}
                  onChange={(e) => setFormData({ ...formData, altText: e.target.value })}
                  placeholder="e.g. Brand logo"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Link URL <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
