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
  Palette,
  Award,
  Layers,
  Code,
  Camera,
  Heart,
  Sparkles,
  Zap,
  Globe,
  Star,
  Moon,
  Sun,
  Github,
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  MapPin,
  Clock,
  Users,
  Briefcase,
  Brush,
  Pen, // ✅ Add missing icons
} from "lucide-react";
import uploadToMedia from "@/components/utils/Mediaupload.jsx";

const AdminServicesCMS = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredServices, setFilteredServices] = useState([]);

  const initialForm = {
    title: "",
    description: "",
    iconType: "Palette",
    iconName: "Palette",
    bgColor: "bg-white",
    titleColor: "text-gray-900",
    descColor: "text-gray-600",
    imageUrl: null,
  };

  const colorOptions = {
    bg: [
      { value: "bg-white", label: "White", class: "bg-white border" },
      { value: "bg-gray-50", label: "Light Gray", class: "bg-gray-50 border" },
      {
        value: "bg-gray-900",
        label: "Black",
        class: "bg-gray-900 border text-white",
      },
      { value: "bg-brand-50", label: "Light Blue", class: "bg-brand-50 border" },
      {
        value: "bg-green-50",
        label: "Light Green",
        class: "bg-green-50 border",
      },
      {
        value: "bg-purple-50",
        label: "Light Purple",
        class: "bg-purple-50 border",
      },
      {
        value: "bg-yellow-50",
        label: "Light Yellow",
        class: "bg-yellow-50 border",
      },
      { value: "bg-pink-50", label: "Light Pink", class: "bg-pink-50 border" },
      {
        value: "bg-indigo-50",
        label: "Light Indigo",
        class: "bg-indigo-50 border",
      },
    ],
    title: [
      { value: "text-gray-900", label: "Dark", class: "text-gray-900" },
      { value: "text-brand-600", label: "Blue", class: "text-brand-600" },
      { value: "text-green-600", label: "Green", class: "text-green-600" },
      { value: "text-purple-600", label: "Purple", class: "text-purple-600" },
      { value: "text-red-600", label: "Red", class: "text-red-600" },
      { value: "text-yellow-600", label: "Yellow", class: "text-yellow-600" },
      { value: "text-pink-600", label: "Pink", class: "text-pink-600" },
      { value: "text-indigo-600", label: "Indigo", class: "text-indigo-600" },
    ],
    desc: [
      { value: "text-gray-600", label: "Medium Gray", class: "text-gray-600" },
      { value: "text-gray-500", label: "Light Gray", class: "text-gray-500" },
      { value: "text-gray-700", label: "Dark Gray", class: "text-gray-700" },
    ],
  };

  // Icon categories with real icons
  const iconCategories = {
    Design: [
      { value: "Palette", label: "Palette", icon: Palette },
      { value: "Sparkles", label: "Sparkles", icon: Sparkles },
      { value: "Brush", label: "Brush", icon: Brush },
      { value: "Pen", label: "Pen", icon: Pen },
    ],
    Development: [
      { value: "Code", label: "Code", icon: Code },
      { value: "Layers", label: "Layers", icon: Layers },
      { value: "Zap", label: "Zap", icon: Zap },
      { value: "Globe", label: "Globe", icon: Globe },
    ],
    Business: [
      { value: "Briefcase", label: "Briefcase", icon: Briefcase },
      { value: "Users", label: "Users", icon: Users },
      { value: "Star", label: "Star", icon: Star },
      { value: "Award", label: "Award", icon: Award },
    ],
    Social: [
      { value: "Heart", label: "Heart", icon: Heart },
      { value: "Camera", label: "Camera", icon: Camera },
      { value: "Mail", label: "Mail", icon: Mail },
      { value: "Phone", label: "Phone", icon: Phone },
    ],
  };

  // Flatten icon options for select
  const iconOptions = Object.entries(iconCategories).flatMap(
    ([category, icons]) =>
      icons.map((icon) => ({
        ...icon,
        category,
      })),
  );

  const [formData, setFormData] = useState(initialForm);

  // Filter services based on search
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredServices(services);
    } else {
      const filtered = services.filter(
        (service) =>
          service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.description.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredServices(filtered);
    }
  }, [services, searchTerm]);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  useEffect(() => {
    fetchServices();
  }, []);

  // Image preview
  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(imageFile);
    } else {
      setImagePreview(null);
    }
  }, [imageFile]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `/api/services`,
      );
      setServices(res.data?.services || res.data || []);
      setError(null);
    } catch (err) {
      setError("Failed to fetch services");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!formData.description.trim()) {
      setError("Description is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let imageUrl = formData.imageUrl;

      if (imageFile) {
        imageUrl = await uploadToMedia(imageFile);
      }

      const payload = {
        ...formData,
        imageUrl,
        title: formData.title.trim(),
        description: formData.description.trim(),
      };

      if (editingId) {
        await api.put(
          `/api/services/${editingId}`,
          payload,
        );
        setSuccess("Service updated successfully!");
      } else {
        await api.post(
          `/api/services`,
          payload,
        );
        setSuccess("Service created successfully!");
      }

      fetchServices();
      resetForm();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "An error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await api.delete(
        `/api/services/${id}`,
      );
      setSuccess("Service deleted successfully!");
      fetchServices();
      setDeleteConfirm(null);
    } catch {
      setError("Failed to delete service");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service) => {
    setEditingId(service._id || service.id);
    setFormData({
      title: service.title || "",
      description: service.description || "",
      iconType: service.iconType || "Palette",
      iconName: service.iconName || "Palette",
      bgColor: service.bgColor || "bg-white",
      titleColor: service.titleColor || "text-gray-900",
      descColor: service.descColor || "text-gray-600",
      imageUrl: service.imageUrl || null,
    });
    setImagePreview(service.imageUrl || null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setFormData(initialForm);
    setImageFile(null);
    setImagePreview(null);
    setEditingId(null);
  };

  const handleCancel = () => {
    resetForm();
  };

  const renderIcon = (iconName, className = "w-5 h-5") => {
    const icon = iconOptions.find((i) => i.value === iconName);
    if (icon && icon.icon) {
      const IconComponent = icon.icon;
      return <IconComponent className={className} />;
    }
    return <Palette className={className} />;
  };

  const groupedIcons = Object.entries(iconCategories);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-brand-600" />
              Services Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage your service offerings with custom icons
            </p>
          </div>
          {editingId && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all flex items-center gap-2 text-gray-700"
            >
              <X size={18} /> Cancel Edit
            </button>
          )}
        </div>

        {/* Alert Messages */}
        {(error || success) && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              error
                ? "bg-red-50 border border-red-200 text-red-700"
                : "bg-green-50 border border-green-200 text-green-700"
            }`}
          >
            {error ? <AlertCircle size={20} /> : <Eye size={20} />}
            <span>{error || success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="space-y-6">
            <form
              onSubmit={handleSubmit}
              className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
            >
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-800">
                {editingId ? (
                  <>
                    <Pencil className="w-5 h-5 text-brand-600" /> Edit Service
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-green-600" /> Create New
                    Service
                  </>
                )}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    className="w-full bg-white p-3 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors text-gray-900"
                    placeholder="Enter service title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    className="w-full bg-white p-3 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors text-gray-900"
                    placeholder="Enter service description"
                    rows="4"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icon Type
                  </label>
                  <select
                    className="w-full bg-white p-3 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-brand-500 outline-none text-gray-900"
                    value={formData.iconType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        iconType: e.target.value,
                        iconName: e.target.value,
                      })
                    }
                  >
                    {groupedIcons.map(([category, icons]) => (
                      <optgroup key={category} label={category}>
                        {icons.map((icon) => (
                          <option key={icon.value} value={icon.value}>
                            {icon.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Icon Preview
                    </label>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-300 flex items-center justify-center gap-2">
                      {renderIcon(formData.iconType, "w-8 h-8 text-brand-600")}
                      <span className="text-sm text-gray-600">
                        {formData.iconType}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quick Icons
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {iconOptions.slice(0, 6).map((icon) => (
                        <button
                          key={icon.value}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              iconType: icon.value,
                              iconName: icon.value,
                            })
                          }
                          className={`p-2 rounded-lg border transition-all ${
                            formData.iconType === icon.value
                              ? "border-emerald-500 bg-brand-50"
                              : "border-gray-300 hover:border-emerald-300"
                          }`}
                          title={icon.label}
                        >
                          {renderIcon(icon.value, "w-5 h-5 mx-auto")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Background Color
                    </label>
                    <select
                      className="w-full bg-white p-3 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-brand-500 outline-none text-gray-900"
                      value={formData.bgColor}
                      onChange={(e) =>
                        setFormData({ ...formData, bgColor: e.target.value })
                      }
                    >
                      {colorOptions.bg.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title Color
                    </label>
                    <select
                      className="w-full bg-white p-3 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-brand-500 outline-none text-gray-900"
                      value={formData.titleColor}
                      onChange={(e) =>
                        setFormData({ ...formData, titleColor: e.target.value })
                      }
                    >
                      {colorOptions.title.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Image (Optional)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      onChange={(e) => setImageFile(e.target.files[0])}
                      accept="image/*"
                      className="flex-1 bg-white p-2 rounded-lg border border-gray-300 text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                    />
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="p-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                      >
                        <X size={18} className="text-red-600" />
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white p-3 rounded-lg flex items-center justify-center gap-2 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      {editingId ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      {editingId ? <Pencil size={20} /> : <Plus size={20} />}
                      {editingId ? "Update Service" : "Create Service"}
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Preview Section */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
                <Eye className="w-5 h-5 text-brand-600" /> Live Preview
              </h2>
              <div
                className={`${formData.bgColor} p-8 rounded-xl border border-gray-200 w-full max-w-sm mx-auto transition-all hover:shadow-md duration-300`}
              >
                <div className="mb-6 p-4 bg-white/80 rounded-full w-24 h-24 flex items-center justify-center mx-auto shadow-sm">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="text-4xl text-brand-600">
                      {renderIcon(
                        formData.iconName || formData.iconType || "Palette",
                        "w-12 h-12",
                      )}
                    </div>
                  )}
                </div>
                <h3
                  className={`${formData.titleColor} font-bold text-xl mb-4 text-center`}
                >
                  {formData.title || "Service Title"}
                </h3>
                <p
                  className={`${formData.descColor} text-sm text-center leading-relaxed`}
                >
                  {formData.description ||
                    "Your service description will appear here..."}
                </p>
              </div>
            </div>
          </div>

          {/* Services List Section */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
                <Eye size={20} className="text-brand-600" /> Services (
                {filteredServices.length})
              </h2>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-brand-500 outline-none"
                />
                <Eye className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {loading && !services.length ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin text-brand-600" size={40} />
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchTerm ? (
                  <>
                    <p>No services match your search</p>
                    <p className="text-sm mt-2">Try different keywords</p>
                  </>
                ) : (
                  <>
                    <p>No services created yet</p>
                    <p className="text-sm mt-2">
                      Create your first service using the form
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {filteredServices.map((service) => (
                  <div
                    key={service._id || service.id}
                    className={`bg-gray-50 rounded-lg p-4 border ${editingId === (service._id || service.id) ? "border-emerald-500 ring-1 ring-brand-500" : "border-gray-200"} hover:border-gray-300 transition-all`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`${service.bgColor || "bg-white"} w-16 h-16 rounded-lg flex items-center justify-center text-2xl flex-shrink-0 border border-gray-200`}
                      >
                        {service.imageUrl ? (
                          <img
                            src={service.imageUrl}
                            alt={service.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="text-brand-600">
                            {renderIcon(
                              service.iconName || service.iconType || "Palette",
                              "w-8 h-8",
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`${service.titleColor || "text-gray-900"} font-semibold text-lg truncate flex items-center gap-2`}
                        >
                          {service.title}
                        </h3>
                        <p className="text-gray-600 text-sm line-clamp-2 mt-1">
                          {service.description}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(service)}
                          className="p-2 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors border border-brand-200"
                          title="Edit"
                        >
                          <Pencil size={16} className="text-brand-600" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm(service._id || service.id)
                          }
                          className="p-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                          title="Delete"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full border border-gray-200 shadow-lg">
              <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" /> Confirm Delete
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this service? This action cannot
                be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ Fixed: Regular style tag without jsx attribute */}
      <style>{`
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
      `}</style>
    </div>
  );
};

export default AdminServicesCMS;
