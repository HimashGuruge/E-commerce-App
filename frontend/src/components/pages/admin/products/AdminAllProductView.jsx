import api from "@/utils/api";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiCopy,
  FiRefreshCw,
  FiPlus,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiPackage,
  FiTag,
} from "react-icons/fi";
import { TbPackage, TbUserOff } from "react-icons/tb";
import Swal from "sweetalert2";
import { AnimatePresence } from "framer-motion";

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
        for (const productId of selectedProducts) {
          await api.delete(`/api/products/${productId}`);
        }
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
    setSelectedProducts(newSelected);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    Swal.fire({ icon: "success", title: "Copied!", timer: 1500, showConfirmButton: false });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <TbPackage className="w-12 h-12 text-brand-500 animate-pulse mx-auto" />
          <p className="text-slate-500 mt-4 font-medium">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <FiPackage className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              Products
            </h1>
            <p className="text-slate-500 mt-1">
              {filteredProducts.length} products • {selectedProducts.size} selected
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchProducts}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
            >
              <FiRefreshCw className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
              <span className="text-sm font-medium text-slate-600">Refresh</span>
            </button>
            <button
              onClick={() => navigate("/admin/dashboard/addproducts")}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all shadow-lg shadow-emerald-500/25"
            >
              <FiPlus className="w-4 h-4" />
              <span className="text-sm font-medium">Add Product</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: products.length, color: "from-slate-500 to-slate-600" },
            { label: "In Stock", value: products.filter((p) => p.stock > 0).length, color: "from-brand-500 to-brand-600" },
            { label: "Low Stock", value: products.filter((p) => p.stock > 0 && p.stock <= 10).length, color: "from-amber-500 to-amber-600" },
            { label: "Out of Stock", value: products.filter((p) => !p.stock || p.stock === 0).length, color: "from-red-500 to-red-600" },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}>
                  <FiPackage className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "all" ? "All Categories" : cat}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name A-Z</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedProducts.size > 0 && (
          <div className="bg-brand-50 px-5 py-3 rounded-xl border border-brand-100 flex flex-wrap items-center gap-3">
            <span className="text-brand-700 font-medium text-sm">
              {selectedProducts.size} product(s) selected
            </span>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
            >
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedProducts(new Set())}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
            >
              Clear
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {filteredProducts.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <TbUserOff className="w-10 h-10 text-slate-300" />
              </div>
              <p className="text-lg font-semibold text-slate-900">No products found</p>
              <p className="text-slate-500 mt-1">Try adjusting your search</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className="p-4 w-12">
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={selectedProducts.size === currentProducts.length && currentProducts.length > 0}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </th>
                      <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Product</th>
                      <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Price</th>
                      <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Stock</th>
                      <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Category</th>
                      <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Approval</th>
                      <th className="p-4 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentProducts.map((product) => (
                      <tr key={product._id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.productId)}
                            onChange={() => handleSelectProduct(product.productId)}
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                              {product.images?.[0]?.startsWith('http') ? (
                                <img
                                  src={product.images[0]}
                                  alt={product.productName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FiPackage className="w-5 h-5 text-slate-300" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{product.productName}</p>
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <span className="font-mono">{product.productId}</span>
                                <button
                                  onClick={() => copyToClipboard(product.productId)}
                                  className="text-slate-400 hover:text-slate-600"
                                >
                                  <FiCopy className="w-3 h-3" />
                                </button>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-slate-900">
                            ${parseFloat(product.price || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            product.stock > 10
                              ? "bg-brand-100 text-brand-700"
                              : product.stock > 0
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}>
                            {product.stock || 0}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                            {product.category || "Uncategorized"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              product.approvedByAdmin
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {product.approvedByAdmin ? "Approved" : "Pending"}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => navigate(`/admin/dashboard/editproducts/${product.productId}`, { state: { product } })}
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"
                              title="Edit"
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.productId, product.productName)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-slate-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-slate-500">
                    Showing <span className="font-semibold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
                    <span className="font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}</span> of{" "}
                    <span className="font-semibold">{filteredProducts.length}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="w-9 h-9 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <FiChevronLeft className="w-4 h-4" />
                    </button>
                    {[...Array(Math.min(5, totalPages))].map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(idx + 1)}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium ${
                          currentPage === idx + 1
                            ? "bg-brand-500 text-white shadow-lg shadow-emerald-500/25"
                            : "border border-slate-200 hover:bg-slate-50 text-slate-600"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="w-9 h-9 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <FiChevronRight className="w-4 h-4" />
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
