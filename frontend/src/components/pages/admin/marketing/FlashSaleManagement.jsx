import React, { useState, useEffect, useRef } from "react";
import api from "@/utils/api";
import getApiError from "@/utils/errors";
import toast from "react-hot-toast";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSearch } from "react-icons/fi";

export default function FlashSaleManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [orderStr, setOrderStr] = useState("0");
  const debounceRef = useRef(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/flashsale/all");
      setItems(res.data?.flashSale || []);
    } catch (err) {
      console.error("Failed to fetch flash sale items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const searchProducts = async (query) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get(
        `/api/products?search=${encodeURIComponent(query.trim())}&limit=20`
      );
      const list = res.data?.products || [];
      // Hide products that are already in the flash sale
      const inSale = new Set(items.map((i) => i.product?._id || i.product?.productId));
      setResults(list.filter((p) => !inSale.has(p.productId || p._id)));
    } catch (err) {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    setSelectedId(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchProducts(value), 300);
  };

  const pickProduct = (productId) => {
    setSelectedId(productId);
  };

  const openAddModal = () => {
    setEditingId(null);
    setSearch("");
    setResults([]);
    setSelectedId(null);
    setOrderStr(String(items.length));
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingId(item._id);
    setSearch("");
    setResults([]);
    setSelectedId(null);
    setOrderStr(String(item.order || 0));
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingId && selectedId === null) return;
    const orderNum = parseInt(orderStr, 10) || 0;
    try {
      if (editingId) {
        await api.put(`/api/flashsale/${editingId}`, { order: orderNum });
        toast.success("Flash sale item updated");
      } else {
        await api.post("/api/flashsale", { product: selectedId, order: orderNum });
        toast.success("Product added to flash sale");
      }
      closeAndReload();
    } catch (err) {
      toast.error(getApiError(err, "Failed to save"));
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      const nextStatus = item.status === "active" ? "inactive" : "active";
      await api.put(`/api/flashsale/${item._id}`, { status: nextStatus });
      toast.success(
        nextStatus === "active"
          ? "Product is now active in the flash sale"
          : "Product hidden from the flash sale"
      );
      fetchItems();
    } catch (err) {
      toast.error(getApiError(err, "Failed to update status"));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Remove this product from the flash sale?")) return;
    try {
      await api.delete(`/api/flashsale/${id}`);
      toast.success("Product removed from flash sale");
      fetchItems();
    } catch (err) {
      toast.error(getApiError(err, "Failed to delete"));
    }
  };

  const closeAndReload = () => {
    setShowModal(false);
    setEditingId(null);
    setSelectedId(null);
    setResults([]);
    fetchItems();
  };

  const statusColors = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-slate-100 text-slate-500",
  };

  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Flash Sale Management</h1>
          <p className="text-slate-500 text-sm">
            Manage the products shown in the homepage flash sale marquee
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
          >
            ❓ How to use
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <FiPlus size={18} />
            Add Product
          </button>
        </div>
      </div>

      {showHelp && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-4 text-sm text-slate-700">
          <h2 className="text-base font-bold text-slate-900">How to use the Flash Sale</h2>
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-slate-900">1. Add a product</p>
              <p>
                Click <span className="font-medium">Add Product</span> → type a
                product name in the search box → pick a product from the results →
                set the Order number → click <span className="font-medium">Add</span>.
              </p>
              <p className="text-blue-700 mt-1">
                Example: searching "Head" shows "Wireless Bluetooth Headphones" —
                click it, set Order = 1, and it becomes the first item in the homepage marquee.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">2. Change the order</p>
              <p>
                Click the <span className="font-medium">pencil (edit)</span> icon on a
                row → change the Order number → click <span className="font-medium">Update</span>.
                Lower numbers show first in the marquee.
              </p>
              <p className="text-blue-700 mt-1">
                Example: Order 1 = first card, Order 2 = second card, and so on.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">3. Hide a product temporarily</p>
              <p>
                Click the green <span className="font-medium">active</span> pill on a
                row. It turns to <span className="font-medium">inactive</span> and the
                product disappears from the homepage — but it stays in your list.
                Click it again to re-enable.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">4. Remove completely</p>
              <p>
                Click the <span className="font-medium">trash</span> icon on a row.
                The product is removed from the flash sale (the product itself stays
                in the shop).
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Notes</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  A product can only be in the flash sale once — already-added
                  products are hidden from the search results.
                </li>
                <li>
                  The marquee on the homepage shows your list. If you remove
                  everything, it automatically falls back to the lowest-priced
                  discounted products.
                </li>
                <li>
                  The marquee pauses when you hover over it — handy for testing.
                </li>
              </ul>
            </div>
          </div>
          <button
            onClick={() => setShowHelp(false)}
            className="mt-2 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-medium transition-colors"
          >
            Close help
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="h-4 w-40 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-10 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-8 w-16 bg-slate-100 rounded ml-auto animate-pulse" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center text-slate-400">
                    No flash sale products yet. Add one to feature it on the homepage.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            item.product?.images?.[0] ||
                            item.product?.image ||
                            "https://img.lazcdn.com/static/lk/p/default-product.jpg"
                          }
                          alt={item.product?.productName || item.product?.name}
                          className="w-10 h-10 object-cover rounded-lg"
                        />
                        <span className="text-sm font-medium text-slate-900">
                          {item.product?.productName || item.product?.name || "Deleted product"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">
                        Rs. {Number(item.product?.sellingPrice || item.product?.price || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[item.status] || statusColors.active}`}
                      >
                        {item.status || "active"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-500">{item.order || 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditModal(item)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                          <FiEdit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(item._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingId ? "Edit Flash Sale Item" : "Add to Flash Sale"}
              </h3>
              <button onClick={closeAndReload} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Search Product
                  </label>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={search}
                      onChange={handleSearchChange}
                      placeholder="Type a product name..."
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>
                  {searching && (
                    <p className="text-xs text-slate-400 mt-1">Searching...</p>
                  )}
                  {results.length > 0 && (
                    <div className="mt-2 border border-slate-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {results.map((p) => (
                        <button
                          type="button"
                          key={p.productId || p._id}
                          onClick={() => pickProduct(p.productId || p._id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                            selectedId === (p.productId || p._id)
                              ? "bg-brand-50"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <img
                            src={
                              p.images?.[0] ||
                              p.image ||
                              "https://img.lazcdn.com/static/lk/p/default-product.jpg"
                            }
                            alt={p.productName || p.name}
                            className="w-8 h-8 object-cover rounded"
                          />
                          <span className="text-sm text-slate-700 flex-1 truncate">
                            {p.productName || p.name}
                          </span>
                          <span className="text-sm text-slate-500">
                            Rs. {Number(p.sellingPrice || p.price).toLocaleString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedId !== null && (
                    <p className="text-xs text-green-600 mt-1">Product selected</p>
                  )}
                </div>
              )}

              {editingId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Product
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={items.find((i) => i._id === editingId)?.product?.name || ""}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Order</label>
                <input
                  type="number"
                  min="0"
                  value={orderStr}
                  onChange={(e) => setOrderStr(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-slate-400 mt-1">Lower number shows first in the marquee</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeAndReload} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editingId && (selectedId === null || searching)}
                  className="flex-1 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingId ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

