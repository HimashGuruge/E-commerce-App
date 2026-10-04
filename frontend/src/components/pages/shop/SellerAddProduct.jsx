import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiSave, FiX, FiPlus, FiTrash2, FiUpload } from "react-icons/fi";
import api from "@/utils/api";
import uploadToMedia from "@/components/utils/Mediaupload";
import Swal from "sweetalert2";

export default function SellerAddProduct() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const isEdit = !!productId;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    productName: "",
    description: "",
    price: "",
    originalPrice: "",
    category: "",
    subcategory: "",
    brand: "",
    stock: "",
    sku: "",
    images: [],
    tags: "",
  });

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  // Fetch categories
  useEffect(() => {
    api.get("/api/categories").then(({ data }) => {
      setCategories(data.categories || data.data || []);
    }).catch(() => {});
  }, []);

  // Fetch product if editing
  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    api.get(`/api/products/${productId}`).then(({ data }) => {
      if (data.success) {
        const p = data.product;
        setForm({
          productName: p.name || "",
          description: p.description || "",
          price: p.price?.toString() || "",
          originalPrice: p.originalPrice?.toString() || "",
          category: p.category || "",
          subcategory: p.subcategory || "",
          brand: p.brand || "",
          stock: p.stock?.toString() || "",
          sku: p.sku || "",
          images: p.images || [],
          tags: (p.tags || []).join(", "),
        });
      }
    }).catch(() => {
      Swal.fire({ icon: "error", title: "Product not found" }).then(() => navigate("/seller/dashboard/products"));
    }).finally(() => setLoading(false));
  }, [productId, navigate]);

  const addImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadToMedia(file);
      update("images", [...form.images, url]);
    } catch {
      Swal.fire({ icon: "error", title: "Upload failed" });
    }
  };

  const removeImage = (idx) => {
    update("images", form.images.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!form.productName || !form.price || !form.category) {
      Swal.fire({ icon: "warning", title: "Name, price, and category are required" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
        stock: Number(form.stock) || 0,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      };

      if (isEdit) {
        await api.patch(`/api/products/${productId}`, payload);
        Swal.fire({ icon: "success", title: "Product updated!", timer: 1500, showConfirmButton: false });
      } else {
        await api.post("/api/products", payload);
        Swal.fire({ icon: "success", title: "Product added! Awaiting admin approval.", timer: 2000, showConfirmButton: false });
      }
      navigate("/seller/dashboard/products");
    } catch (err) {
      Swal.fire({ icon: "error", title: err.response?.data?.error || "Failed to save product" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit Product" : "Add Product"}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {isEdit ? "Update your product details" : "List a new product for sale"}
          </p>
        </div>
        <button
          onClick={() => navigate("/seller/dashboard/products")}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all text-sm"
        >
          <FiX className="w-4 h-4" /> Cancel
        </button>
      </div>

      {!isEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 flex items-start gap-3">
          <FiUpload className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">New products require admin approval</p>
            <p className="text-amber-600/80 mt-0.5">Your product will be visible to customers only after an admin reviews and approves it.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Product Name *</label>
            <input
              type="text" value={form.productName}
              onChange={(e) => update("productName", e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
              placeholder="e.g. Premium Cotton T-Shirt"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="seller-description" className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              id="seller-description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none resize-none"
              placeholder="Product description..."
            />
          </div>
          <div>
            <label htmlFor="seller-price" className="block text-sm font-medium text-slate-700 mb-1">Price (Rs.) *</label>
            <input type="number" id="seller-price" value={form.price}
              onChange={(e) => update("price", e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
              placeholder="0.00" min="0" />
          </div>
          <div>
            <label htmlFor="seller-originalPrice" className="block text-sm font-medium text-slate-700 mb-1">Original Price (optional)</label>
            <input type="number" id="seller-originalPrice" value={form.originalPrice}
              onChange={(e) => update("originalPrice", e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
              placeholder="For showing discount" min="0" />
          </div>
          <div>
            <label htmlFor="seller-category" className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
            <select id="seller-category" value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c._id} value={c.slug || c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="seller-brand" className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
            <input type="text" id="seller-brand" value={form.brand}
              onChange={(e) => update("brand", e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
              placeholder="Brand name" />
          </div>
          <div>
            <label htmlFor="seller-stock" className="block text-sm font-medium text-slate-700 mb-1">Stock Quantity</label>
            <input type="number" id="seller-stock" value={form.stock}
              onChange={(e) => update("stock", e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
              placeholder="0" min="0" />
          </div>
          <div>
            <label htmlFor="seller-tags" className="block text-sm font-medium text-slate-700 mb-1">Tags (optional)</label>
            <input type="text" id="seller-tags" value={form.tags}
              onChange={(e) => update("tags", e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none"
              placeholder="e.g. cotton, summer, casual" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Product Images</label>
          <div className="flex flex-wrap gap-3">
            {form.images.map((img, i) => (
              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 group">
                <img src={img} className="w-full h-full object-cover" alt="" />
                <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <FiTrash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-brand-300 hover:bg-brand-50 transition-all">
              <input type="file" onChange={addImage} className="hidden" accept="image/*" />
              <FiPlus className="w-5 h-5 text-slate-400" />
            </label>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-all font-medium flex items-center justify-center gap-2"
        >
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
          ) : (
            <><FiSave className="w-4 h-4" /> {isEdit ? "Update Product" : "Add Product"}</>
          )}
        </button>
      </div>
    </div>
  );
}
