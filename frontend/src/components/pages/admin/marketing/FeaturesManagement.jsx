import React, { useState, useEffect } from "react";
import api from "@/utils/api";
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  AlertCircle,
  Shield,
  Truck,
  Zap,
  Gift,
  Award,
  Clock,
  ChevronUp,
  ChevronDown,
  Layers,
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

const INPUT_CLASS =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition";

const SELECT_CLASS =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition";

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

  const previewColor = COLOR_OPTIONS.find((c) => c.value === formData.color) || COLOR_OPTIONS[0];
  const totalFeatures = features.length;
  const activeFeatures = features.filter((f) => f.active).length;

  return (
    <div className="max-w-[1440px] mx-auto p-4 md:p-6 space-y-8">

      {/* Toasts */}
      {(error || success) && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${error ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
          <AlertCircle size={18} />
          <span className="text-sm font-medium">{error || success}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Award size={26} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Features Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage and customize homepage feature highlights.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-white border border-gray-200">
            <p className="text-xs text-gray-500">Total Features</p>
            <p className="text-xl font-bold text-gray-900">{totalFeatures}</p>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
            <p className="text-xs text-emerald-600">Active Features</p>
            <p className="text-xl font-bold text-emerald-700">{activeFeatures}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        {/* Create / Edit Feature */}
        <div className="xl:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              {editingId ? <Pencil size={18} className="text-brand-600" /> : <Plus size={18} className="text-brand-600" />}
              {editingId ? "Edit Feature" : "Create New Feature"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {editingId
                ? `Editing "${formData.title}" — changes apply when you press Update Feature.`
                : "Add a highlight to your homepage."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-800">
                Basic Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feature Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Secure Payments"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe this feature..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`${INPUT_CLASS} resize-none`}
                />
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Appearance */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-800">
                Appearance &amp; Styling
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Icon
                  </label>
                  <select
                    value={formData.iconName}
                    onChange={(e) => setFormData({ ...formData, iconName: e.target.value })}
                    className={SELECT_CLASS}
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme Color
                  </label>
                  <select
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className={SELECT_CLASS}
                  >
                    {COLOR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-800">
                Display Settings
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className={SELECT_CLASS}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visibility
                  </label>
                  <select
                    value={formData.active ? "active" : "inactive"}
                    onChange={(e) => setFormData({ ...formData, active: e.target.value === "active" })}
                    className={SELECT_CLASS}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="border-t border-gray-100 pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">
                  Feature Preview
                </h3>
                <span className="text-xs text-gray-400">Live Preview</span>
              </div>

              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 flex justify-center">
                <div className="text-center max-w-xs">
                  <div className={`w-16 h-16 rounded-2xl ${previewColor.icon} text-white flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                    {renderIcon(formData.iconName, "w-7 h-7")}
                  </div>
                  <h4 className={`font-bold text-sm uppercase tracking-wide ${previewColor.text}`}>
                    {formData.title || "Feature Title"}
                  </h4>
                  <p className="text-sm text-gray-500 mt-2">
                    {formData.description || "Description appears here."}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                disabled={loading || (!editingId && formData.title === "")}
                className="flex-1 px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingId ? "Cancel Edit" : "Reset"}
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><Loader2 className="animate-spin" size={19} /> {editingId ? "Updating..." : "Creating..."}</>
                ) : (
                  <>{editingId ? <Pencil size={19} /> : <Plus size={19} />} {editingId ? "Update Feature" : "Create Feature"}</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Features List */}
        <div className="xl:col-span-5 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Homepage Features
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage your existing features.
              </p>
            </div>
            <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold">
              {features.length} Items
            </span>
          </div>

          <div className="p-6">
            {loading && !features.length ? (
              <div className="min-h-[420px] flex items-center justify-center">
                <Loader2 className="animate-spin text-brand-600" size={40} />
              </div>
            ) : features.length === 0 ? (
              <div className="min-h-[420px] flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-3xl bg-brand-50 text-brand-600 flex items-center justify-center mb-5">
                  <Layers size={36} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  No features yet
                </h3>
                <p className="text-sm text-gray-500 max-w-[260px] mt-2 leading-relaxed">
                  Your homepage features will appear here. Create your first feature to get started.
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm font-medium text-brand-600">
                  <Plus size={17} />
                  Start by creating a feature
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1 -mr-1">
                {features.map((feature, idx) => {
                  const color = COLOR_OPTIONS.find((c) => c.value === feature.color) || COLOR_OPTIONS[0];
                  const isEditing = editingId === (feature._id || feature.id);
                  return (
                    <div
                      key={feature._id || feature.id}
                      className={`rounded-xl p-4 border transition-all ${
                        isEditing
                          ? "bg-brand-50/50 border-brand-400 ring-1 ring-brand-500"
                          : "bg-gray-50/50 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`${color.bg} w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border border-gray-200`}>
                          {renderIcon(feature.iconName || "Shield", "w-6 h-6 text-gray-700")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{feature.title}</h3>
                          <p className="text-gray-500 text-sm truncate">{feature.description}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`inline-block w-2 h-2 rounded-full ${feature.active ? "bg-emerald-500" : "bg-red-400"}`} />
                            <span className="text-xs text-gray-400">{feature.active ? "Active" : "Inactive"}</span>
                            <span className="text-xs text-gray-400">| Order: {feature.order}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${color.bg} ${color.text}`}>{feature.color}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveItem(feature._id || feature.id, -1)}
                            disabled={idx === 0}
                            className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                            title="Move up"
                          >
                            <ChevronUp size={14} className="text-gray-600" />
                          </button>
                          <button
                            onClick={() => moveItem(feature._id || feature.id, 1)}
                            disabled={idx === features.length - 1}
                            className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                            title="Move down"
                          >
                            <ChevronDown size={14} className="text-gray-600" />
                          </button>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleEdit(feature)}
                            className="p-2 bg-white hover:bg-brand-50 rounded-lg transition-colors border border-gray-200"
                            title="Edit"
                          >
                            <Pencil size={16} className="text-brand-600" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(feature._id || feature.id)}
                            className="p-2 bg-white hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
                            title="Delete"
                          >
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
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-gray-200 shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" /> Confirm Delete
            </h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this feature? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
