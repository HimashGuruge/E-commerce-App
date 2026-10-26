import React, { useState, useEffect, useMemo } from "react";
import api from "@/utils/api";
import Swal from "sweetalert2";
import {
  MdDelete,
  MdEdit,
  MdToggleOn,
  MdToggleOff,
  MdCampaign,
  MdRefresh,
  MdFormatBold,
  MdFormatItalic,
  MdFormatUnderlined,
  MdFormatStrikethrough,
  MdFormatAlignLeft,
  MdFormatAlignCenter,
  MdFormatAlignRight,
  MdRestartAlt,
  MdDesktopMac,
  MdSmartphone,
} from "react-icons/md";
import { Sparkles, Star, Zap, Gift, Award, Clock, Shield, Truck } from "lucide-react";
import {
  DEFAULT_ANNOUNCEMENT_STYLE,
  DEFAULT_BAR_STYLE,
  normalizeAnnouncementStyle,
  normalizeBarStyle,
  isHex,
  announcementItemStyle,
  barBackgroundStyle,
  announcementTextColor,
} from "@/utils/announcementStyle";
import { getPublicSettings } from "@/utils/siteSettings";

const ICON_OPTIONS = [
  { name: "Sparkles", component: Sparkles },
  { name: "Star", component: Star },
  { name: "Zap", component: Zap },
  { name: "Gift", component: Gift },
  { name: "Award", component: Award },
  { name: "Clock", component: Clock },
  { name: "Shield", component: Shield },
  { name: "Truck", component: Truck },
];

const ICON_MAP = Object.fromEntries(ICON_OPTIONS.map((i) => [i.name, i.component]));

const FONT_OPTIONS = [
  { key: "default", label: "Default (site font)", family: "" },
  { key: "inter", label: "Inter", family: "Inter, system-ui, -apple-system, sans-serif" },
  { key: "system", label: "System", family: "system-ui, -apple-system, sans-serif" },
  { key: "poppins", label: "Poppins", family: "Poppins, system-ui, sans-serif" },
  { key: "roboto", label: "Roboto", family: "Roboto, system-ui, sans-serif" },
  { key: "opensans", label: "Open Sans", family: "'Open Sans', system-ui, sans-serif" },
  { key: "montserrat", label: "Montserrat", family: "Montserrat, system-ui, sans-serif" },
  { key: "lato", label: "Lato", family: "Lato, system-ui, sans-serif" },
  { key: "playfair", label: "Playfair Display", family: "'Playfair Display', Georgia, serif" },
];

const TEXT_PRESETS = ["#ffffff", "#0f172a", "#facc15", "#f87171", "#4ade80", "#60a5fa", "#f472b6", "#c4b5fd"];

const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";
const inputCls =
  "w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white";

function SectionCard({ title, icon, action, children }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <span className="text-brand-500">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function SmallReset({ onClick, label = "Reset" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
    >
      <MdRestartAlt size={14} />
      {label}
    </button>
  );
}

function ColorField({ label, value, onChange, placeholder, emptyAllowed = true }) {
  const [touched, setTouched] = useState(false);
  const [localValue, setLocalValue] = useState(value || "");

  // Keep the local text input in sync when value changes from outside (reset, preset swatch).
  useEffect(() => {
    if (!touched) setLocalValue(value || "");
  }, [value, touched]);

  const valid = isHex(value || localValue);

  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={isHex(value) ? value : isHex(localValue) ? localValue : "#ffffff"}
          onChange={(e) => {
            const v = e.target.value;
            setLocalValue(v);
            onChange(v);
          }}
          className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
          title={label}
        />
        <input
          type="text"
          value={localValue}
          placeholder={placeholder}
          onChange={(e) => {
            setTouched(true);
            setLocalValue(e.target.value);
            if (isHex(e.target.value)) onChange(e.target.value);
          }}
          onBlur={() => {
            if (!isHex(localValue)) {
              if (emptyAllowed) onChange("");
              setLocalValue(value || "");
              setTouched(false);
            }
          }}
          className={`flex-1 px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 font-mono ${
            touched && !valid && !isHex(localValue) && localValue ? "border-red-300 focus:ring-red-200 focus:border-red-400" : "border-slate-200 focus:border-brand-500"
          }`}
        />
      </div>
      {touched && localValue && !isHex(localValue) && (
        <p className="text-xs text-red-500 mt-1">Enter a valid hex color, e.g. #ff6600</p>
      )}
    </div>
  );
}

