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
  ChevronDown,
  Type,
  Image as ImageIcon,
  MousePointer2,
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
  Mail,
  Phone,
  Users,
  Briefcase,
  Brush,
  Pen,
  RotateCcw,
  Tablet as TabletIcon,
  Smartphone,
} from "lucide-react";
import uploadToMedia from "@/components/utils/Mediaupload.jsx";
import {
  DEFAULT_SERVICE_STYLE,
  isHex,
  normalizeServiceStyle,
  serviceCardStyle,
  serviceTitleStyle,
  serviceDescStyle,
  serviceIconContainerStyle,
  serviceIconColor,
  serviceIconSize,
  serviceImageStyle,
} from "@/utils/serviceStyle";

/* ============================== Presets ============================== */

const PALETTE = [
  "#0f172a",
  "#111827",
  "#4b5563",
  "#64748b",
  "#6b7280",
  "#374151",
  "#d94804",
  "#F85606",
  "#dc2626",
  "#16a34a",
  "#9333ea",
  "#4f46e5",
  "#db2777",
  "#ca8a04",
  "#2563eb",
  "#ffffff",
];

const FONT_WEIGHTS = [
  { value: 400, label: "Normal (400)" },
  { value: 500, label: "Medium (500)" },
  { value: 600, label: "Semibold (600)" },
  { value: 700, label: "Bold (700)" },
];

const TRANSFORMS = [
  { value: "none", label: "None" },
  { value: "uppercase", label: "UPPERCASE" },
  { value: "lowercase", label: "lowercase" },
  { value: "capitalize", label: "Capitalize" },
];

const ALIGNS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

const OBJECT_FITS = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
];

/* ============================ Icon rendering =========================== */

const ICON_COMPONENTS = {
  Palette,
  Sparkles,
  Brush: Palette,
  Pen,
  Code,
  Layers,
  Zap,
  Globe,
  Briefcase,
  Users,
  Star,
  Award,
  Heart,
  Camera,
  Mail,
  Phone,
};

function IconByName({ name, size = 32, color }) {
  const Comp = ICON_COMPONENTS[name] || Palette;
  return <Comp size={size} style={color ? { color } : undefined} />;
}

/* ====================== Reusable control components ==================== */

function CollapsibleSection({
  icon: Icon,
  title,
  subtitle,
  defaultOpen = false,
  children,
  onReset,
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-50 text-brand-600 shrink-0">
            <Icon size={16} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-gray-800 truncate">
              {title}
            </span>
            {subtitle && (
              <span className="block text-xs text-gray-500 truncate">
                {subtitle}
              </span>
            )}
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {onReset && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onReset();
                }
              }}
              className="p-1.5 rounded-md text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
              title="Reset this section to defaults"
            >
              <RotateCcw size={14} />
            </span>
          )}
          <ChevronDown
            size={18}
            className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      {open && <div className="px-4 py-4 border-t border-gray-100 space-y-4">{children}</div>}
    </div>
  );
}

const fieldLabel = "block text-xs font-semibold text-gray-700 mb-1.5";
const inputCls =
  "w-full bg-white px-3 py-2 rounded-lg border border-gray-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-200 outline-none text-sm text-gray-900 transition-colors";
const selectCls = inputCls + " cursor-pointer";

