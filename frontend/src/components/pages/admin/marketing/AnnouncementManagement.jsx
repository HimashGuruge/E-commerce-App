import React, { useState, useEffect } from "react";
import api from "@/utils/api";
import Swal from "sweetalert2";
import {
  MdAdd,
  MdDelete,
  MdEdit,
  MdToggleOn,
  MdToggleOff,
  MdCampaign,
  MdRefresh,
} from "react-icons/md";
import { Sparkles, Star, Zap, Gift, Award, Clock, Shield, Truck } from "lucide-react";

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

export default function AnnouncementManagement() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [icon, setIcon] = useState("Sparkles");
  const [order, setOrder] = useState(0);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => { fetchAnnouncements(); }, []);

  const resetForm = () => {
    setText("");
    setIcon("Sparkles");
    setOrder(0);
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      Swal.fire({ icon: "warning", title: "Required", text: "Announcement text is required" });
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/api/announcements/${editing._id}`, { text: text.trim(), icon, order });
        Swal.fire({ icon: "success", title: "Updated", timer: 1500, showConfirmButton: false });
      } else {
        await api.post("/api/announcements", { text: text.trim(), icon, order });
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

  const renderIcon = (iconName, size = 16) => {
    const IconComp = ICON_MAP[iconName];
    if (!IconComp) return null;
    return <IconComp size={size} />;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Announcement Ticker</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage the scrolling announcement bar on the home page
          </p>
        </div>
        <button
          onClick={fetchAnnouncements}
          className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <MdRefresh size={20} />
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <MdCampaign className="text-brand-500" />
          {editing ? "Edit Announcement" : "Add New Announcement"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Text</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Free Shipping on Orders Over Rs. 5000"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Icon</label>
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
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Order</label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
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
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-4">
          All Announcements ({announcements.length})
        </h2>

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
      </div>

      <div className="mt-6 bg-slate-900 rounded-xl p-4 overflow-hidden">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Preview</p>
        <div className="flex overflow-hidden whitespace-nowrap">
          <div className="flex gap-8 text-white text-xs font-bold uppercase tracking-widest">
            {announcements.filter((a) => a.status === "active").length > 0 ? (
              announcements
                .filter((a) => a.status === "active")
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((item) => (
                  <span key={item._id} className="flex items-center gap-2 flex-shrink-0">
                    {renderIcon(item.icon, 12)}
                    {item.text}
                  </span>
                ))
            ) : (
              <span className="text-slate-600">No active announcements</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