export default function AnnouncementManagement() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [icon, setIcon] = useState("Sparkles");
  const [order, setOrder] = useState(0);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Per-announcement text styling
  const [style, setStyle] = useState(DEFAULT_ANNOUNCEMENT_STYLE);
  // Global ticker bar styling (persisted in site settings)
  const [bar, setBar] = useState(DEFAULT_BAR_STYLE);
  const [previewMode, setPreviewMode] = useState("desktop");
  const [savingBar, setSavingBar] = useState(false);

  const setStyleField = (patch) => setStyle((prev) => ({ ...prev, ...patch }));

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/announcements");
      setAnnouncements(res.data?.announcements || []);
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    getPublicSettings()
      .then((s) => {
        if (s?.announcement) setBar(normalizeBarStyle(s.announcement));
      })
      .catch(() => {});
  }, []);

  const resetForm = () => {
    setText("");
    setIcon("Sparkles");
    setOrder(0);
    setStyle(DEFAULT_ANNOUNCEMENT_STYLE);
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      Swal.fire({ icon: "warning", title: "Required", text: "Announcement text is required" });
      return;
    }
    setSubmitting(true);
    const cleanStyle = normalizeAnnouncementStyle(style);
    try {
      if (editing) {
        await api.put(`/api/announcements/${editing._id}`, { text: text.trim(), icon, order, style: cleanStyle });
        Swal.fire({ icon: "success", title: "Updated", timer: 1500, showConfirmButton: false });
      } else {
        await api.post("/api/announcements", { text: text.trim(), icon, order, style: cleanStyle });
        Swal.fire({ icon: "success", title: "Created", timer: 1500, showConfirmButton: false });
      }
      resetForm();
      fetchAnnouncements();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed to save" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setText(item.text);
    setIcon(item.icon || "Sparkles");
    setOrder(item.order ?? 0);
    setStyle(normalizeAnnouncementStyle(item.style));
    setEditing(item);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete?",
      text: "This announcement will be removed",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/api/announcements/${id}`);
      fetchAnnouncements();
      Swal.fire({ icon: "success", title: "Deleted", timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: "Failed to delete" });
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.patch(`/api/announcements/${id}/status`);
      fetchAnnouncements();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: "Failed to toggle status" });
    }
  };

  const handleBarSave = async () => {
    setSavingBar(true);
    const clean = normalizeBarStyle(bar);
    setBar(clean);
    try {
      await api.put("/api/settings", { announcement: clean });
      Swal.fire({ icon: "success", title: "Saved", text: "Background styling applied to the homepage ticker", timer: 1800, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed to save background" });
    } finally {
      setSavingBar(false);
    }
  };

  const handleResetAll = () => {
    setStyle(DEFAULT_ANNOUNCEMENT_STYLE);
    setBar(normalizeBarStyle({ ...DEFAULT_BAR_STYLE }));
  };

  const renderIcon = (iconName, size = 16) => {
    const IconComp = ICON_MAP[iconName];
    if (!IconComp) return null;
    return <IconComp size={size} />;
  };

  // Draft (being edited) is merged into the active list so the preview always
  // reflects what will be submitted.
  const previewItems = useMemo(() => {
    const active = announcements
      .filter((a) => a.status === "active")
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (!text.trim()) return active;
    const draftItem = editing ? { ...editing, text: text.trim(), icon, order, style } : { _id: "__draft__", text: text.trim(), icon, order, style };
    if (editing) return active.map((a) => (a._id === editing._id ? draftItem : a));
    return [...active, draftItem];
  }, [announcements, text, icon, order, style, editing]);

  const barStyleObj = barBackgroundStyle(bar);
  const previewTextColor = announcementTextColor({}, bar);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Announcement Ticker</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage the scrolling announcement bar and its styling
          </p>
        </div>
        <button onClick={fetchAnnouncements} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <MdRefresh size={20} />
        </button>
      </div>

      {/* Add / Edit */}
      <SectionCard title={editing ? "Edit Announcement" : "Add New Announcement"} icon={<MdCampaign size={18} />}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Text</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Free Shipping on Orders Over Rs. 5000"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Icon</label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map((opt) => (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setIcon(opt.name)}
                    className={`p-2 rounded-lg border transition-all ${
                      icon === opt.name
                        ? "border-brand-500 bg-brand-50 text-brand-600 ring-2 ring-brand-200"
                        : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                    }`}
                    title={opt.name}
                  >
                    <opt.component size={18} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Order</label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                min="0"
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
            >
              {editing ? "Update" : "Add"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </SectionCard>

      {/* Text Formatting */}
      <div className="mt-6">
        <SectionCard
          title="Text Formatting"
          icon={
            <button type="button" onClick={() => setStyle(DEFAULT_ANNOUNCEMENT_STYLE)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors" title="Reset all text formatting">
              <MdRestartAlt size={14} /> Reset
            </button>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: "bold", label: "Bold", icon: <MdFormatBold size={16} /> },
                { key: "italic", label: "Italic", icon: <MdFormatItalic size={16} /> },
                { key: "underline", label: "Underline", icon: <MdFormatUnderlined size={16} /> },
                { key: "strike", label: "Strikethrough", icon: <MdFormatStrikethrough size={16} /> },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setStyleField({ [t.key]: !style[t.key] })}
                  title={t.label}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    style[t.key]
                      ? "border-brand-500 bg-brand-50 text-brand-600"
                      : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelCls} title="Font size in pixels (10-48)">Font Size</label>
                <input
                  type="number"
                  min="10"
                  max="48"
                  value={style.fontSize}
                  placeholder="18"
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      setStyleField({ fontSize: "" });
                    } else {
                      const v = Number(raw);
                      if (Number.isFinite(v)) setStyleField({ fontSize: Math.min(48, Math.max(10, v)) });
                    }
                  }}
                  onBlur={() => {
                    if (style.fontSize === "" || style.fontSize === undefined) setStyleField({ fontSize: 18 });
                  }}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Font Family</label>
                <select
                  value={style.fontFamily}
                  onChange={(e) => setStyleField({ fontFamily: e.target.value })}
                  className={`${inputCls} bg-white`}
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.key} value={f.family}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Font Weight</label>
                <select
                  value={style.fontWeight}
                  onChange={(e) => setStyleField({ fontWeight: Number(e.target.value) })}
                  className={`${inputCls} bg-white`}
                >
                  {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => (
                    <option key={w} value={w}>
                      {w === 400 ? "Normal" : w === 600 ? "Semi-bold" : w === 700 ? "Bold" : w}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Case</label>
                <select
                  value={style.transform}
                  onChange={(e) => setStyleField({ transform: e.target.value })}
                  className={`${inputCls} bg-white`}
                >
                  <option value="none">None</option>
                  <option value="uppercase">UPPERCASE</option>
                  <option value="lowercase">lowercase</option>
                  <option value="capitalize">Capitalize</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Text Alignment</label>
              <div className="flex gap-2">
                {[
                  { key: "left", icon: <MdFormatAlignLeft size={16} /> },
                  { key: "center", icon: <MdFormatAlignCenter size={16} /> },
                  { key: "right", icon: <MdFormatAlignRight size={16} /> },
                ].map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => setStyleField({ align: a.key })}
                    title={a.key}
                    className={`p-2.5 rounded-lg border transition-all ${
                      style.align === a.key
                        ? "border-brand-500 bg-brand-50 text-brand-600"
                        : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                    }`}
                  >
                    {a.icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Text Colors */}
      <div className="mt-6">
        <SectionCard
          title="Text Colors"
          icon={
            <SmallReset label="Reset Colors" onClick={() => setStyleField({ color: "", highlight: "" })} />
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ColorField
              label="Text Color"
              value={style.color}
              onChange={(v) => setStyleField({ color: v })}
              placeholder="#ffffff (blank = bar default)"
            />
            <ColorField
              label="Highlight Color"
              value={style.highlight}
              onChange={(v) => setStyleField({ highlight: v })}
              placeholder="#fde047 (blank = none)"
            />
          </div>
          <div className="mt-4">
            <label className={labelCls}>Preset Palette</label>
            <div className="flex flex-wrap gap-2">
              {TEXT_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setStyleField({ color: c })}
                  title={c}
                  className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${
                    style.color === c ? "border-brand-500 ring-2 ring-brand-200" : "border-white"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Swatches set the text color. Blank keeps the bar default.</p>
          </div>
        </SectionCard>
      </div>

      {/* Text Spacing */}
      <div className="mt-6">
        <SectionCard
          title="Text Spacing"
          icon={
            <SmallReset
              label="Reset Spacing"
              onClick={() =>
                setStyleField({
                  letterSpacing: 0,
                  wordSpacing: 0,
                  lineHeight: 1.4,
                  shadow: { ...DEFAULT_ANNOUNCEMENT_STYLE.shadow },
                })
              }
            />
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-700">Letter Spacing</label>
                <span className="text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5">{style.letterSpacing}px</span>
              </div>
              <input
                type="range"
                min="-5"
                max="20"
                step="0.5"
                value={style.letterSpacing}
                onChange={(e) => setStyleField({ letterSpacing: Number(e.target.value) })}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-700">Word Spacing</label>
                <span className="text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5">{style.wordSpacing}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={style.wordSpacing}
                onChange={(e) => setStyleField({ wordSpacing: Number(e.target.value) })}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-700">Line Height</label>
                <span className="text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5">{style.lineHeight}</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="3"
                step="0.1"
                value={style.lineHeight}
                onChange={(e) => setStyleField({ lineHeight: Number(e.target.value) })}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="mt-4 p-4 bg-slate-50 rounded-xl">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={style.shadow.enabled}
                onChange={(e) => setStyleField({ shadow: { ...style.shadow, enabled: e.target.checked } })}
                className="w-4 h-4 accent-brand-500"
              />
              Text Shadow
            </label>
            {style.shadow.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <ColorField
                  label="Shadow Color"
                  value={style.shadow.color}
                  onChange={(v) => setStyleField({ shadow: { ...style.shadow, color: v || "#0f172a" } })}
                  placeholder="#0f172a"
                  emptyAllowed={false}
                />
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-slate-700">Blur</label>
                    <span className="text-xs font-mono text-slate-500 bg-white border border-slate-200 rounded-md px-2 py-0.5">{style.shadow.blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="1"
                    value={style.shadow.blur}
                    onChange={(e) => setStyleField({ shadow: { ...style.shadow, blur: Number(e.target.value) } })}
                    className="w-full accent-brand-500 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Background Styling */}
      <div className="mt-6">
        <SectionCard
          title="Ticker Background"
          icon={
            <span className="flex items-center gap-2">
              <SmallReset label="Reset" onClick={() => setBar(normalizeBarStyle({ ...DEFAULT_BAR_STYLE }))} />
              <button
                type="button"
                onClick={handleBarSave}
                disabled={savingBar}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 rounded-lg transition"
              >
                {savingBar ? (
                  <><div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> Saving</>
                ) : (
                  "Save Background"
                )}
              </button>
            </span>
          }
        >
          <p className="text-xs text-slate-500 mb-4">Applies to the whole ticker bar on the home page.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ColorField
              label="Background Color"
              value={bar.bgColor}
              onChange={(v) => setBar((prev) => ({ ...prev, bgColor: v }))}
              placeholder="#F85606"
              emptyAllowed={false}
            />
            <ColorField
              label="Border Color"
              value={bar.borderColor}
              onChange={(v) => setBar((prev) => ({ ...prev, borderColor: v }))}
              placeholder="#ffffff"
              emptyAllowed={false}
            />
          </div>

          <div className="mt-4 p-4 bg-slate-50 rounded-xl">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={bar.gradient.enabled}
                onChange={(e) => setBar((prev) => ({ ...prev, gradient: { ...prev.gradient, enabled: e.target.checked } }))}
                className="w-4 h-4 accent-brand-500"
              />
              Gradient Background
            </label>
            {bar.gradient.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <ColorField
                  label="From"
                  value={bar.gradient.from}
                  onChange={(v) => setBar((prev) => ({ ...prev, gradient: { ...prev.gradient, from: v } }))}
                  placeholder="#FF8A3D"
                  emptyAllowed={false}
                />
                <ColorField
                  label="To"
                  value={bar.gradient.to}
                  onChange={(v) => setBar((prev) => ({ ...prev, gradient: { ...prev.gradient, to: v } }))}
                  placeholder="#C2410C"
                  emptyAllowed={false}
                />
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-700">Background Opacity</label>
                <span className="text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5">{bar.bgOpacity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="1"
                value={bar.bgOpacity}
                onChange={(e) => setBar((prev) => ({ ...prev, bgOpacity: Number(e.target.value) }))}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-700">Padding</label>
                <span className="text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5">{bar.padding}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={bar.padding}
                onChange={(e) => setBar((prev) => ({ ...prev, padding: Number(e.target.value) }))}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-700">Border Width</label>
                <span className="text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5">{bar.borderWidth}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={bar.borderWidth}
                onChange={(e) => setBar((prev) => ({ ...prev, borderWidth: Number(e.target.value) }))}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-700">Border Radius</label>
                <span className="text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5">{bar.borderRadius}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="1"
                value={bar.borderRadius}
                onChange={(e) => setBar((prev) => ({ ...prev, borderRadius: Number(e.target.value) }))}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Live Preview */}
      <div className="mt-6">
        <SectionCard
          title="Live Preview"
          icon={
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  previewMode === "desktop" ? "bg-brand-500 text-white" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                <MdDesktopMac size={14} /> Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  previewMode === "mobile" ? "bg-brand-500 text-white" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                <MdSmartphone size={14} /> Mobile
              </button>
              <SmallReset label="Reset All" onClick={handleResetAll} />
            </span>
          }
        >
          <div className={previewMode === "mobile" ? "max-w-[375px] mx-auto" : ""}>
            <div className="relative leading-[0] text-[0] overflow-hidden" style={barStyleObj}>
              <style>{`
                @keyframes annPrevScroll {
                  0% { transform: translateX(100vw); }
                  100% { transform: translateX(-100%); }
                }
                .ann-preview-track:hover { animation-play-state: paused; }
              `}</style>
              <div className="relative w-full overflow-hidden">
                <div
                  className="ann-preview-track flex w-max whitespace-nowrap"
                  style={{ animation: `annPrevScroll ${Math.max(5, Math.min(120, bar.speed || 12))}s linear infinite` }}
                >
                  <div className="flex shrink-0 items-center gap-12 px-8">
                    {previewItems.length > 0 ? (
                      previewItems.map((item) => (
                        <span
                          key={item._id}
                          className="flex items-center gap-2.5 shrink-0"
                          style={announcementItemStyle(item.style, bar)}
                        >
                          <span className="shrink-0" style={{ color: announcementTextColor(item.style, bar), opacity: 0.7, display: "inline-flex" }}>
                            {renderIcon(item.icon, 15)}
                          </span>
                          {String(item.text)}
                        </span>
                      ))
                    ) : (
                      <span className="shrink-0" style={{ color: previewTextColor, opacity: 0.7 }}>
                        No active announcements
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Preview matches the homepage ticker. Styles apply per announcement; blank colors use the bar defaults from site settings.
          </p>
        </SectionCard>
      </div>

      {/* All announcements */}
      <div className="mt-6">
        <SectionCard title={`All Announcements (${announcements.length})`} icon={<MdCampaign size={18} className="text-brand-500" />}>
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Loading...</div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No announcements yet. Add one above.
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg ${item.status === "active" ? "bg-brand-100 text-brand-600" : "bg-slate-200 text-slate-400"}`}>
                      {renderIcon(item.icon, 18)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.text}</p>
                      <p className="text-xs text-slate-400">
                        Order: {item.order ?? 0} &middot; {item.status}
                        {item.style && Object.keys(item.style).length > 0 && " · custom style"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(item._id)}
                      className={`p-2 rounded-lg transition-colors ${
                        item.status === "active"
                          ? "text-green-600 hover:bg-green-50"
                          : "text-slate-400 hover:bg-slate-100"
                      }`}
                      title={item.status === "active" ? "Deactivate" : "Activate"}
                    >
                      {item.status === "active" ? <MdToggleOn size={20} /> : <MdToggleOff size={20} />}
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <MdEdit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <MdDelete size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