function NumField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = "",
  placeholder,
  hint,
}) {
  return (
    <div>
      <label className={fieldLabel}>
        {label}
        {unit && <span className="text-gray-400 font-normal"> ({unit})</span>}
      </label>
      <input
        type="number"
        className={inputCls}
        min={min}
        max={max}
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange("");
            return;
          }
          const n = Number(raw);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
        onBlur={() => {
          if (value === "" || value === null || value === undefined)
            onChange(placeholder ? Number(placeholder) || min : min);
        }}
      />
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, className = "" }) {
  return (
    <div className={className}>
      <label className={fieldLabel}>{label}</label>
      <select
        className={selectCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleField({ label, checked, onChange, hint }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
      <span className="text-sm text-gray-700">
        {label}
        {hint && <span className="block text-[11px] text-gray-400">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-brand-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
  allowEmpty = true,
  palette = PALETTE,
  emptyLabel = "None (inherit)",
}) {
  const [hexText, setHexText] = useState(value || "");
  // Keep the text box in sync when value changes externally (e.g. reset).
  useEffect(() => setHexText(value || ""), [value]);

  const commitHex = (raw) => {
    const t = raw.trim().startsWith("#") ? raw.trim() : `#${raw.trim()}`;
    if (isHex(t)) onChange(t);
    else if (allowEmpty && t.replace("#", "") === "") onChange("");
  };

  return (
    <div>
      <label className={fieldLabel}>{label}</label>
      <div className="flex items-center gap-2">
        <span className="relative shrink-0">
          <input
            type="color"
            value={isHex(value) ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="w-9 h-9 p-0.5 rounded-lg border border-gray-300 cursor-pointer bg-white"
            title={label}
          />
        </span>
        <input
          type="text"
          value={hexText}
          placeholder={allowEmpty ? emptyLabel : "#RRGGBB"}
          spellCheck={false}
          className={inputCls + " font-mono flex-1 min-w-0"}
          onChange={(e) => {
            const raw = e.target.value;
            setHexText(raw);
            if (isHex(raw.trim()) || (allowEmpty && raw.trim() === "")) commitHex(raw);
          }}
          onBlur={() => {
            if (hexText && !isHex(hexText.trim()) && hexText.trim() !== "") setHexText(value || "");
          }}
        />
        {allowEmpty && isHex(value) && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="p-1.5 text-xs rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-200"
            title="Clear color"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {palette.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`w-6 h-6 rounded-md border transition-transform hover:scale-110 ${
              value === c ? "ring-2 ring-brand-400 ring-offset-1" : ""
            }`}
            style={{ backgroundColor: c, borderColor: c === "#ffffff" ? "#d1d5db" : "transparent" }}
            title={c}
          />
        ))}
      </div>
    </div>
  );
}

function TypographyControls({ label, value, onPatch, onShadowPatch }) {
  const v = value;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <NumField
          label="Font size"
          unit="px"
          min={10}
          max={48}
          value={v.fontSize}
          onChange={(n) => onPatch({ fontSize: n })}
        />
        <div>
          <label className={fieldLabel}>Font family</label>
          <input
            type="text"
            className={inputCls}
            placeholder="e.g. Arial, inherit"
            value={v.fontFamily}
            onChange={(e) => onPatch({ fontFamily: e.target.value })}
          />
        </div>
        <SelectField
          label="Font weight"
          value={v.fontWeight}
          onChange={(n) => onPatch({ fontWeight: Number(n) })}
          options={FONT_WEIGHTS}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["bold", "Bold"],
          ["italic", "Italic"],
          ["underline", "Underline"],
          ["strike", "Strike"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onPatch({ [key]: !v[key] })}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
              v[key]
                ? "bg-brand-50 border-brand-300 text-brand-700"
                : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Text transform"
          value={v.transform}
          onChange={(t) => onPatch({ transform: t })}
          options={TRANSFORMS}
        />
        <SelectField
          label="Alignment"
          value={v.align}
          onChange={(a) => onPatch({ align: a })}
          options={ALIGNS}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <NumField
          label="Letter spacing"
          unit="px"
          min={-5}
          max={20}
          step={0.5}
          value={v.letterSpacing}
          onChange={(n) => onPatch({ letterSpacing: n })}
        />
        <NumField
          label="Word spacing"
          unit="px"
          min={0}
          max={40}
          step={1}
          value={v.wordSpacing}
          onChange={(n) => onPatch({ wordSpacing: n })}
        />
        <NumField
          label="Line height"
          min={0.8}
          max={3}
          step={0.1}
          value={v.lineHeight}
          onChange={(n) => onPatch({ lineHeight: n })}
        />
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <ToggleField
          label="Text shadow"
          checked={v.shadow.enabled}
          onChange={(on) => onShadowPatch({ enabled: on })}
        />
        {v.shadow.enabled && (
          <div className="grid grid-cols-2 gap-3 flex-1 max-w-xs">
            <ColorField
              label="Shadow color"
              value={v.shadow.color}
              onChange={(c) => onShadowPatch({ color: c })}
              palette={["#0f172a", "#000000", "#d94804", "#111827", "#4b5563"]}
              allowEmpty={false}
            />
            <NumField
              label="Shadow blur"
              unit="px"
              min={0}
              max={24}
              value={v.shadow.blur}
              onChange={(n) => onShadowPatch({ blur: n })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================ Preview card ============================ */

function ServiceCardPreview({ form, mode }) {
  const style = normalizeServiceStyle(form.style, form);
  const iconName = form.iconName || form.iconType || "Palette";
  const iconSize = serviceIconSize(style);
  const iconColor = serviceIconColor(style);
  const hasImage = Boolean(form.imagePreview || form.imageUrl);

  return (
    <div
      className={`rounded-2xl bg-white mx-auto px-4 py-3 ${
        mode === "mobile" ? "max-w-[300px]" : "max-w-xl"
      }`}
    >
      <div
        className="flex items-start"
        style={serviceCardStyle(style)}
      >
        <div
          className="flex items-center justify-center"
          style={serviceIconContainerStyle(style)}
        >
          {hasImage ? (
            <img
              src={form.imagePreview || form.imageUrl}
              alt={form.title || "service"}
              style={serviceImageStyle(style)}
            />
          ) : (
            <IconByName name={iconName} size={iconSize} color={iconColor} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="font-bold truncate"
            style={serviceTitleStyle(style)}
          >
            {form.title || "Service Title"}
          </h3>
          <p className="mt-1" style={serviceDescStyle(style)}>
            {form.description || "Your service description will appear here..."}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================== Main page ============================= */

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
  const [previewMode, setPreviewMode] = useState("desktop");

  const initialForm = {
    title: "",
    description: "",
    iconType: "Palette",
    iconName: "Palette",
    imageUrl: null,
    style: JSON.parse(JSON.stringify(DEFAULT_SERVICE_STYLE)),
  };

  const [formData, setFormData] = useState(initialForm);

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

  const iconOptions = Object.entries(iconCategories).flatMap(
    ([category, icons]) =>
      icons.map((icon) => ({
        ...icon,
        category,
      })),
  );

  const groupedIcons = Object.entries(iconCategories);

  /* ------------------------------ effects ----------------------------- */

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredServices(services);
    } else {
      const filtered = services.filter(
        (s) =>
          (s.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.description || "").toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredServices(filtered);
    }
  }, [services, searchTerm]);

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

  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(imageFile);
    } else {
      setImagePreview(null);
    }
  }, [imageFile]);

  /* ------------------------------ helpers ----------------------------- */

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/services`);
      setServices(res.data?.services || res.data || []);
      setError(null);
    } catch (err) {
      setError("Failed to fetch services");
    } finally {
      setLoading(false);
    }
  };

  // Update one section of the style object with a shallow patch.
  const patchStyle = (section, patch) =>
    setFormData((prev) => ({
      ...prev,
      style: { ...prev.style, [section]: { ...prev.style[section], ...patch } },
    }));

  // Update a nested sub-object (e.g. title.shadow).
  const patchStyleNested = (section, subKey, patch) =>
    setFormData((prev) => ({
      ...prev,
      style: {
        ...prev.style,
        [section]: {
          ...prev.style[section],
          [subKey]: { ...prev.style[section][subKey], ...patch },
        },
      },
    }));

  const setField = (key, value) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setFormData(initialForm);
    setImageFile(null);
    setImagePreview(null);
    setEditingId(null);
  };

  const resetStyleToDefaults = () => {
    setFormData((prev) => ({
      ...prev,
      style: JSON.parse(JSON.stringify(DEFAULT_SERVICE_STYLE)),
    }));
  };

  /* ------------------------------ actions ----------------------------- */

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
        title: formData.title.trim(),
        description: formData.description.trim(),
        iconType: formData.iconType,
        iconName: formData.iconName,
        imageUrl,
        status: "active",
        // Normalize on the client too; the server re-validates before saving.
        style: normalizeServiceStyle(formData.style),
      };

      if (editingId) {
        await api.put(`/api/services/${editingId}`, payload);
        setSuccess("Service updated successfully!");
      } else {
        await api.post(`/api/services`, payload);
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
      await api.delete(`/api/services/${id}`);
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
    const iconName = service.iconName || service.iconType || "Palette";
    setFormData({
      title: service.title || "",
      description: service.description || "",
      iconType: iconName,
      iconName,
      imageUrl: service.imageUrl || null,
      // Restore saved styles; falls back to sensible defaults when missing.
      style: normalizeServiceStyle(service.style, service),
    });
    setImageFile(null);
    setImagePreview(service.imageUrl || null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => resetForm();

  /* ------------------------------- render ------------------------------ */

  const renderIcon = (iconName, className = "w-5 h-5") => {
    const icon = iconOptions.find((i) => i.value === iconName);
    if (icon && icon.icon) {
      const IconComponent = icon.icon;
      return <IconComponent className={className} />;
    }
    return <Palette className={className} />;
  };

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
              Manage your service offerings with custom icons and full styling
              controls
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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
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
                  <label className={fieldLabel}>Title *</label>
                  <input
                    className={inputCls + " text-gray-900 py-3"}
                    placeholder="Enter service title"
                    value={formData.title}
                    onChange={(e) => setField("title", e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className={fieldLabel}>Description *</label>
                  <textarea
                    className={inputCls + " text-gray-900 py-3"}
                    placeholder="Enter service description"
                    rows="4"
                    value={formData.description}
                    onChange={(e) => setField("description", e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className={fieldLabel}>Icon Type</label>
                  <select
                    className={selectCls}
                    value={formData.iconType}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        iconType: e.target.value,
                        iconName: e.target.value,
                      }))
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
                    <label className={fieldLabel}>Icon Preview</label>
                    <div
                      className="rounded-lg border border-gray-300 flex items-center justify-center gap-2"
                      style={serviceIconContainerStyle(
                        normalizeServiceStyle(formData.style, formData)
                      )}
                    >
                      <IconByName
                        name={
                          formData.iconType ||
                          formData.iconName ||
                          "Palette"
                        }
                        size={serviceIconSize(
                          normalizeServiceStyle(formData.style, formData)
                        )}
                        color={serviceIconColor(
                          normalizeServiceStyle(formData.style, formData)
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={fieldLabel}>Quick Icons</label>
                    <div className="grid grid-cols-3 gap-2">
                      {iconOptions.slice(0, 6).map((icon) => (
                        <button
                          key={icon.value}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              iconType: icon.value,
                              iconName: icon.value,
                            }))
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

                <div>
                  <label className={fieldLabel}>Service Image (Optional)</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      onChange={(e) => setImageFile(e.target.files[0])}
                      accept="image/*"
                      className="flex-1 bg-white p-2 rounded-lg border border-gray-300 text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                    />
                    {imagePreview && (
                      <div className="flex items-center gap-2">
                        <img
                          src={imagePreview}
                          alt="preview"
                          className="w-12 h-12 object-contain rounded-lg border border-gray-200"
                        />
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
                      </div>
                    )}
                  </div>
                  {formData.imageUrl && !imagePreview && (
                    <div className="flex items-center gap-3 mt-3">
                      <img
                        src={formData.imageUrl}
                        alt={formData.title || "current"}
                        className="w-12 h-12 object-contain rounded-lg border border-gray-200"
                      />
                      <span className="text-xs text-gray-600">
                        Current image (keep)
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <p className="text-xs text-gray-500">
                    Advanced styling — open a section to edit. Changes update
                    the live preview instantly.
                  </p>

                  {/* 1. Typography */}
                  <CollapsibleSection
                    icon={Type}
                    title="Typography"
                    subtitle="Title & description font, weight, transforms, spacing, shadow"
                    onReset={() =>
                      patchStyle("title", JSON.parse(JSON.stringify(DEFAULT_SERVICE_STYLE.title)))
                    }
                  >
                    <TypographyControls
                      label="Title"
                      value={formData.style.title}
                      onPatch={(p) => patchStyle("title", p)}
                      onShadowPatch={(p) => patchStyleNested("title", "shadow", p)}
                    />
                    <div className="border-t border-gray-100 pt-3">
                      <TypographyControls
                        label="Description"
                        value={formData.style.desc}
                        onPatch={(p) => patchStyle("desc", p)}
                        onShadowPatch={(p) => patchStyleNested("desc", "shadow", p)}
                      />
                    </div>
                  </CollapsibleSection>

                  {/* 2. Text Colors */}
                  <CollapsibleSection
                    icon={Palette}
                    title="Text Colors"
                    subtitle="Title & description color, presets, custom HEX"
                    onReset={() =>
                      patchStyle("colors", {
                        title: DEFAULT_SERVICE_STYLE.colors.title,
                        desc: DEFAULT_SERVICE_STYLE.colors.desc,
                      })
                    }
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ColorField
                        label="Title color"
                        value={formData.style.colors.title}
                        onChange={(c) =>
                          patchStyle("colors", { title: c })
                        }
                      />
                      <ColorField
                        label="Description color"
                        value={formData.style.colors.desc}
                        onChange={(c) =>
                          patchStyle("colors", { desc: c })
                        }
                        palette={[
                          "#4b5563",
                          "#64748b",
                          "#6b7280",
                          "#374151",
                          "#0f172a",
                          "#d94804",
                          "#dc2626",
                          "#16a34a",
                          "#4f46e5",
                          "#ffffff",
                        ]}
                      />
                    </div>
                  </CollapsibleSection>

                  {/* 3. Background & Gradient */}
                  <CollapsibleSection
                    icon={ImageIcon}
                    title="Background & Gradient"
                    subtitle="Solid or gradient background, opacity"
                    onReset={() =>
                      patchStyle("card", {
                        bgColor: DEFAULT_SERVICE_STYLE.card.bgColor,
                        gradient: JSON.parse(
                          JSON.stringify(DEFAULT_SERVICE_STYLE.card.gradient)
                        ),
                        bgOpacity: DEFAULT_SERVICE_STYLE.card.bgOpacity,
                      })
                    }
                  >
                    <ColorField
                      label={
                        formData.style.card.gradient?.enabled
                          ? "Background color (used only for gradient off)"
                          : "Background color"
                      }
                      value={formData.style.card.bgColor}
                      onChange={(c) => patchStyle("card", { bgColor: c })}
                      allowEmpty={false}
                      palette={[
                        "#f8fafc",
                        "#ffffff",
                        "#fef3ec",
                        "#eff6ff",
                        "#ecfdf5",
                        "#f5f3ff",
                        "#0f172a",
                        "#d94804",
                      ]}
                    />
                    <ToggleField
                      label="Use gradient background"
                      checked={Boolean(formData.style.card.gradient?.enabled)}
                      onChange={(on) =>
                        patchStyle("card", {
                          gradient: {
                            ...formData.style.card.gradient,
                            enabled: on,
                          },
                        })
                      }
                    />
                    {formData.style.card.gradient?.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <ColorField
                          label="Gradient start"
                          value={formData.style.card.gradient?.from}
                          onChange={(c) =>
                            patchStyle("card", {
                              gradient: {
                                ...formData.style.card.gradient,
                                from: c,
                              },
                            })
                          }
                          allowEmpty={false}
                          palette={[
                            "#f8fafc",
                            "#ffe4d1",
                            "#dbeafe",
                            "#dcfce7",
                            "#d94804",
                            "#b33d03",
                          ]}
                        />
                        <ColorField
                          label="Gradient end"
                          value={formData.style.card.gradient?.to}
                          onChange={(c) =>
                            patchStyle("card", {
                              gradient: {
                                ...formData.style.card.gradient,
                                to: c,
                              },
                            })
                          }
                          allowEmpty={false}
                          palette={[
                            "#eef2f7",
                            "#d94804",
                            "#b33d03",
                            "#0f172a",
                            "#fca5a5",
                          ]}
                        />
                      </div>
                    )}
                    <NumField
                      label="Background opacity"
                      unit="%"
                      min={0}
                      max={100}
                      value={formData.style.card.bgOpacity}
                      onChange={(n) => patchStyle("card", { bgOpacity: n })}
                    />
                  </CollapsibleSection>

                  {/* 4. Icon Styling */}
                  <CollapsibleSection
                    icon={MousePointer2}
                    title="Icon Styling"
                    subtitle="Icon color, size, container background, padding, radius"
                    onReset={() =>
                      patchStyle(
                        "icon",
                        JSON.parse(JSON.stringify(DEFAULT_SERVICE_STYLE.icon))
                      )
                    }
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ColorField
                        label="Icon color"
                        value={formData.style.icon.color}
                        onChange={(c) => patchStyle("icon", { color: c })}
                      />
                      <ColorField
                        label="Icon container background"
                        value={formData.style.icon.bgColor}
                        onChange={(c) => patchStyle("icon", { bgColor: c })}
                        palette={[
                          "#ffffff",
                          "#f8fafc",
                          "#fff5f0",
                          "#eff6ff",
                          "#ecfdf5",
                          "#0f172a",
                          "#F85606",
                          "#fca5a5",
                        ]}
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <NumField
                        label="Icon size"
                        unit="px"
                        min={12}
                        max={96}
                        value={formData.style.icon.size}
                        onChange={(n) => patchStyle("icon", { size: n })}
                      />
                      <NumField
                        label="Container size"
                        unit="px"
                        min={24}
                        max={140}
                        value={formData.style.icon.containerSize}
                        onChange={(n) => patchStyle("icon", { containerSize: n })}
                      />
                      <NumField
                        label="Container padding"
                        unit="px"
                        min={0}
                        max={40}
                        value={formData.style.icon.padding}
                        onChange={(n) => patchStyle("icon", { padding: n })}
                      />
                      <NumField
                        label="Container radius"
                        unit="px"
                        min={0}
                        max={64}
                        value={formData.style.icon.radius}
                        onChange={(n) => patchStyle("icon", { radius: n })}
                      />
                    </div>
                  </CollapsibleSection>

                  {/* 5. Image Styling */}
                  <CollapsibleSection
                    icon={ImageIcon}
                    title="Image Styling"
                    subtitle="Image size, fit, radius, border (applies when an image is set)"
                    onReset={() =>
                      patchStyle(
                        "image",
                        JSON.parse(JSON.stringify(DEFAULT_SERVICE_STYLE.image))
                      )
                    }
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <NumField
                        label="Image width"
                        unit="px"
                        min={0}
                        max={400}
                        value={formData.style.image.width}
                        onChange={(n) => patchStyle("image", { width: n })}
                      />
                      <NumField
                        label="Image height"
                        unit="px"
                        min={0}
                        max={400}
                        value={formData.style.image.height}
                        onChange={(n) => patchStyle("image", { height: n })}
                      />
                    </div>
                    <SelectField
                      label="Object fit"
                      value={formData.style.image.objectFit}
                      onChange={(v) => patchStyle("image", { objectFit: v })}
                      options={OBJECT_FITS}
                      className="max-w-[200px]"
                    />
                    <NumField
                      label="Image border radius"
                      unit="px"
                      min={0}
                      max={64}
                      value={formData.style.image.radius}
                      onChange={(n) => patchStyle("image", { radius: n })}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <NumField
                        label="Image border width"
                        unit="px (0 = none)"
                        min={0}
                        max={20}
                        value={formData.style.image.borderWidth}
                        onChange={(n) => patchStyle("image", { borderWidth: n })}
                      />
                      <ColorField
                        label="Image border color"
                        value={formData.style.image.borderColor}
                        onChange={(c) => patchStyle("image", { borderColor: c })}
                        allowEmpty={false}
                        palette={["#e2e8f0", "#cbd5e1", "#94a3b8", "#0f172a", "#F85606"]}
                      />
                    </div>
                  </CollapsibleSection>

                  {/* 6. Border, Shadow & Spacing */}
                  <CollapsibleSection
                    icon={RotateCcw}
                    title="Border, Shadow & Spacing"
                    subtitle="Card padding, gap, border, radius and drop shadow"
                    onReset={() =>
                      patchStyle("card", {
                        padding: DEFAULT_SERVICE_STYLE.card.padding,
                        spacing: DEFAULT_SERVICE_STYLE.card.spacing,
                        borderColor: DEFAULT_SERVICE_STYLE.card.borderColor,
                        borderWidth: DEFAULT_SERVICE_STYLE.card.borderWidth,
                        borderRadius: DEFAULT_SERVICE_STYLE.card.borderRadius,
                        shadow: JSON.parse(
                          JSON.stringify(DEFAULT_SERVICE_STYLE.card.shadow)
                        ),
                      })
                    }
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <NumField
                        label="Card padding"
                        unit="px"
                        min={0}
                        max={64}
                        value={formData.style.card.padding}
                        onChange={(n) => patchStyle("card", { padding: n })}
                      />
                      <NumField
                        label="Content spacing (gap)"
                        unit="px"
                        min={0}
                        max={40}
                        value={formData.style.card.spacing}
                        onChange={(n) => patchStyle("card", { spacing: n })}
                      />
                      <NumField
                        label="Border width"
                        unit="px (0 = none)"
                        min={0}
                        max={20}
                        value={formData.style.card.borderWidth}
                        onChange={(n) => patchStyle("card", { borderWidth: n })}
                      />
                      <NumField
                        label="Border radius"
                        unit="px"
                        min={0}
                        max={48}
                        value={formData.style.card.borderRadius}
                        onChange={(n) => patchStyle("card", { borderRadius: n })}
                      />
                    </div>
                    <ColorField
                      label="Border color"
                      value={formData.style.card.borderColor}
                      onChange={(c) => patchStyle("card", { borderColor: c })}
                      allowEmpty={false}
                      palette={["#e2e8f0", "#cbd5e1", "#94a3b8", "#0f172a", "#F85606"]}
                    />
                    <ToggleField
                      label="Card shadow"
                      checked={Boolean(formData.style.card.shadow?.enabled)}
                      onChange={(on) =>
                        patchStyleNested("card", "shadow", { enabled: on })
                      }
                    />
                    {formData.style.card.shadow?.enabled && (
                      <div className="grid grid-cols-2 gap-3">
                        <ColorField
                          label="Shadow color"
                          value={formData.style.card.shadow?.color}
                          onChange={(c) =>
                            patchStyleNested("card", "shadow", { color: c })
                          }
                          allowEmpty={false}
                          palette={["#0f172a", "#000000", "#d94804", "#4b5563"]}
                        />
                        <NumField
                          label="Shadow blur"
                          unit="px"
                          min={0}
                          max={40}
                          value={formData.style.card.shadow?.blur}
                          onChange={(n) =>
                            patchStyleNested("card", "shadow", { blur: n })
                          }
                        />
                      </div>
                    )}
                  </CollapsibleSection>

                  <button
                    type="button"
                    onClick={resetStyleToDefaults}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    <RotateCcw size={15} /> Reset all styles to defaults
                  </button>
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-brand-600" /> Live Preview
                </h2>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("desktop")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      previewMode === "desktop"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500"
                    }`}
                  >
                    <TabletIcon size={14} /> Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("mobile")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      previewMode === "mobile"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500"
                    }`}
                  >
                    <Smartphone size={14} /> Mobile
                  </button>
                </div>
              </div>
              <ServiceCardPreview form={formData} mode={previewMode} />
              <p className="text-xs text-gray-400 mt-3 text-center">
                Preview matches the card rendered on the homepage.
              </p>
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
                {filteredServices.map((service) => {
                  const style = normalizeServiceStyle(service.style, service);
                  return (
                    <div
                      key={service._id || service.id}
                      className={`bg-gray-50 rounded-lg p-4 border ${
                        editingId === (service._id || service.id)
                          ? "border-emerald-500 ring-1 ring-brand-500"
                          : "border-gray-200"
                      } hover:border-gray-300 transition-all`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="flex items-center justify-center flex-shrink-0"
                          style={serviceIconContainerStyle(style)}
                        >
                          {service.imageUrl ? (
                            <img
                              src={service.imageUrl}
                              alt={service.title}
                              style={serviceImageStyle(style)}
                            />
                          ) : (
                            <IconByName
                              name={
                                service.iconName || service.iconType || "Palette"
                              }
                              size={serviceIconSize(style)}
                              color={serviceIconColor(style)}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className="font-bold truncate flex items-center gap-2"
                            style={serviceTitleStyle(style)}
                          >
                            {service.title}
                          </h3>
                          <p className="mt-1 line-clamp-2" style={serviceDescStyle(style)}>
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
                  );
                })}
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
