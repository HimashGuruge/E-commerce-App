import React, { useEffect, useState } from "react";
import api from "@/utils/api";
import {
  FiPackage,
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiTag,
  FiBox,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

export default function PendingProductApprovals() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState(new Set());

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/products/admin/pending-approvals");
      setProducts(res.data.products || []);
    } catch (err) {
      console.error("Failed to load pending products:", err);
      toast.error("Failed to load pending products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (product) => {
    const result = await Swal.fire({
      title: "Approve this product?",
      html: `"<strong>${product.name}</strong>" from <strong>${product.shopName || "unknown store"}</strong> will become public.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#059669",
      confirmButtonText: "Yes, approve",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;

    setBusyId(product.productId);
    try {
      await api.put(`/api/products/${product.productId}/approve`);
      setProducts((prev) => prev.filter((p) => p.productId !== product.productId));
      toast.success("Product approved — now public");
    } catch (err) {
      console.error("Approve error:", err);
      toast.error("Failed to approve product");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (product) => {
    const result = await Swal.fire({
      title: "Reject this product?",
      html: `<strong>"${product.name}"</strong> will be deleted. This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;

    setBusyId(product.productId);
    try {
      await api.delete(`/api/products/${product.productId}`);
      setProducts((prev) => prev.filter((p) => p.productId !== product.productId));
      toast.success("Product rejected and deleted");
    } catch (err) {
      console.error("Reject error:", err);
      toast.error("Failed to delete product");
    } finally {
      setBusyId(null);
    }
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filtered.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filtered.map((p) => p.productId)));
    }
  };

  const handleSelectProduct = (productId) => {
    const next = new Set(selectedProducts);
    if (next.has(productId)) next.delete(productId);
    else next.add(productId);
    setSelectedProducts(next);
  };

  const handleBulkApprove = async () => {
    if (selectedProducts.size === 0) return;
    const result = await Swal.fire({
      title: "Approve selection?",
      html: `Approve <strong>${selectedProducts.size}</strong> product(s)? They will become public.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#059669",
      confirmButtonText: "Yes, approve",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;

    setBusyId("__bulk__");
    try {
      await api.put("/api/products/bulk/approve", { data: { ids: [...selectedProducts] } });
      setProducts((prev) => prev.filter((p) => !selectedProducts.has(p.productId)));
      setSelectedProducts(new Set());
      toast.success(`${selectedProducts.size} product(s) approved — now public`);
    } catch (err) {
      console.error("Bulk approve error:", err);
      toast.error("Failed to approve products");
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkReject = async () => {
    if (selectedProducts.size === 0) return;
    const result = await Swal.fire({
      title: "Reject selection?",
      html: `<strong>${selectedProducts.size}</strong> product(s) will be deleted. This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete them",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;

    setBusyId("__bulk__");
    try {
      await api.delete("/api/products/bulk", { data: { ids: [...selectedProducts] } });
      setProducts((prev) => prev.filter((p) => !selectedProducts.has(p.productId)));
      setSelectedProducts(new Set());
      toast.success(`${selectedProducts.size} product(s) rejected and deleted`);
    } catch (err) {
      console.error("Bulk reject error:", err);
      toast.error("Failed to delete products");
    } finally {
      setBusyId(null);
    }
  };

  const term = searchTerm.toLowerCase();
  const filtered = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(term) ||
      p.shopName?.toLowerCase().includes(term) ||
      p.sellerName?.toLowerCase().includes(term)
  );

  return (
    <div className="p-4 md:p-6 space-y-6 min-h-screen bg-slate-50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Pending <span className="text-brand-600">Product Approvals</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Products added by sellers that are waiting for admin approval.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-sm font-bold text-amber-700">
            <FiClock size={16} />
            {products.length} waiting
          </span>
          <button
            onClick={fetchPending}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="relative sm:w-72">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="Search product, store or seller..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <FiCheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="text-slate-600 font-medium">
            {searchTerm ? `No pending products matching "${searchTerm}"` : "No pending approvals"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm ? "Try a different search term" : "All seller products are approved. New ones will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {selectedProducts.size > 0 && (
            <div className="bg-brand-50 px-5 py-3 rounded-xl border border-brand-100 flex flex-wrap items-center gap-3">
              <span className="text-brand-700 font-medium text-sm">
                {selectedProducts.size} product(s) selected
              </span>
              <button
                onClick={handleBulkApprove}
                disabled={busyId !== null}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition disabled:opacity-50"
              >
                Approve Selected
              </button>
              <button
                onClick={handleBulkReject}
                disabled={busyId !== null}
                className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-sm font-bold hover:bg-rose-600 transition disabled:opacity-50"
              >
                Reject Selected
              </button>
              <button
                onClick={() => setSelectedProducts(new Set())}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
              >
                Clear
              </button>
            </div>
          )}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedProducts.size === filtered.length && filtered.length > 0}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                  </th>
                  <th className="px-4 py-3 font-bold text-slate-600">Product</th>
                  <th className="px-4 py-3 font-bold text-slate-600">Price</th>
                  <th className="px-4 py-3 font-bold text-slate-600">Stock</th>
                  <th className="px-4 py-3 font-bold text-slate-600">Category</th>
                  <th className="px-4 py-3 font-bold text-slate-600">Store / Seller</th>
                  <th className="px-4 py-3 font-bold text-slate-600">Added</th>
                  <th className="px-4 py-3 font-bold text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.productId} className="hover:bg-slate-50">
                    <td className="px-2 py-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(p.productId)}
                        onChange={() => handleSelectProduct(p.productId)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="w-full h-full flex items-center justify-center text-slate-300">
                              <FiPackage size={16} />
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 leading-tight">{p.name}</p>
                          {p.brand && <p className="text-[11px] text-slate-400">{p.brand}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700">
                      Rs. {(p.price ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${p.stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
                        <FiBox size={11} /> {p.stock ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
                        <FiTag size={11} /> {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">{p.shopName || "—"}</p>
                      <p className="text-[11px] text-slate-400">{p.sellerName}</p>
                      {p.sellerStatus && (
                        <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${p.sellerStatus === "approved" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                          store: {p.sellerStatus}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleReject(p)}
                          disabled={busyId !== null}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition disabled:opacity-50"
                        >
                          <FiXCircle size={12} /> Reject
                        </button>
                        <button
                          onClick={() => handleApprove(p)}
                          disabled={busyId !== null}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                        >
                          <FiCheckCircle size={12} /> Approve
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
