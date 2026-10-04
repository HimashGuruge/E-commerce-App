import React, { useState, useEffect } from "react";
import api from "@/utils/api";
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  X,
  Eye,
  AlertCircle,
  Shield,
  Truck,
  Zap,
  Gift,
  Award,
  Clock,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

const ICON_OPTIONS = [
  { value: "Shield", label: "Shield", icon: Shield },
  { value: "Truck", label: "Truck", icon: Truck },
  { value: "Zap", label: "Zap", icon: Zap },
  { value: "Gift", label: "Gift", icon: Gift },
  { value: "Award", label: "Award", icon: Award },
  { value: "Clock", label: "Clock", icon: Clock },
];

const COLOR_OPTIONS = [
  { value: "blue", label: "Blue", bg: "bg-blue-50", icon: "bg-blue-600", text: "text-blue-700" },
  { value: "green", label: "Green", bg: "bg-emerald-50", icon: "bg-emerald-600", text: "text-emerald-700" },
  { value: "amber", label: "Amber", bg: "bg-amber-50", icon: "bg-amber-600", text: "text-amber-700" },
  { value: "pink", label: "Pink", bg: "bg-pink-50", icon: "bg-pink-600", text: "text-pink-700" },
  { value: "purple", label: "Purple", bg: "bg-purple-50", icon: "bg-purple-600", text: "text-purple-700" },
  { value: "slate", label: "Slate", bg: "bg-slate-50", icon: "bg-slate-600", text: "text-slate-700" },
];

