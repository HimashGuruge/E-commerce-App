import { useState, useEffect, useCallback } from "react";
import {
  FiDollarSign, FiCheckCircle, FiX, FiSearch, FiEye,
} from "react-icons/fi";
import { MdPayment } from "react-icons/md";
import api from "@/utils/api";
import Swal from "sweetalert2";
import { onSocketEvent } from "@/utils/socket";

// Status → badge color
const collectionStatusBadge = {
  pending_collection: "bg-amber-100 text-amber-700",
  collected: "bg-blue-100 text-blue-700",
  eligible_for_payout: "bg-indigo-100 text-indigo-700",
  paid: "bg-green-100 text-green-700",
  failed: "bg-slate-100 text-slate-600",
  reversed: "bg-rose-100 text-rose-700",
};

const payoutStatusBadge = {
  processing: "bg-amber-100 text-amber-700",
  eligible_for_payout: "bg-indigo-100 text-indigo-700",
  paid: "bg-green-100 text-green-700",
  failed: "bg-rose-100 text-rose-700",
};

const rs = (n) => `Rs. ${(Number(n) || 0).toLocaleString()}`;
const dstr = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export default function AdminSellerPayouts() {
  const [tab, setTab] = useState("board"); // board | collections | payouts
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState([]);
  const [collections, setCollections] = useState([]);
  const [payouts, setPayouts] = useState([]);

  // Filters
  const [sellerFilter, setSellerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [boardRes, collRes, payRes] = await Promise.all([
        api.get("/api/sellers/admin/payouts/board"),
        api.get("/api/sellers/admin/payouts/collections"),
        api.get("/api/sellers/admin/payouts"),
      ]);
      if (boardRes.data.success) setBoard(boardRes.data.board || []);
      if (collRes.data.success) setCollections(collRes.data.collections || []);
      if (payRes.data.success) setPayouts(payRes.data.payouts || []);
    } catch (err) {
      console.error("Fetch payouts error:", err);
      Swal.fire({ icon: "error", title: "Failed to load payout data" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live update: the server sends admin:stats-changed on every payout event
  // (delivery, verify, payout created, marked paid/failed, backfill, cron),
  // so the board stays current with no manual refresh.
  useEffect(() => {
    return onSocketEvent("admin:stats-changed", (data) => {
      if (data?.type === "payout") fetchData();
    });
  }, [fetchData]);

  // ---- Verify a pending collection ----
  const verifyCollection = async (c) => {
    const res = await Swal.fire({
      title: `Verify collection for order #${String(c.order?._id || c.order).slice(-8)}`,
      icon: "question",
      html: `
        Expected COD: <b>${rs(c.expectedAmount)}</b><br/>
        Rate: <b>${c.commissionRate || 0}%</b> (commission ${rs(c.commissionAmount)})
      `,
      input: "form",
      inputOptions: {
        grossCollected: { label: "Amount received from courier (Rs.)", placeholder: "e.g. 4500", required: true },
        courier: { label: "Courier (optional)", placeholder: "e.g. Domex" },
        settlementRef: { label: "Courier settlement reference (required)", placeholder: "e.g. DNK-102938", required: true },
      },
      showCancelButton: true,
      confirmButtonText: "Verify",
      reverseButtons: true,
    });
    if (!res.isConfirmed) return;
    try {
      await api.post(`/api/sellers/admin/payouts/collections/${c._id}/verify`, {
        grossCollected: Number(res.value.grossCollected),
        courier: res.value.courier || "",
        settlementRef: res.value.settlementRef,
      });
      Swal.fire({ icon: "success", title: "Collection verified", timer: 1500, showConfirmButton: false });
      fetchData();
    } catch (err) {
      Swal.fire({ icon: "error", title: err.response?.data?.error || err.response?.data?.message || "Failed to verify" });
    }
  };

  // ---- Create a payout batch for a seller ----
  const createPayoutFromBoard = async (sellerId) => {
    const seller = board.find((s) => s.seller === sellerId);
    const sellerCollections = collections.filter(
      (c) => String(c.seller) === sellerId && c.type === "collection" &&
        ["collected", "eligible_for_payout"].includes(c.status) && !c.allocatedPayout
    );
    if (!sellerCollections.length) {
      Swal.fire({ icon: "info", title: "No verified collections to pay out yet" });
      return;
    }
    const res = await Swal.fire({
      title: `Create payout for ${seller?.shopName || "seller"}`,
      icon: "question",
      html: `
        Collections available: <b>${sellerCollections.length}</b><br/>
        Gross: <b>${rs(sellerCollections.reduce((s, c) => s + (+c.grossCollected || 0), 0))}</b><br/>
        Commission: <b>${rs(sellerCollections.reduce((s, c) => s + (+c.commissionAmount || 0), 0))}</b>
      `,
      input: "text",
      inputLabel: "Authorised deductions (optional, Rs.)",
      inputPlaceholder: "0",
      showCancelButton: true,
      confirmButtonText: "Create payout",
      reverseButtons: true,
    });
    if (!res.isConfirmed) return;
    try {
      await api.post("/api/sellers/admin/payouts", {
        seller: sellerId,
        collectionIds: sellerCollections.map((c) => c._id),
        deductions: Number(res.value) || 0,
      });
      Swal.fire({ icon: "success", title: "Payout batch created", timer: 1500, showConfirmButton: false });
      fetchData();
    } catch (err) {
      Swal.fire({ icon: "error", title: err.response?.data?.error || err.response?.data?.message || "Failed to create payout" });
    }
  };

  // ---- Mark payout paid ----
  const markPaid = async (p) => {
    const res = await Swal.fire({
      title: `Confirm payout paid`,
      text: `Net payable: ${rs(p.netPayable)} to ${p.seller?.shopName || "seller"}`,
      icon: "warning",
      html: "Record the <b>real</b> bank transfer reference. The site does not move money — this only records the confirmed transfer.",
      input: "text",
      inputLabel: "Payment reference (required)",
      inputPlaceholder: "e.g. NEFT-447192",
      showCancelButton: true,
      confirmButtonText: "Mark as paid",
      confirmButtonColor: "#10b981",
      reverseButtons: true,
    });
    if (!res.isConfirmed) return;
    try {
      await api.put(`/api/sellers/admin/payouts/${p._id}/mark-paid`, { paymentRef: res.value });
      Swal.fire({ icon: "success", title: "Payout marked paid", timer: 1500, showConfirmButton: false });
      fetchData();
    } catch (err) {
      Swal.fire({ icon: "error", title: err.response?.data?.error || "Failed", text: "A payout can only be paid once. The original reference is preserved." });
    }
  };

  // ---- Mark payout failed ----
  const markFailed = async (p) => {
    const res = await Swal.fire({
      title: "Mark payout failed",
      input: "text",
      inputLabel: "Reason (required)",
      inputPlaceholder: "e.g. bank details incorrect",
      showCancelButton: true,
      confirmButtonText: "Mark failed",
      confirmButtonColor: "#ef4444",
    });
    if (!res.isConfirmed) return;
    try {
      await api.put(`/api/sellers/admin/payouts/${p._id}/mark-failed`, { reason: res.value });
      Swal.fire({ icon: "success", title: "Payout marked failed", timer: 1500, showConfirmButton: false });
      fetchData();
    } catch (err) {
      Swal.fire({ icon: "error", title: err.response?.data?.error || "Failed to mark payout failed" });
    }
  };

  // ---- Backfill snapshot for a single old order ----
  const backfillOrder = async (orderId) => {
    const yes = await Swal.fire({
      title: "Backfill commission snapshot?",
      text: "This stores the seller's current rate as the historical snapshot for this COD order. Only the affected collection row is changed.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Backfill",
    });
    if (!yes.isConfirmed) return;
    try {
      const r = await api.post(`/api/sellers/admin/payouts/backfill/${orderId}`);
      Swal.fire({ icon: "success", title: "Backfilled", text: r.data.message || "Snapshot stored", timer: 1500, showConfirmButton: false });
      fetchData();
    } catch (err) {
      Swal.fire({ icon: "info", title: err.response?.data?.message || "No backfill needed", timer: 1500, showConfirmButton: false });
    }
  };

  const filterColl = (c) =>
    (!sellerFilter || String(c.seller) === sellerFilter) &&
    (!statusFilter || c.status === statusFilter);

  const showAudit = (p) => {
    const lines = (p.auditLog || []).map(
      (a) => `${dstr(a.at)} — <b>${a.action}</b> by ${a.by?.name || "admin"}${a.note ? ` — ${a.note}` : ""}`
    ).join("<br/>") || "No audit entries";
    Swal.fire({
      title: `Payout audit — ${p.seller?.shopName || p.seller}`,
      html: lines,
      confirmButtonText: "Close",
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Seller Payouts</h1>
          <p className="text-sm text-slate-500 mt-1">
            COD settlement, commission, and 10-day rolling payouts. Money moves only after an admin confirms an external transfer.
          </p>
        </div>
        <span
          className="flex items-center gap-1.5 text-xs text-emerald-600"
          title="This page updates live when payout data changes"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Live
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: "board", label: "Sellers", icon: <FiSearch /> },
          { id: "collections", label: "Collections", icon: <FiDollarSign /> },
          { id: "payouts", label: "Payouts", icon: <MdPayment /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t.id ? "text-brand-600 border-brand-600" : "text-slate-500 border-transparent hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-400">Loading…</p>}

      {/* ======= SELLER BOARD ======= */}
      {tab === "board" && !loading && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-left">
                  <th className="px-4 py-3 font-semibold">Seller</th>
                  <th className="px-4 py-3 font-semibold">Rate</th>
                  <th className="px-4 py-3 font-semibold">Pending (delivered, unverified)</th>
                  <th className="px-4 py-3 font-semibold">Ready net</th>
                  <th className="px-4 py-3 font-semibold">Next due</th>
                  <th className="px-4 py-3 font-semibold">Paid</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {board.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No sellers yet</td></tr>
                )}
                {board.map((s) => (
                  <tr key={s.seller} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.shopName || s.seller}</td>
                    <td className="px-4 py-3">{s.commissionRate || 0}%</td>
                    <td className="px-4 py-3">
                      <span className={s.pending.count > 0 ? "text-amber-600 font-medium" : "text-slate-400"}>
                        {rs(s.pending.expectedTotal)} {s.pending.count > 0 && `(${s.pending.count})`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={s.ready.count > 0 ? "text-brand-600 font-semibold" : "text-slate-400"}>
                        {s.ready.count > 0 ? rs(s.ready.net) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{dstr(s.nextEarliestDue)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {s.duePayout ? (
                        <span className="text-indigo-600 font-medium">{rs(s.duePayout.netPayable)}</span>
                      ) : (
                        <span title={`${s.paidTotal.count} paid batches total`}>{rs(s.paidTotal.total)} ({s.paidTotal.count})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        disabled={s.ready.count === 0}
                        onClick={() => createPayoutFromBoard(s.seller)}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
                      >
                        <FiDollarSign className="w-3.5 h-3.5" /> Create payout
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======= COLLECTIONS ======= */}
      {tab === "collections" && !loading && (
        <>
          <div className="flex flex-wrap gap-3">
            <input
              value={sellerFilter}
              onChange={(e) => setSellerFilter(e.target.value)}
              placeholder="Filter by seller id…"
              className="flex-1 min-w-[200px] text-sm bg-white border border-slate-200 rounded-lg px-3 py-2"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2"
            >
              <option value="">All statuses</option>
              {Object.keys(collectionStatusBadge).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-left">
                    <th className="px-4 py-3 font-semibold">Order</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Expected</th>
                    <th className="px-4 py-3 font-semibold">Collected</th>
                    <th className="px-4 py-3 font-semibold">Commission</th>
                    <th className="px-4 py-3 font-semibold">Source</th>
                    <th className="px-4 py-3 font-semibold">Due</th>
                    <th className="px-4 py-3 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {collections.filter(filterColl).length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">No collection rows</td></tr>
                  )}
                  {collections.filter(filterColl).map((c) => (
                    <tr key={c._id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">#{String(c.order?._id || c.order).slice(-8)}</td>
                      <td className="px-4 py-3 text-slate-600">{c.type}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${collectionStatusBadge[c.status]}`}>{c.status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{rs(c.expectedAmount)}</td>
                      <td className="px-4 py-3 text-slate-600">{c.grossCollected != null && c.grossCollected !== 0 ? rs(c.grossCollected) : "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{rs(c.commissionAmount)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{c.snapshotSource}</td>
                      <td className="px-4 py-3 text-slate-600">{dstr(c.payoutDueAt)}</td>
                      <td className="px-4 py-3 text-right">
                        {c.type === "collection" && c.status === "pending_collection" && (
                          <button
                            onClick={() => verifyCollection(c)}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-1"
                          >
                            <FiCheckCircle className="w-3.5 h-3.5" /> Verify
                          </button>
                        )}
                        {c.type === "collection" && c.snapshotSource === "current_rate_backfill" && (
                          <button
                            onClick={() => backfillOrder(String(c.order?._id || c.order))}
                            className="text-xs px-3 py-1.5 ml-1 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 inline-flex items-center gap-1"
                            title="Re-store snapshot using seller's current rate"
                          >
                            Backfill
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ======= PAYOUTS ======= */}
      {tab === "payouts" && !loading && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-left">
                  <th className="px-4 py-3 font-semibold">Seller</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Gross</th>
                  <th className="px-4 py-3 font-semibold">Commission</th>
                  <th className="px-4 py-3 font-semibold">Deductions</th>
                  <th className="px-4 py-3 font-semibold">Net payable</th>
                  <th className="px-4 py-3 font-semibold">Due</th>
                  <th className="px-4 py-3 font-semibold">Ref / Paid by</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {payouts.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">No payouts yet</td></tr>
                )}
                {payouts.map((p) => (
                  <tr key={p._id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{p.seller?.shopName || p.seller}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${payoutStatusBadge[p.status]}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{rs(p.grossCollected)}</td>
                    <td className="px-4 py-3 text-slate-600">{rs(p.commissionAmount)}</td>
                    <td className="px-4 py-3 text-slate-600">{rs(p.deductions)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{rs(p.netPayable)}</td>
                    <td className="px-4 py-3 text-slate-600">{dstr(p.payoutDueAt)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.paymentRef ? (
                        <div>
                          <div className="font-medium">{p.paymentRef}</div>
                          <div className="text-xs text-slate-400" title={dstr(p.paidAt)}>by {p.paidBy?.name || "admin"}</div>
                        </div>
                      ) : p.status === "failed" ? (
                        <span className="text-rose-600" title={p.failedReason}>failed: {p.failedReason}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status === "eligible_for_payout" && (
                        <button
                          onClick={() => markPaid(p)}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 inline-flex items-center gap-1"
                        >
                          <FiCheckCircle className="w-3.5 h-3.5" /> Mark paid
                        </button>
                      )}
                      {(p.status === "processing" || p.status === "eligible_for_payout") && (
                        <button
                          onClick={() => markFailed(p)}
                          className="text-xs px-3 py-1.5 ml-1 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 inline-flex items-center gap-1"
                        >
                          <FiX /> Fail
                        </button>
                      )}
                      <button
                        onClick={() => showAudit(p)}
                        className="text-xs px-3 py-1.5 ml-1 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 inline-flex items-center gap-1"
                      >
                        <FiEye className="w-3.5 h-3.5" /> Audit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
