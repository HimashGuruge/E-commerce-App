import React, { useState, useEffect } from "react";
import api from "@/utils/api";
import { useNavigate } from "react-router-dom";
import { Trash2, Eye, EyeOff, HelpCircle, MessageSquare } from "lucide-react";
import Swal from "sweetalert2";
import { onSocketEvent } from "@/utils/socket";

export default function QuestionsManagement() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = filter === "all" ? "" : `?status=${filter}`;
      const { data } = await api.get(`/api/questions/all${params}`);
      setQuestions(data.questions || []);
    } catch (err) {
      console.error("Error fetching questions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuestions(); }, [filter]);

  // Live update: the server sends admin:stats-changed on every question
  // ask/answer/delete/status-change, so the list stays current with no
  // manual refresh.
  useEffect(() => {
    return onSocketEvent("admin:stats-changed", (data) => {
      if (data?.type === "question") fetchQuestions();
    });
  }, []);

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const { data } = await api.patch(`/api/questions/${id}/status`);
      if (data.success) {
        setQuestions(prev => prev.map(q => q._id === id ? data.question : q));
        Swal.fire({
          icon: "success",
          title: currentStatus === "active" ? "Question Hidden" : "Question Visible",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      Swal.fire("Error", err.response?.data?.error || "Failed to update status", "error");
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete Question",
      text: "Are you sure? This will permanently delete the question and its answers.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete!",
    });

    if (result.isConfirmed) {
      try {
        const { data } = await api.delete(`/api/questions/${id}`);
        if (data.success) {
          setQuestions(prev => prev.filter(q => q._id !== id));
          Swal.fire("Deleted!", "Question has been deleted.", "success");
        }
      } catch (err) {
        Swal.fire("Error", err.response?.data?.error || "Failed to delete", "error");
      }
    }
  };

  const stats = {
    total: questions.length,
    active: questions.filter(q => q.status === "active").length,
    hidden: questions.filter(q => q.status === "hidden").length,
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Q&A Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage customer questions across products</p>
        </div>
        <span
          className="flex items-center gap-1.5 text-xs text-emerald-600"
          title="This page updates live when questions change"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Live
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total", value: stats.total, color: "text-blue-600 bg-blue-100" },
          { label: "Active", value: stats.active, color: "text-green-600 bg-green-100" },
          { label: "Hidden", value: stats.hidden, color: "text-amber-600 bg-amber-100" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color.split(" ")[0]}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {["all", "active", "hidden"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm rounded-lg font-medium transition capitalize ${
              filter === f
                ? "bg-brand-500 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No questions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q._id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-500">
                      {q.user?.name || "Anonymous"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(q.createdAt).toLocaleDateString()}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      q.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {q.status}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {q.answers?.length || 0} answer{(q.answers?.length || 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="text-sm text-slate-900 font-medium mb-1">{q.question}</p>
                  {q.product && (
                    <button
                      onClick={() => navigate(`/product/${q.product._id}`)}
                      className="text-xs text-brand-500 hover:text-brand-600 hover:underline truncate block max-w-md"
                    >
                      {q.product.name || q.product._id}
                    </button>
                  )}
                  {/* Answers Preview */}
                  {q.answers?.length > 0 && (
                    <div className="mt-2 pl-3 border-l-2 border-slate-200 space-y-1">
                      {q.answers.map((a, idx) => (
                        <p key={idx} className="text-xs text-slate-600">
                          <span className="font-medium text-slate-700">{a.user?.name || "Staff"}:</span>{" "}
                          {a.answer}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleStatus(q._id, q.status)}
                    className={`p-2 rounded-lg transition ${
                      q.status === "active"
                        ? "text-amber-600 hover:bg-amber-50"
                        : "text-green-600 hover:bg-green-50"
                    }`}
                    title={q.status === "active" ? "Hide" : "Show"}
                  >
                    {q.status === "active" ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <button
                    onClick={() => handleDelete(q._id)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
