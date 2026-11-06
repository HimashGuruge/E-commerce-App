import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "@/utils/api";
import {
  FiRefreshCw,
  FiTruck,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiSearch,
  FiChevronDown,
  FiChevronUp,
  FiInfo,
  FiDollarSign,
  FiPackage,
  FiClock,
  FiArrowRight,
  FiBox,
} from "react-icons/fi";
import { apiError, swalTheme, showSuccess } from "@/utils/notify";
import Swal from "sweetalert2";

const TABS = [
  { key: "overview", label: "Overview", icon: <FiBox size={14} /> },
  { key: "shipments", label: "Shipments", icon: <FiTruck size={14} /> },
  { key: "sellers", label: "Sellers", icon: <FiPackage size={14} /> },
  { key: "money", label: "Money", icon: <FiDollarSign size={14} /> },
];

const STATUS_OPTIONS = [
  { key: "shipped", label: "Shipped", dot: "bg-purple-500" },
  { key: "in_transit", label: "In Transit", dot: "bg-blue-500" },
  { key: "ready_for_pickup", label: "Ready for Pickup", dot: "bg-amber-500" },
  { key: "delivered", label: "Delivered", dot: "bg-emerald-500" },
  { key: "failed", label: "Failed", dot: "bg-red-500" },
  { key: "tracking_error", label: "Tracking Error", dot: "bg-orange-500" },
  { key: "stuck", label: "Stuck", dot: "bg-rose-500" },
  { key: "returned", label: "Returned", dot: "bg-slate-500" },
];

const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "LKR" }).format(Number(n) || 0);

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");

// Map a shipment to its display bucket (orderStatus + persisted domexStatus + error/stuck)
const bucketOf = (o) => {
  if (o.orderStatus === "shipped") {
    if (o.trackingError && o.trackingError.trim()) return "tracking_error";
    if (o.domexStatus === "in_transit") return "in_transit";
    if (o.domexStatus === "ready_for_pickup") return "ready_for_pickup";
    if (o.stuck) return "stuck";
    return "shipped";
  }
  if (o.orderStatus === "delivered") return "delivered";
  if (o.orderStatus === "failed") return "failed";
  return o.orderStatus || "other";
};

const BUCKET_META = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.key, { label: s.label, dot: s.dot }])
);

