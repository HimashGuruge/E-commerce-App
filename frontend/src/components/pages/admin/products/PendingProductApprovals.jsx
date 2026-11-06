import React, { useEffect, useState, useMemo } from "react";
import api from "@/utils/api";
import { apiError, showSuccess, confirm } from "@/utils/notify";
import { onSocketEvent } from "@/utils/socket";

import {
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiPackage,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

const ITEMS_PER_PAGE = 12;

export default function PendingProductApprovals() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/products/admin/pending-approvals");
      setProducts(res.data.products || []);
    } catch (err) {
      console.error("Failed to load pending products:", err);
      apiError(err, "Could not load pending products. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  // Live update: the server sends admin:stats-changed on every product
  // create/update/approve/reject/delete, so the list stays current with
  // no manual refresh.
  useEffect(() => {
    return onSocketEvent("admin:stats-changed", (data) => {
      if (data?.type === "product") fetchPending();
    });
  }, []);

  const handleApprove = async (product) => {
    const result = await confirm({
      title: "Approve this product?",
      text: `"${product.name}" from ${product.shopName || "unknown store"} will become public.`,
      confirmText: "Yes, approve",
    });
    if (!result.isConfirmed) return;

    setBusyId(product.productId);
    try {
      await api.put(`/api/products/${product.productId}/approve`);
      setProducts((prev) => prev.filter((p) => p.productId !== product.productId));
      showSuccess("Product approved — now public");
    } catch (err) {
      console.error("Approve error:", err);
      apiError(err, "Could not approve this product. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (product) => {
    const result = await confirm({
      title: "Reject this product?",
      text: `${product.name} will be deleted. This action cannot be undone.`,
      confirmText: "Yes, delete it",
      danger: true,
    });
    if (!result.isConfirmed) return;

    setBusyId(product.productId);
    try {
      await api.delete(`/api/products/${product.productId}`);
      setProducts((prev) => prev.filter((p) => p.productId !== product.productId));
      showSuccess("Product rejected and deleted");
    } catch (err) {
      console.error("Reject error:", err);
      apiError(err, "Could not reject this product. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedProducts.size === 0) return;
    const result = await confirm({
      title: "Approve selection?",
      text: `Approve ${selectedProducts.size} product(s)? They will become public.`,
      confirmText: "Yes, approve",
    });
    if (!result.isConfirmed) return;

    setBusyId("__bulk__");
    try {
      await api.put("/api/products/bulk/approve", { data: { ids: [...selectedProducts] } });
      setProducts((prev) => prev.filter((p) => !selectedProducts.has(p.productId)));
      setSelectedProducts(new Set());
      showSuccess(`${selectedProducts.size} product(s) approved — now public`);
    } catch (err) {
      console.error("Bulk approve error:", err);
      apiError(err, "Could not approve the selected products. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkReject = async () => {
    if (selectedProducts.size === 0) return;
    const result = await confirm({
      title: "Reject selection?",
      text: `${selectedProducts.size} product(s) will be deleted. This cannot be undone.`,
      confirmText: "Yes, delete them",
      danger: true,
    });
    if (!result.isConfirmed) return;

    setBusyId("__bulk__");
    try {
      await api.delete("/api/products/bulk", { data: { ids: [...selectedProducts] } });
      setProducts((prev) => prev.filter((p) => !selectedProducts.has(p.productId)));
      setSelectedProducts(new Set());
      showSuccess(`${selectedProducts.size} product(s) rejected and deleted`);
    } catch (err) {
      console.error("Bulk reject error:", err);
      apiError(err, "Could not reject the selected products. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === currentProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(currentProducts.map((p) => p.productId)));
    }
  };

  const handleSelectProduct = (productId) => {
    const next = new Set(selectedProducts);
    if (next.has(productId)) next.delete(productId);
    else next.add(productId);
    setSelectedProducts(next);
  };

  const term = searchTerm.toLowerCase();
  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          p.shopName?.toLowerCase().includes(term) ||
          p.sellerName?.toLowerCase().includes(term)
      ),
    [products, term]
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const currentProducts = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Compact stat values
  const inStock = filtered.filter((p) => p.stock > 0).length;
  const lowStock = filtered.filter((p) => p.stock > 0 && p.stock <= 10).length;
  const outOfStock = filtered.filter((p) => !p.stock || p.stock === 0).length;

  const inputClass =
    "bg-transparent px-3 py-1.5 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-500/15";

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 w-40 rounded-lg bg-slate-200/70 animate-pulse" />
          <div className="mt-6 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-slate-200/50 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header — compact */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
              Pending Approvals
            </h1>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.14em] truncate">
              {filtered.length} waiting
              {selectedProducts.size > 0 && ` · ${selectedProducts.size} selected`}
            </p>
            <span
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-400 uppercase tracking-wider"
              title="This page updates live when products change"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Live
            </span>
          </div>
        </div>

        {/* Slim stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 bg-white rounded-xl border border-slate-200/80 divide-x divide-slate-100">
          {[
            { label: "Waiting", value: filtered.length, dot: "bg-slate-400" },
            { label: "In Stock", value: inStock, dot: "bg-emerald-500" },
            { label: "Low Stock", value: lowStock, dot: "bg-amber-500" },
            { label: "Out of Stock", value: outOfStock, dot: "bg-red-500" },
          ].map((stat) => (
            <div key={stat.label} className="px-4 py-2.5 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.1em] text-slate-400">
                <span className={`w-1.5 h-1.5 rounded-full ${stat.dot}`} />
                {stat.label}
              </span>
              <span className="text-base font-display font-bold text-slate-900 tabular-nums">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Filters — one thin row */}
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search product, store or seller..."
              className={`${inputClass} w-full pl-9`}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* Bulk actions */}
        {selectedProducts.size > 0 && (
          <div className="flex items-center gap-3 px-3 py-2 bg-brand-50 border border-brand-100 rounded-lg">
            <span className="text-[13px] font-medium text-brand-700">
              {selectedProducts.size} selected
            </span>
            <button
              onClick={handleBulkApprove}
              disabled={busyId !== null}
              className="px-2.5 py-1 bg-brand-600 text-white rounded-md text-xs font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              Approve selected
            </button>
            <button
              onClick={handleBulkReject}
              disabled={busyId !== null}
              className="px-2.5 py-1 bg-red-500 text-white rounded-md text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              Reject selected
            </button>
            <button
              onClick={() => setSelectedProducts(new Set())}
              className="px-2.5 py-1 text-slate-500 hover:bg-white/70 rounded-md text-xs transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        {/* Dense table */}
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              <FiCheckCircle className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
              {searchTerm
                ? `No pending products matching "${searchTerm}" — try a different search`
                : "No pending approvals — all seller products are approved"}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/60">
                      <th className="pl-4 pr-2 py-2.5 w-10">
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={selectedProducts.size === currentProducts.length && currentProducts.length > 0}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </th>
                      <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Product</th>
                      <th className="px-2 py-2.5 text-right text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Price</th>
                      <th className="px-2 py-2.5 text-center text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Stock</th>
                      <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Category</th>
                      <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Store / Seller</th>
                      <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Added</th>
                      <th className="px-2 py-2.5 pr-4 text-right text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentProducts.map((p) => (
                      <tr key={p.productId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="pl-4 pr-2 py-2">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(p.productId)}
                            onChange={() => handleSelectProduct(p.productId)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {p.images?.[0] ? (
                                <img
                                  src={p.images[0]}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.target.style.display = "none"; }}
                                />
                              ) : (
                                <FiPackage className="w-4 h-4 text-slate-300" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 truncate max-w-[220px]">{p.name}</p>
                              {p.brand && (
                                <p className="text-[11px] text-slate-400 font-mono truncate max-w-[220px]">{p.brand}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right font-medium text-slate-900 tabular-nums whitespace-nowrap">
                          Rs. {parseFloat(p.price || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums ${
                            (p.stock ?? 0) > 10
                              ? "text-emerald-700"
                              : (p.stock ?? 0) > 0
                                ? "text-amber-700"
                                : "text-red-600"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              (p.stock ?? 0) > 10
                                ? "bg-emerald-500"
                                : (p.stock ?? 0) > 0
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }`} />
                            {p.stock ?? 0}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-slate-500 whitespace-nowrap">
                          {p.category || "—"}
                        </td>
                        <td className="px-2 py-2 text-slate-500 whitespace-nowrap">
                          <p className="text-slate-700 font-medium">{p.shopName || "—"}</p>
                          <p className="text-[11px] text-slate-400">{p.sellerName}</p>
                        </td>
                        <td className="px-2 py-2 text-slate-500 whitespace-nowrap">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-2 py-2 pr-4">
                          <div className="flex justify-end gap-0.5">
                            <button
                              onClick={() => handleReject(p)}
                              disabled={busyId !== null}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-40"
                              title="Reject"
                            >
                              <FiXCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleApprove(p)}
                              disabled={busyId !== null}
                              className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors disabled:opacity-40"
                              title="Approve"
                            >
                              <FiCheckCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination — compact */}
              {totalPages > 1 && (
                <div className="border-t border-slate-100 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <p className="text-xs text-slate-400">
                    Showing <span className="font-semibold text-slate-600">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
                    <span className="font-semibold text-slate-600">{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span> of{" "}
                    <span className="font-semibold text-slate-600">{filtered.length}</span>
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <FiChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {[...Array(Math.min(5, totalPages))].map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(idx + 1)}
                        className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium ${
                          currentPage === idx + 1
                            ? "bg-brand-500 text-white"
                            : "hover:bg-slate-100 text-slate-600"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <FiChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
