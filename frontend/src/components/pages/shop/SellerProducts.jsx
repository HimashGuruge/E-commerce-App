import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiPackage, FiEdit2, FiTrash2, FiPlus, FiSearch, FiAlertCircle } from "react-icons/fi";
import { MdCheckCircle, MdOutlinePendingActions } from "react-icons/md";
import api from "@/utils/api";
import { apiError, showSuccess, confirm } from "@/utils/notify";

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
    const result = await confirm({
      title: "Delete Product?",
      text: `Are you sure you want to delete "${name}"?`,
      danger: true,
      confirmText: "Delete",
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/api/products/${id}`);
      await fetchProducts();
      showSuccess("Product deleted!");
    } catch (err) {
      apiError(err, "Could not delete this product. Please try again.");
    }
  };

  const filtered = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-shopprimary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 max-w-[1600px] mx-auto space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[19px] font-extrabold text-shoptext tracking-[-0.5px]">My Products</h2>
          <p className="text-xs text-shopmuted mt-1">{products.length} product{products.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          to="/seller/dashboard/add-product"
          className="flex items-center gap-1.5 px-3 py-2 bg-shopprimary text-white rounded-lg hover:bg-[#4338ca] transition-all font-semibold text-xs"
        >
          <FiPlus className="w-3.5 h-3.5" /> Add Product
        </Link>
      </div>

      <div className="relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-shopmuted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-9 pr-3 py-2 bg-[#fafbfe] border border-shopborder rounded-lg focus:border-shopprimary outline-none text-xs"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="bg-white rounded-lg border border-shopborder overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#fafbfe] text-[#8b94a5] text-[10px] uppercase tracking-[0.6px] font-bold">
                  <th className="text-left px-3 py-2.5 font-bold">Product</th>
                  <th className="text-left px-3 py-2.5 font-bold">Price</th>
                  <th className="text-left px-3 py-2.5 font-bold">Stock</th>
                  <th className="text-left px-3 py-2.5 font-bold">Status</th>
                  <th className="text-left px-3 py-2.5 font-bold">Approval</th>
                  <th className="text-right px-3 py-2.5 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f6]">
                {filtered.map((p) => (
                  <tr key={p._id} className="hover:bg-[#fafbff] transition-colors">
                    <td className="px-3 py-2.5 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-[#f1f4fa] overflow-hidden flex-shrink-0">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#c4cad6]"><FiPackage /></div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-shoptext truncate max-w-[200px]">{p.name}</p>
                          <p className="text-[11px] text-shopmuted truncate">{p.sku || p._id?.slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-semibold">Rs. {(p.price || 0).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-xs">
                      <span className={`font-semibold ${p.stock > 0 ? "text-shopgreen" : "text-shopred"}`}>
                        {p.stock > 0 ? p.stock : "Out of stock"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] px-2 py-1 rounded-md font-semibold ${
                        p.status === "active" ? "bg-[#def7e9] text-[#147c4f]" : "bg-[#eef0f5] text-shopmuted"
                      }`}>{p.status}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {p.approvedByAdmin ? (
                        <span className="inline-flex items-center gap-1 text-xs text-shopgreen"><MdCheckCircle /> Approved</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-[#ad6b00]"><MdOutlinePendingActions /> Pending</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={() => navigate(`/seller/dashboard/edit-product/${p._id}`)}
                          className="p-1.5 text-shopmuted hover:text-shopprimary hover:bg-shopprimarylight rounded-md transition-all"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p._id, p.name)}
                          className="p-1.5 text-shopmuted hover:text-shopred hover:bg-[#fdeaea] rounded-md transition-all"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
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
        <div className="bg-white rounded-lg border border-shopborder p-8 text-center">
          <FiPackage className="w-10 h-10 mx-auto text-[#c4cad6] mb-2.5" />
          <p className="text-shopmuted font-medium text-sm">{search ? "No products match your search" : "No products yet"}</p>
          {!search && (
            <Link to="/seller/dashboard/add-product" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-shopprimary text-white rounded-lg hover:bg-[#4338ca] transition-all text-xs font-semibold">
              <FiPlus className="w-3.5 h-3.5" /> Add Your First Product
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
