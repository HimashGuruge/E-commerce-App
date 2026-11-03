import api from "@/utils/api";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiCopy,
  FiPlus,
  FiChevronLeft,
  FiChevronRight,
  FiPackage,
} from "react-icons/fi";
import { TbUserOff } from "react-icons/tb";
import Swal from "sweetalert2";
import { onSocketEvent } from "@/utils/socket";

const ITEMS_PER_PAGE = 12;

export default function AdminAllProductView() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchProducts();
  }, [navigate, token]);

  // Live update: the server sends admin:stats-changed on every product
  // create/update/approve/reject/delete, so the list stays current with
  // no manual refresh.
  useEffect(() => {
    return onSocketEvent("admin:stats-changed", (data) => {
      if (data?.type === "product") fetchProducts();
    });
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/products?includeAll=true`);
      const productsData = res.data?.products || res.data?.data || res.data || [];
      setProducts(productsData);
    } catch (err) {
      console.error("Error fetching products:", err);
      Swal.fire("Error", "Failed to load products", "error");
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const allCategories = products.map((p) => p.category).filter(Boolean);
    return ["all", ...new Set(allCategories)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.productName?.toLowerCase().includes(term) ||
          p.productId?.toLowerCase().includes(term)
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    switch (sortBy) {
      case "name":
        result.sort((a, b) => a.productName.localeCompare(b.productName));
        break;
      case "price-low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      default:
        break;
    }

    return result;
  }, [products, searchTerm, selectedCategory, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleDelete = async (productId, productName) => {
    const result = await Swal.fire({
      title: "Delete Product?",
      html: `Delete <strong>"${productName}"</strong>?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Delete",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/products/${productId}`);
        setProducts((prev) => prev.filter((p) => p.productId !== productId));
        Swal.fire("Deleted!", "Product removed", "success");
      } catch (err) {
        Swal.fire("Error", "Failed to delete", "error");
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) return;
    const result = await Swal.fire({
      title: "Bulk Delete",
      html: `Delete ${selectedProducts.size} product(s)?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Delete",
    });

    if (result.isConfirmed) {
      try {
        await api.delete("/api/products/bulk", { data: { ids: [...selectedProducts] } });
        setProducts((prev) => prev.filter((p) => !selectedProducts.has(p.productId)));
        setSelectedProducts(new Set());
        Swal.fire("Success!", "Products deleted", "success");
      } catch (err) {
        Swal.fire("Error", "Failed to delete", "error");
      }
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
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(new Set(newSelected));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    Swal.fire({ icon: "success", title: "Copied!", timer: 1500, showConfirmButton: false });
  };

  // Compact stat values
  const inStock = products.filter((p) => p.stock > 0).length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 10).length;
  const outOfStock = products.filter((p) => !p.stock || p.stock === 0).length;

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
            <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Products</h1>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.14em] truncate">
              {filteredProducts.length} items
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
          <button
            onClick={() => navigate("/admin/dashboard/addproducts")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm font-medium transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            Add Product
          </button>
        </div>

        {/* Slim stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 bg-white rounded-xl border border-slate-200/80 divide-x divide-slate-100">
          {[
            { label: "Total", value: products.length, dot: "bg-slate-400" },
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
              placeholder="Search by name or ID..."
              className={`${inputClass} w-full pl-9`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`${inputClass} md:w-44 rounded-lg cursor-pointer`}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "all" ? "All categories" : cat}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`${inputClass} md:w-44 rounded-lg cursor-pointer`}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A-Z</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </div>

        {/* Bulk actions */}
        {selectedProducts.size > 0 && (
          <div className="flex items-center gap-3 px-3 py-2 bg-brand-50 border border-brand-100 rounded-lg">
            <span className="text-[13px] font-medium text-brand-700">
              {selectedProducts.size} selected
            </span>
            <button
              onClick={handleBulkDelete}
              className="px-2.5 py-1 bg-red-500 text-white rounded-md text-xs font-medium hover:bg-red-600 transition-colors"
            >
              Delete selected
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
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              <TbUserOff className="w-6 h-6 mx-auto mb-2 text-slate-300" />
              No products found — try adjusting your search
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
                      <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Status</th>
                      <th className="px-2 py-2.5 pr-4 text-right text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentProducts.map((product) => (
                      <tr key={product._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="pl-4 pr-2 py-2">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.productId)}
                            onChange={() => handleSelectProduct(product.productId)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {product.images?.[0]?.startsWith('http') ? (
                                <img
                                  src={product.images[0]}
                                  alt={product.productName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              ) : (
                                <FiPackage className="w-4 h-4 text-slate-300" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 truncate max-w-[220px]">{product.productName}</p>
                              <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                {product.productId}
                                <button
                                  onClick={() => copyToClipboard(product.productId)}
                                  className="text-slate-300 hover:text-brand-500 transition-colors"
                                  title="Copy product ID"
                                >
                                  <FiCopy className="w-3 h-3" />
                                </button>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right font-medium text-slate-900 tabular-nums whitespace-nowrap">
                          Rs. {parseFloat(product.price || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums ${
                            product.stock > 10
                              ? "text-emerald-700"
                              : product.stock > 0
                                ? "text-amber-700"
                                : "text-red-600"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              product.stock > 10
                                ? "bg-emerald-500"
                                : product.stock > 0
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }`} />
                            {product.stock || 0}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-slate-500 whitespace-nowrap">
                          {product.category || "—"}
                        </td>
                        <td className="px-2 py-2">
                          <span className={`text-xs font-medium ${
                            product.approvedByAdmin ? "text-emerald-700" : "text-amber-700"
                          }`}>
                            {product.approvedByAdmin ? "Approved" : "Pending"}
                          </span>
                        </td>
                        <td className="px-2 py-2 pr-4">
                          <div className="flex justify-end gap-0.5">
                            <button
                              onClick={() => navigate(`/admin/dashboard/editproducts/${product.productId}`, { state: { product } })}
                              className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                              title="Edit"
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.productId, product.productName)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete"
                            >
                              <FiTrash2 className="w-4 h-4" />
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
                    <span className="font-semibold text-slate-600">{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}</span> of{" "}
                    <span className="font-semibold text-slate-600">{filteredProducts.length}</span>
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