export default function FeaturesManagement() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const initialForm = {
    title: "",
    description: "",
    iconName: "Shield",
    color: "blue",
    order: 0,
    active: true,
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => { setSuccess(null); setError(null); }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  useEffect(() => { fetchFeatures(); }, []);

  const fetchFeatures = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/features?all=true");
      setFeatures(res.data?.features || []);
      setError(null);
    } catch (err) {
      setError("Failed to fetch features");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) { setError("Title is required"); return; }
    setLoading(true);
    setError(null);
    try {
      const payload = { ...formData, title: formData.title.trim(), description: formData.description.trim() };
      if (editingId) {
        await api.put(`/api/features/${editingId}`, payload);
        setSuccess("Feature updated successfully!");
      } else {
        await api.post("/api/features", payload);
        setSuccess("Feature created successfully!");
      }
      fetchFeatures();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await api.delete(`/api/features/${id}`);
      setSuccess("Feature deleted successfully!");
      fetchFeatures();
      setDeleteConfirm(null);
    } catch {
      setError("Failed to delete feature");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (feature) => {
    setEditingId(feature._id || feature.id);
    setFormData({
      title: feature.title || "",
      description: feature.description || "",
      iconName: feature.iconName || "Shield",
      color: feature.color || "blue",
      order: feature.order || 0,
      active: feature.active ?? true,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => { setFormData(initialForm); setEditingId(null); };
  const handleCancel = () => resetForm();

  const moveItem = async (id, direction) => {
    const idx = features.findIndex((f) => (f._id || f.id) === id);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= features.length) return;
    const current = features[idx];
    const neighbor = features[newIdx];
    try {
      await Promise.all([
        api.put(`/api/features/${current._id || current.id}`, { order: neighbor.order }),
        api.put(`/api/features/${neighbor._id || neighbor.id}`, { order: current.order }),
      ]);
      fetchFeatures();
    } catch { /* ignore */ }
  };

  const renderIcon = (iconName, className = "w-5 h-5") => {
    const match = ICON_OPTIONS.find((i) => i.value === iconName);
    if (match) {
      const IconComp = match.icon;
      return <IconComp className={className} />;
    }
    return <Shield className={className} />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
              <Award className="w-8 h-8 text-brand-600" />
              Features Management
            </h1>
            <p className="text-gray-600 mt-2">Manage premium feature cards on the homepage</p>
          </div>
          {editingId && (
            <button onClick={handleCancel} className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all flex items-center gap-2 text-gray-700">
              <X size={18} /> Cancel Edit
            </button>
          )}
        </div>

        {(error || success) && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${error ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700"}`}>
            {error ? <AlertCircle size={20} /> : <Eye size={20} />}
            <span>{error || success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-800">
                {editingId ? <><Pencil className="w-5 h-5 text-brand-600" /> Edit Feature</> : <><Plus className="w-5 h-5 text-green-600" /> Create New Feature</>}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    className="w-full bg-white p-3 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors text-gray-900"
                    placeholder="e.g. Secure Payment"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <input
                    className="w-full bg-white p-3 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors text-gray-900"
                    placeholder="e.g. SSL Encrypted"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                    <select
                      className="w-full bg-white p-3 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-brand-500 outline-none text-gray-900"
                      value={formData.iconName}
                      onChange={(e) => setFormData({ ...formData, iconName: e.target.value })}
                    >
                      {ICON_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                    <select
                      className="w-full bg-white p-3 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-brand-500 outline-none text-gray-900"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    >
                      {COLOR_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                    <input
                      type="number"
                      className="w-full bg-white p-3 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-brand-500 outline-none text-gray-900"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      className="w-full bg-white p-3 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-brand-500 outline-none text-gray-900"
                      value={formData.active ? "active" : "inactive"}
                      onChange={(e) => setFormData({ ...formData, active: e.target.value === "active" })}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                  <div className={`p-4 rounded-xl border ${COLOR_OPTIONS.find((c) => c.value === formData.color)?.bg || "bg-blue-50"}`}>
                    <div className="flex flex-col items-center text-center">
                      <div className={`w-12 h-12 rounded-xl ${COLOR_OPTIONS.find((c) => c.value === formData.color)?.icon || "bg-blue-600"} flex items-center justify-center mb-2 shadow-md`}>
                        {renderIcon(formData.iconName, "w-5 h-5 text-white")}
                      </div>
                      <h3 className={`font-bold text-xs uppercase tracking-wide ${COLOR_OPTIONS.find((c) => c.value === formData.color)?.text || "text-blue-700"}`}>
                        {formData.title || "Feature Title"}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-1">{formData.description || "Description"}</p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white p-3 rounded-lg flex items-center justify-center gap-2 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 className="animate-spin" size={20} /> {editingId ? "Updating..." : "Creating..."}</>
                  ) : (
                    <>{editingId ? <Pencil size={20} /> : <Plus size={20} />} {editingId ? "Update Feature" : "Create Feature"}</>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
                <Eye size={20} className="text-brand-600" /> Features ({features.length})
              </h2>
            </div>

            {loading && !features.length ? (
              <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-brand-600" size={40} /></div>
            ) : features.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No features created yet</p>
                <p className="text-sm mt-2">Create your first feature using the form</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {features.map((feature, idx) => {
                  const color = COLOR_OPTIONS.find((c) => c.value === feature.color) || COLOR_OPTIONS[0];
                  return (
                    <div
                      key={feature._id || feature.id}
                      className={`bg-gray-50 rounded-lg p-4 border ${editingId === (feature._id || feature.id) ? "border-emerald-500 ring-1 ring-brand-500" : "border-gray-200"} hover:border-gray-300 transition-all`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`${color.bg} w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-200`}>
                          {renderIcon(feature.iconName || "Shield", "w-6 h-6 text-gray-700")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{feature.title}</h3>
                          <p className="text-gray-500 text-sm truncate">{feature.description}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`inline-block w-2 h-2 rounded-full ${feature.active ? "bg-green-500" : "bg-red-400"}`} />
                            <span className="text-xs text-gray-400">{feature.active ? "Active" : "Inactive"}</span>
                            <span className="text-xs text-gray-400">| Order: {feature.order}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${color.bg} ${color.text}`}>{feature.color}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button onClick={() => moveItem(feature._id || feature.id, -1)} disabled={idx === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30" title="Move up">
                            <ChevronUp size={14} className="text-gray-600" />
                          </button>
                          <button onClick={() => moveItem(feature._id || feature.id, 1)} disabled={idx === features.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30" title="Move down">
                            <ChevronDown size={14} className="text-gray-600" />
                          </button>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => handleEdit(feature)} className="p-2 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors border border-brand-200" title="Edit">
                            <Pencil size={16} className="text-brand-600" />
                          </button>
                          <button onClick={() => setDeleteConfirm(feature._id || feature.id)} className="p-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200" title="Delete">
                            <Trash2 size={16} className="text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full border border-gray-200 shadow-lg">
              <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" /> Confirm Delete
              </h3>
              <p className="text-gray-600 mb-6">Are you sure you want to delete this feature? This action cannot be undone.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2">
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />} Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
