import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiPackage, FiEdit2, FiTrash2, FiPlus, FiSearch, FiAlertCircle } from "react-icons/fi";
import { MdCheckCircle, MdOutlinePendingActions } from "react-icons/md";
import api from "@/utils/api";
import Swal from "sweetalert2";

export default function SellerProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await api.get("/api/sellers/products");
      if (data.success) setProducts(data.products);
    } catch (err) {
      console.error("Fetch products error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDelete = async (id, name) => {
    const result = await Swal.fire({
      title: "Delete Product?",
      text: `Are you sure you want to delete "${name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/api/products/${id}`);
      await fetchProducts();
      Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to delete" });
    }
  };

  const filtered = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Products</h2>
          <p className="text-sm text-slate-500 mt-1">{products.length} product{products.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          to="/seller/dashboard/add-product"
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-medium text-sm"
        >
          <FiPlus className="w-4 h-4" /> Add Product
        </Link>
      </div>

      <div className="relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none text-sm"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Product</th>
                  <th className="text-left px-4 py-3 font-medium">Price</th>
                  <th className="text-left px-4 py-3 font-medium">Stock</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Approval</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400"><FiPackage /></div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate max-w-[200px]">{p.name}</p>
                          <p className="text-xs text-slate-400 truncate">{p.sku || p._id?.slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">Rs. {(p.price || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${p.stock > 0 ? "text-green-600" : "text-red-500"}`}>
                        {p.stock > 0 ? p.stock : "Out of stock"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                      }`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {p.approvedByAdmin ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600"><MdCheckCircle /> Approved</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600"><MdOutlinePendingActions /> Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/seller/dashboard/edit-product/${p._id}`)}
                          className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p._id, p.name)}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <FiPackage className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">{search ? "No products match your search" : "No products yet"}</p>
          {!search && (
            <Link to="/seller/dashboard/add-product" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all text-sm font-medium">
              <FiPlus className="w-4 h-4" /> Add Your First Product
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
