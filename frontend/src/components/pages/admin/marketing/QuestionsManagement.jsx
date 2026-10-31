import React, { useState, useEffect } from "react";
import api from "@/utils/api";
import { useNavigate } from "react-router-dom";
import { Trash2, Eye, EyeOff, HelpCircle, MessageSquare, Info, ChevronDown, ChevronUp } from "lucide-react";
import Swal from "sweetalert2";
import { onSocketEvent } from "@/utils/socket";

export default function QuestionsManagement() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showGuide, setShowGuide] = useState(false);

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

      <div className="bg-blue-50 border border-blue-100 rounded-2xl overflow-hidden mb-4 sm:mb-6">
        <button
          onClick={() => setShowGuide((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-blue-800 hover:bg-blue-100/50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Info size={18} className="text-blue-500" />
            How to use this page (quick guide)
          </span>
          {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showGuide && (
          <div className="px-4 pb-4 text-sm text-blue-900 space-y-4">
            <div>
              <p className="font-semibold mb-1.5">Where do questions come from?</p>
              <p className="leading-relaxed">
                Customers ask them on the <strong>product page</strong> — in the{" "}
                <strong>Questions &amp; Answers</strong> tab (logged-in customers only). Every question
                here belongs to a product — click the product name under a question to jump straight to it.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1.5">How to reply to a question (3 steps)</p>
              <ol className="list-decimal list-inside space-y-1 leading-relaxed">
                <li>Open the product page (click the blue product link on the question card).</li>
                <li>Go to the <strong>Questions &amp; Answers</strong> tab and click <strong>Answer</strong> under the question.</li>
                <li>Write your reply and submit — it appears on the product page instantly for <em>all</em> customers, including the one who asked.</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold mb-1.5">Understanding each question card</p>
              <ul className="list-disc list-inside space-y-1 leading-relaxed">
                <li><strong>Name + date</strong> — who asked and when.</li>
                <li><strong>Status</strong> — <span className="inline-block px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">active</span> = visible on the product page; <span className="inline-block px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">hidden</span> = customers can't see it (it's still saved).</li>
                <li><strong>Answer count</strong> — how many replies the question has so far.</li>
                <li><strong>Product link</strong> — where the question was asked; click it to manage it.</li>
                <li><strong>Grey box under the question</strong> — preview of the replies already given.</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-1.5">The two buttons on each card</p>
              <ul className="list-disc list-inside space-y-1 leading-relaxed">
                <li><strong>👁 Eye icon</strong> — hide or show the question to customers (hiding is instant; the question data is kept).</li>
                <li><strong>🗑 Trash icon</strong> — permanently deletes the question <em>and all its answers</em>. There is no undo — hide it instead if you just want to clean up the product page.</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-1.5">Useful tips</p>
              <ul className="list-disc list-inside space-y-1 leading-relaxed">
                <li>The <strong>Live</strong> badge in the header is real: the list refreshes automatically when a question is asked, answered, hidden, or deleted — no need to reload.</li>
                <li>Use the <strong>All / Active / Hidden</strong> tabs to filter the list (e.g. to find unanswered or hidden questions).</li>
                <li>Use <strong>Hide</strong> for spam or off-topic questions — you lose no data.</li>
              </ul>
            </div>
          </div>
        )}
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