export default function AdminDomexDashboard() {
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [sellers, setSellers] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sellerFilter, setSellerFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const loadOverview = useCallback(async () => {
    try {
      const res = await api.get("/api/orders/admin/tracking/summary");
      setSummary(res.data?.summary || null);
    } catch (e) {
      console.error("Domex overview load failed:", e);
    }
  }, []);

  const loadShipments = useCallback(async (p = 1) => {
    const params = { page: p, limit: 20, q, status: statusFilter };
    if (sellerFilter) params.seller = sellerFilter;
    if (from) params.from = from;
    if (to) params.to = to;
    try {
      const res = await api.get("/api/orders/admin/tracking/shipments", { params });
      setShipments(res.data?.shipments || []);
      setTotalPages(res.data?.totalPages || 1);
      setTotalCount(res.data?.totalCount || 0);
      setPage(res.data?.page || p);
    } catch (e) {
      console.error("Domex shipments load failed:", e);
    }
  }, [q, statusFilter, sellerFilter, from, to]);

  const loadSellers = useCallback(async () => {
    try {
      const res = await api.get("/api/orders/admin/tracking/sellers");
      setSellers(res.data?.sellers || []);
    } catch (e) {
      console.error("Domex sellers load failed:", e);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadOverview(), loadShipments(1), loadSellers()]).finally(() =>
      setLoading(false)
    );
  }, [loadOverview, loadShipments, loadSellers]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.post("/api/orders/admin/tracking/sync");
      showSuccess(
        `Sync complete — checked ${res.data?.stats?.checked ?? "?"} shipments`
      );
      await Promise.all([loadOverview(), loadShipments(1), loadSellers()]);
    } catch (e) {
      apiError(e, "Domex sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const handleOverride = async (order) => {
    const statusOpts = ["delivered", "shipped", "failed", "cancelled"];
    const { value: status, value: reason } = await Swal.fire({
      ...swalTheme,
      title: `Manual override — order #${order._id}`,
      input: "radio",
      inputs: [
        { label: "Set status", placeholder: "", input: "select" },
        { label: "Reason (required)", placeholder: "Why?", input: "text" },
      ],
      showCancelButton: true,
      confirmButtonText: "Apply override",
      preConfirm: (vals) => {
        if (statusOpts.includes(vals[0]) && (vals[1] || "").trim()) return true;
        Swal.showValidationMessage("Pick a status and enter a reason");
        return false;
      },
    });
    if (!status) return;

    try {
      await api.post(`/api/orders/admin/tracking/orders/${order._id}/override`, {
        status,
        reason,
      });
      showSuccess("Override applied and audited");
      await Promise.all([loadOverview(), loadShipments(1), loadSellers()]);
    } catch (e) {
      apiError(e, "Could not apply the override. Please check the reason and try again.");
    }
  };

  const refreshCurrent = () => {
    if (tab === "overview") loadOverview();
    else if (tab === "shipments") loadShipments(page);
    else if (tab === "sellers") loadSellers();
  };

  if (loading && !summary && !shipments.length && !sellers.length) {
    return (
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-48 rounded-lg bg-slate-200/70 animate-pulse" />
          <div className="mt-6 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-slate-200/50 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
              Domex Monitor
            </h1>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.14em] truncate">
              delivery · tracking · seller money
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors active:scale-95 disabled:opacity-60"
            >
              <FiRefreshCw size={14} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing…" : "Sync Domex"}
            </button>
          </div>
        </div>

        {/* Quick guide */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowGuide((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100/70 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FiInfo size={15} className="text-slate-400" />
              How this monitor works
            </span>
            {showGuide ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>
          {showGuide && (
            <div className="px-4 pb-4 text-[13px] text-slate-600 space-y-3">
              <div>
                <p className="font-semibold text-slate-800 mb-1">What it shows</p>
                <ul className="list-disc list-inside space-y-1 leading-relaxed">
                  <li><strong>Overview</strong> — live counts per delivery bucket (shipped, in transit, ready for pickup, delivered, failed, tracking errors, stuck, returned).</li>
                  <li><strong>Shipments</strong> — every shipped/delivered/failed order with its courier status, COD settlement state, and tracking history.</li>
                  <li><strong>Sellers</strong> — per-seller products sold (quantity) plus the same money figures the Payouts page uses.</li>
                  <li><strong>Money</strong> — jump to the Payouts page to verify courier collections and pay sellers.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-800 mb-1">Delivery rules (important)</p>
                <ul className="list-disc list-inside space-y-1 leading-relaxed">
                  <li>Orders are <strong>never auto-delivered by age</strong>. "Stuck" only means a shipped order has had no tracking result for 3+ days — it is a flag, not an action.</li>
                  <li>An order only becomes <strong>delivered</strong> when Domex reports <em>Delivered</em>, or when you manually override with a reason.</li>
                  <li>Manual overrides are <strong>admin-only, require a reason, and are audited</strong> in the tracking history.</li>
                  <li>For COD orders, delivery creates a <strong>pending</strong> cash record. Money is only counted after it is verified in Payouts.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold border transition-colors ${
                tab === t.key
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="space-y-4">
            {summary && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {summaryCard("Total Shipments", summary.totalShipments, "text-slate-800")}
                  {summaryCard("Shipped", summary.shipped, "text-purple-700")}
                  {summaryCard("In Transit", summary.inTransit, "text-blue-700")}
                  {summaryCard("Ready for Pickup", summary.readyForPickup, "text-amber-700")}
                  {summaryCard("Delivered", summary.delivered, "text-emerald-700")}
                  {summaryCard("Failed", summary.failed, "text-red-700")}
                  {summaryCard("Tracking Errors", summary.trackingErrors, "text-orange-700")}
                  {summaryCard("Stuck", summary.stuck, "text-rose-700")}
                  {summaryCard("No Tracking", summary.noTracking, "text-slate-500")}
                  {summaryCard("Returned", summary.returned, "text-slate-700")}
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="text-[12px] text-slate-500">
                    Last sync: <strong className="text-slate-800">{fmtDate(summary.lastSyncAt)}</strong>
                  </div>
                  <div className="text-[12px] text-slate-500">
                    Source: <strong className="text-slate-800">{summary.lastSyncSource || "—"}</strong>
                  </div>
                  <button
                    onClick={() => setTab("shipments")}
                    className="ml-auto flex items-center gap-1 text-[13px] font-semibold text-brand-600 hover:text-brand-700"
                  >
                    View shipments <FiArrowRight size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* SHIPMENTS */}
        {tab === "shipments" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Order # or tracking number…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full sm:w-64 pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-700 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/15"
                />
                <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
              >
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
              >
                <option value="">All sellers</option>
                {sellers.map((s) => (
                  <option key={s.seller} value={s.seller}>
                    {s.shopName || `Seller ${s.seller.slice(-4)}`}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
              />
              <span className="text-[13px] text-slate-400">to</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
              />
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-3 py-2.5">Order</th>
                      <th className="text-left px-3 py-2.5">Customer</th>
                      <th className="text-left px-3 py-2.5">Seller(s)</th>
                      <th className="text-left px-3 py-2.5">Tracking</th>
                      <th className="text-left px-3 py-2.5">Domex Status</th>
                      <th className="text-left px-3 py-2.5">COD Settlement</th>
                      <th className="text-left px-3 py-2.5">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shipments.map((o) => {
                      const bucket = bucketOf(o);
                      const meta = BUCKET_META[bucket] || { label: bucket, dot: "bg-slate-400" };
                      return (
                        <tr key={o._id} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2.5 font-mono text-[12px] text-slate-700">
                            #{o._id}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">
                            {o.user?.name || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {o.sellerShopNames?.filter(Boolean).join(", ") || "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            {o.trackingNumber ? (
                              <a
                                href={`https://domex.lk/Order-Details.php?wbno=${encodeURIComponent(o.trackingNumber)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-[12px] text-brand-600 hover:underline"
                              >
                                {o.trackingNumber}
                              </a>
                            ) : (
                              <span className="text-slate-400">no tracking</span>
                            )}
                            {o.trackingError && (
                              <span className="block text-[11px] text-orange-600 mt-0.5">
                                {o.trackingError}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-700">
                              <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </span>
                            {o.stuck && (
                              <span className="block text-[11px] text-rose-600 mt-0.5">
                                no update since {fmtDate(o.lastTrackedAt)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {o.cod ? (
                              <div>
                                <span className="text-[12px] font-semibold text-slate-800">
                                  {o.cod.status.replace("_", " ")}
                                </span>
                                {o.cod.grossCollected > 0 && (
                                  <span className="block text-[11px] text-slate-500">
                                    received {money(o.cod.grossCollected)}
                                    {o.cod.payoutDueAt && ` · due ${fmtDate(o.cod.payoutDueAt)}`}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[12px]">
                                {o.paymentMethod === "cod" ? "pending (not delivered)" : "—"}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <button
                              onClick={() => handleOverride(o)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-semibold transition-colors"
                            >
                              Override
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {!shipments.length && (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                          No shipments match the current filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 text-[12px] text-slate-500">
                <span>
                  {totalCount} shipment{totalCount === 1 ? "" : "s"}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => loadShipments(page - 1)}
                    className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-40"
                  >
                    ←
                  </button>
                  <span>
                    {page} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => loadShipments(page + 1)}
                    className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-40"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SELLERS */}
        {tab === "sellers" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-3 py-2.5">Shop</th>
                    <th className="text-right px-3 py-2.5">Products Sold</th>
                    <th className="text-right px-3 py-2.5">Delivered Orders</th>
                    <th className="text-right px-3 py-2.5">Returned Items</th>
                    <th className="text-right px-3 py-2.5">Pending COD</th>
                    <th className="text-right px-3 py-2.5">Ready for Payout</th>
                    <th className="text-right px-3 py-2.5">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sellers.map((s) => (
                    <tr key={s.seller} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2.5 font-semibold text-slate-800">
                        {s.shopName || `Seller ${s.seller.slice(-4)}`}
                        <span className="block text-[11px] font-mono text-slate-400">
                          rate {Math.round(Number(s.commissionRate) || 0)}% · {s.commissionMode}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700">{s.productsSold}</td>
                      <td className="px-3 py-2.5 text-right text-slate-700">{s.deliveredOrders}</td>
                      <td className="px-3 py-2.5 text-right text-slate-700">{s.returnedItems}</td>
                      <td className="px-3 py-2.5 text-right text-amber-700">
                        {s.pending.count}
                        {s.pending.expectedTotal > 0 && (
                          <span className="block text-[11px] text-slate-500">
                            {money(s.pending.expectedTotal)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-emerald-700">
                        {s.ready.net > 0 ? money(s.ready.net) : "—"}
                        {s.duePayout && (
                          <span className="block text-[11px] text-slate-500">
                            due {fmtDate(s.duePayout.dueAt)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700">
                        {money(s.paidTotal.total)}
                        {s.paidTotal.count > 0 && (
                          <span className="block text-[11px] text-slate-500">
                            {s.paidTotal.count} payout{s.paidTotal.count === 1 ? "" : "s"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!sellers.length && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                        No sellers yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MONEY — link to the existing payouts page */}
        {tab === "money" && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-display font-bold text-slate-900">Courier money & payouts</h2>
              <p className="text-[13px] text-slate-600 mt-1 leading-relaxed">
                Delivery only records <strong>pending</strong> COD. Actual money is verified and paid
                on the Payouts page. Use it to verify courier collections, create payout batches, and
                mark payments. The figures shown here are read straight from that same ledger.
              </p>
            </div>
            <Link
              to="/admin/dashboard/payouts"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors active:scale-95"
            >
              Open Payouts <FiArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* Footer refresh */}
        <div className="flex justify-end">
          <button
            onClick={refreshCurrent}
            className="flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-slate-700"
          >
            <FiRefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

function summaryCard(label, value, color) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200/80">
      <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-400 mb-1.5">
        {label}
      </p>
      <p className={`text-xl font-display font-bold ${color}`}>{value ?? 0}</p>
    </div>
  );
}
