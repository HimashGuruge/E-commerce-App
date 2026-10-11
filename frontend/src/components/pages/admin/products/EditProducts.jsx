import React, { useState, useEffect, useMemo } from "react";
import api from "@/utils/api";
import uploadToMedia from "@/components/utils/Mediaupload.jsx";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { v4 as uuidv4 } from "uuid";
import { FiArrowLeft, FiTrash2 } from "react-icons/fi";
import Swal from "sweetalert2";
import QuillEditor from "@/components/shared/QuillEditor.jsx";

const Colors = {
  primary: "#10b981",
  purple: "#7c3aed",
  gray: "#6b7280",
  grayLight: "#9ca3af",
  border: "#e5e7eb",
  bgLight: "#f9fafb",
  success: "#10b981",
  danger: "#ef4444",
};

const VARIANT_PRESETS = [
  { id: "color-size", label: "Color + Size", attributes: ["Color", "Size"], options: { Color: ["Red", "Blue", "Black", "White"], Size: ["S", "M", "L", "XL"] } },
  { id: "size", label: "Size Only", attributes: ["Size"], options: { Size: ["S", "M", "L", "XL", "XXL"] } },
  { id: "model", label: "Phone Model", attributes: ["Model"], options: { Model: ["iPhone 14", "iPhone 15", "iPhone 16", "Samsung S23", "Samsung S24"] } },
  { id: "storage", label: "Storage", attributes: ["Storage"], options: { Storage: ["64GB", "128GB", "256GB", "512GB", "1TB"] } },
  { id: "color-storage", label: "Color + Storage", attributes: ["Color", "Storage"], options: { Color: ["Black", "White", "Blue", "Green"], Storage: ["128GB", "256GB", "512GB", "1TB"] } },
  { id: "ram", label: "RAM", attributes: ["RAM"], options: { RAM: ["4GB", "8GB", "16GB", "32GB"] } },
  { id: "material", label: "Material", attributes: ["Material"], options: { Material: ["Cotton", "Polyester", "Silk", "Wool", "Linen"] } },
  { id: "pattern", label: "Pattern", attributes: ["Pattern"], options: { Pattern: ["Solid", "Striped", "Floral", "Plaid", "Geometric"] } },
  { id: "flavor", label: "Flavor", attributes: ["Flavor"], options: { Flavor: ["Chocolate", "Vanilla", "Strawberry", "Coffee", "Mint"] } },
  { id: "scent", label: "Scent", attributes: ["Scent"], options: { Scent: ["Lavender", "Rose", "Vanilla", "Citrus", "Ocean"] } },
  { id: "weight", label: "Weight", attributes: ["Weight"], options: { Weight: ["100g", "250g", "500g", "1kg", "2kg"] } },
  { id: "volume", label: "Volume", attributes: ["Volume"], options: { Volume: ["100ml", "250ml", "500ml", "1L", "2L"] } },
  { id: "capacity", label: "Capacity", attributes: ["Capacity"], options: { Capacity: ["1000mAh", "2000mAh", "5000mAh", "10000mAh", "20000mAh"] } },
  { id: "wattage", label: "Wattage", attributes: ["Wattage"], options: { Wattage: ["5W", "10W", "15W", "20W", "50W", "100W"] } },
  { id: "edition", label: "Edition", attributes: ["Edition"], options: { Edition: ["Standard", "Deluxe", "Limited"] } },
];

const disabledStyle = {
  opacity: 0.6,
  pointerEvents: "none",
};

export default function EditProduct() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const productData = location.state?.product;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImageUrls, setExistingImageUrls] = useState([]);
  
  const [dbCategories, setDbCategories] = useState([]);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [categoryImage, setCategoryImage] = useState(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState(null);
  const [selectedCatPreview, setSelectedCatPreview] = useState("");

  const [variants, setVariants] = useState([]);
  const [variantStocks, setVariantStocks] = useState({});
  const [variantPrices, setVariantPrices] = useState({});
  const [variantImages, setVariantImages] = useState({});
  const [variantImagePreviews, setVariantImagePreviews] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});

  // For adding new variants
  const [newVariantAttributes, setNewVariantAttributes] = useState([]);
  const [newAttributeOptions, setNewAttributeOptions] = useState({});
  const [newAttrName, setNewAttrName] = useState("");
  const [newAttrValue, setNewAttrValue] = useState({});
  const [newVariantStocks, setNewVariantStocks] = useState({});
  const [newVariantPrices, setNewVariantPrices] = useState({});
  const [newVariantImages, setNewVariantImages] = useState({});
  const [newGroupImages, setNewGroupImages] = useState({});
  const [newExpandedGroups, setNewExpandedGroups] = useState({});

  const [fetchedProduct, setFetchedProduct] = useState(null);
  const data = productData || fetchedProduct;
  const isParent = Boolean(data?.isParent || data?.isVariantParent);

  const [formData, setFormData] = useState({
    productId: "",
    productName: "",
    altNames: "",
    price: "",
    sellingPrice: "",
    stock: "",
    description: "",
    category: "General",
    brand: "Unbranded",
    status: "ready",
    highlights: "",
    whatsInTheBox: "",
  });

  const [progress, setProgress] = useState(0);
  const [uploadingCategoryImage, setUploadingCategoryImage] = useState(false);
  const [groupImages, setGroupImages] = useState({});

  // Live total stock for variant parents (sum of every variant's stock).
  const totalVariantStock = useMemo(
    () => Object.values(variantStocks).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [variantStocks]
  );

  const parseVariantSku = (vsku) => {
    if (!vsku || typeof vsku !== "string") return {};
    const attrs = {};
    vsku.split("-").forEach((pair) => {
      const eqIdx = pair.indexOf("_");
      if (eqIdx > 0) {
        const key = pair.slice(0, eqIdx);
        const value = pair.slice(eqIdx + 1);
        if (key && value) attrs[key] = value;
      }
    });
    return attrs;
  };

  const getVariantAttributes = (variant) => {
    if (!variant) return {};
    if (variant.attributes && typeof variant.attributes === "object") {
      const attrs = variant.attributes;
      if (attrs instanceof Map) return Object.fromEntries(attrs);
      if (typeof attrs === "object" && Object.keys(attrs).length > 0) {
        const firstVal = Object.values(attrs)[0];
        if (typeof firstVal === "string") return attrs;
      }
    }
    if (variant.variantSku) return parseVariantSku(variant.variantSku);
    return {};
  };

  const getGroupedVariants = () => {
    if (variants.length === 0 || !data?.variantAttributes?.[0]) return {};
    
    const firstAttr = data.variantAttributes[0];
    const grouped = {};
    
    variants.forEach(variant => {
      const attrs = getVariantAttributes(variant);
      const groupValue = attrs[firstAttr] || "Default";
      if (!grouped[groupValue]) {
        grouped[groupValue] = [];
      }
      grouped[groupValue].push(variant);
    });
    
    return grouped;
  };

  const generateNewVariants = () => {
    const attrs = Object.keys(newAttributeOptions);
    if (attrs.length === 0) return [{}];
    
    const generate = (index, current) => {
      if (index === attrs.length) return [current];
      const attr = attrs[index];
      const options = newAttributeOptions[attr] || [];
      let result = [];
      for (const opt of options) {
        const newCurrent = { ...current, [attr]: opt };
        result = result.concat(generate(index + 1, newCurrent));
      }
      return result;
    };
    
    return generate(0, {});
  };

  const getNewGroupedVariants = () => {
    const variants = generateNewVariants();
    if (variants.length === 0 || !newVariantAttributes[0]) return {};
    
    const firstAttr = newVariantAttributes[0];
    const grouped = {};
    
    variants.forEach(variant => {
      const groupValue = variant[firstAttr] || "Default";
      if (!grouped[groupValue]) {
        grouped[groupValue] = [];
      }
      grouped[groupValue].push(variant);
    });
    
    return grouped;
  };

  const addNewVariantAttribute = () => {
    if (newAttrName.trim() && !newVariantAttributes.includes(newAttrName.trim())) {
      setNewVariantAttributes([...newVariantAttributes, newAttrName.trim()]);
      setNewAttributeOptions({ ...newAttributeOptions, [newAttrName.trim()]: [] });
      setNewAttrName("");
    }
  };

  const addNewAttributeOption = (attr) => {
    if (newAttrValue[attr]?.trim()) {
      const current = newAttributeOptions[attr] || [];
      if (!current.includes(newAttrValue[attr].trim())) {
        setNewAttributeOptions({ ...newAttributeOptions, [attr]: [...current, newAttrValue[attr].trim()] });
        setNewAttrValue({ ...newAttrValue, [attr]: "" });
      }
    }
  };

  const removeNewAttributeOption = (attr, value) => {
    const current = newAttributeOptions[attr] || [];
    setNewAttributeOptions({ ...newAttributeOptions, [attr]: current.filter(v => v !== value) });
  };

  const removeNewVariantAttribute = (attr) => {
    setNewVariantAttributes(newVariantAttributes.filter(a => a !== attr));
    const newOpts = { ...newAttributeOptions };
    delete newOpts[attr];
    setNewAttributeOptions(newOpts);
  };

  const fetchVariants = async (productId) => {
    try {
      const res = await api.get(
        `/api/products/${productId}/variants`
      );
      if (res.data?.success && res.data?.variants) {
        const fetchedVariants = res.data.variants;
        setVariants(fetchedVariants);
        const stockMap = {};
        const priceMap = {};
        fetchedVariants.forEach((v) => {
          stockMap[v._id] = v.stock ?? 0;
          priceMap[v._id] = v.price ?? 0;
        });
        setVariantStocks(stockMap);
        setVariantPrices(priceMap);
        // Initialize variant images from existing data
        const imgMap = {};
        fetchedVariants.forEach((v) => {
          imgMap[v._id] = v.images || [];
        });
        setVariantImages(imgMap);
      }
    } catch (err) {
      console.error("Failed to fetch variants:", err);
    }
  };

  const handleVariantImageAdd = (variantId, e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newImages = files.map(file => ({
        file: file,
        preview: URL.createObjectURL(file)
      }));
      setVariantImages(prev => ({
        ...prev,
        [variantId]: [...(prev[variantId] || []), ...newImages]
      }));
      setVariantImagePreviews(prev => ({
        ...prev,
        [variantId]: [...(prev[variantId] || []), ...newImages.map(f => f.preview)]
      }));
    }
  };

  const handleVariantImageRemove = (variantId, index) => {
    const currentImages = variantImages[variantId] || [];
    const removed = currentImages[index];
    const newImages = currentImages.filter((_, i) => i !== index);
    setVariantImages(prev => ({ ...prev, [variantId]: newImages }));
    // If it was a new (unuploaded) image with a preview object, also clean up previews
    if (removed && removed.file) {
      setVariantImagePreviews(prev => ({
        ...prev,
        [variantId]: (prev[variantId] || []).filter((_, i) => i !== index)
      }));
    }
  };

  const handleVariantStockChange = (variantId, value) => {
    setVariantStocks((prev) => ({ ...prev, [variantId]: parseInt(value) || 0 }));
  };

  const handleVariantPriceChange = (variantId, value) => {
    setVariantPrices((prev) => ({ ...prev, [variantId]: parseFloat(value) || 0 }));
  };

  const handleNewVariantImageAdd = (variantKey, e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newImgs = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
      setNewVariantImages((prev) => ({
        ...prev,
        [variantKey]: [...(prev[variantKey] || []), ...newImgs],
      }));
    }
  };

  const handleNewVariantImageRemove = (variantKey, index) => {
    setNewVariantImages((prev) => ({
      ...prev,
      [variantKey]: (prev[variantKey] || []).filter((_, i) => i !== index),
    }));
  };

  const handleDeleteVariant = async (variant) => {
    const label = Object.entries(getVariantAttributes(variant))
      .map(([k, v]) => `${k}: ${v}`)
      .join(" / ") || variant.variantSku || "this variant";
    const result = await Swal.fire({
      title: "Delete Variant?",
      text: `Delete "${label}"? This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: Colors.danger,
      cancelButtonColor: Colors.gray,
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/api/products/variants/${variant._id}`);
      setVariants((prev) => prev.filter((v) => v._id !== variant._id));
      setVariantStocks((prev) => {
        const next = { ...prev };
        delete next[variant._id];
        return next;
      });
      setVariantPrices((prev) => {
        const next = { ...prev };
        delete next[variant._id];
        return next;
      });
      setVariantImages((prev) => {
        const next = { ...prev };
        delete next[variant._id];
        return next;
      });
      Swal.fire({ icon: "success", title: "Deleted", text: "Variant deleted", timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Delete Failed", text: err.response?.data?.message || err.message });
    }
  };

  const handleEditVariantValues = async (variant) => {
    const attrs = getVariantAttributes(variant);
    const entries = Object.entries(attrs);
    if (entries.length === 0) return;

    // Build the pool of all distinct values per attribute across this product's variants
    const valuePool = {};
    variants.forEach((v) => {
      const vAttrs = getVariantAttributes(v);
      entries.forEach(([key]) => {
        const val = vAttrs[key];
        if (val !== undefined) {
          if (!valuePool[key]) valuePool[key] = [];
          if (!valuePool[key].includes(val)) valuePool[key].push(val);
        }
      });
    });

    const fieldHtml = entries
      .map(
        ([key, value], i) => `
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 4px;">${key}</label>
            <select id="edit-variant-attr-${i}" style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 13px;">
              ${(valuePool[key] || [value])
                .map(
                  (v) =>
                    `<option value="${String(v).replace(/"/g, "&quot;")}" ${v === value ? "selected" : ""}>${String(v).replace(/</g, "&lt;")}</option>`
                )
                .join("")}
            </select>
          </div>`
      )
      .join("");

    const result = await Swal.fire({
      title: "Edit Variant Values",
      html: fieldHtml,
      showCancelButton: true,
      confirmButtonText: "Save",
      confirmButtonColor: Colors.primary,
      cancelButtonColor: Colors.gray,
      preConfirm: () => {
        const newAttrs = {};
        entries.forEach(([key], i) => {
          newAttrs[key] = document.getElementById(`edit-variant-attr-${i}`).value;
        });
        return newAttrs;
      },
    });

    if (!result.isConfirmed || !result.value) return;

    const newAttrs = result.value;
    if (JSON.stringify(attrs) === JSON.stringify(newAttrs)) return;

    try {
      await api.patch(`/api/products/variants/${variant._id}`, { attributes: newAttrs });
      setVariants((prev) => prev.map((v) => (v._id === variant._id ? { ...v, attributes: newAttrs } : v)));
      Swal.fire({ icon: "success", title: "Updated", text: "Variant values updated", timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Update Failed", text: err.response?.data?.message || err.message });
    }
  };

  const fetchCats = async (currentCategoryName) => {
    try {
      const res = await api.get(`/api/categories`);
      const cats = (res.data?.categories || res.data || []).map(c => ({
        _id: c._id?.$oid || c._id,
        name: c.name,
        image: c.image || "",
      }));
      if (cats.length > 0) {
        setDbCategories(cats);
        const target = currentCategoryName || formData.category;
        const current = cats.find(c => c.name === target);
        if (current) setSelectedCatPreview(current.image);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  useEffect(() => { fetchCats(); }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    try {
      const decoded = jwtDecode(token);
      if (decoded.role !== "admin") {
        Swal.fire({ icon: 'error', title: 'Access Denied', text: 'Only administrators can edit products.' })
          .then(() => navigate("/"));
      }
    } catch {
      localStorage.removeItem("token");
      navigate("/login");
    }
  }, [navigate]);

  // Fallback: when navigated without location.state (e.g. from AdminSellerDetail),
  // fetch the product directly by the :productId route param.
  const { productId } = useParams();
  useEffect(() => {
    if (productData || !productId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/api/products/${productId}/with-variants`);
        if (!cancelled && res.data?.success && res.data?.product) {
          setFetchedProduct(res.data.product);
        } else if (!cancelled) {
          Swal.fire({ icon: 'error', title: 'No Product Data', text: 'Product information not found' })
            .then(() => navigate("/admin/dashboard/adminviewproducts"));
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          Swal.fire({ icon: 'error', title: 'No Product Data', text: 'Product information not found' })
            .then(() => navigate("/admin/dashboard/adminviewproducts"));
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [productData, productId, navigate]);

  useEffect(() => {
    if (!data) return;

    const initialCategory = data.category || "General";

    setFormData({
      productId: data.productId ? String(data.productId).replace('PROD-', '') : uuidv4().substring(0, 8).toUpperCase(),
      productName: data.productName || "",
      altNames: Array.isArray(data.altNames) ? data.altNames.join(", ") : data.altNames || "",
      price: data.price || "",
      sellingPrice: data.sellingPrice || data.price || "",
      stock: data.stock || "",
      description: data.description || "",
      category: initialCategory,
      brand: data.brand || "Unbranded",
      status: data.status || "ready",
      highlights: Array.isArray(data.tags) ? data.tags.join(", ") : data.highlights || "",
      whatsInTheBox: data.whatsInTheBox || "",
    });

    if (data.images && data.images.length > 0) {
      setImagePreviews(data.images);
      setExistingImageUrls(data.images);
    }

    fetchCats(initialCategory);

    if (data.isParent || data.isVariantParent) {
      fetchVariants(data.productId);
    }

    setLoading(false);
  }, [data, navigate]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setImages([...images, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setImagePreviews([...existingImageUrls, ...imagePreviews.filter(url => !existingImageUrls.includes(url)), ...newPreviews]);
    }
  };

  const removeImage = (index) => {
    if (index < existingImageUrls.length) {
      const newExistingUrls = existingImageUrls.filter((_, i) => i !== index);
      setExistingImageUrls(newExistingUrls);
      const newPreviews = [...newExistingUrls, ...images.map(file => URL.createObjectURL(file))];
      setImagePreviews(newPreviews);
    } else {
      const newImagesIndex = index - existingImageUrls.length;
      const newImagesArray = [...images];
      newImagesArray.splice(newImagesIndex, 1);
      setImages(newImagesArray);
      const newPreviews = [...existingImageUrls, ...newImagesArray.map(file => URL.createObjectURL(file))];
      setImagePreviews(newPreviews);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === "category") {
      const selected = dbCategories.find(c => c.name === value);
      setSelectedCatPreview(selected ? selected.image : "");
    }
  };

  const handleDescriptionChange = (content) => {
    setFormData(prev => ({ ...prev, description: content }));
  };

  const handleAddCategory = async () => {
    const categoryName = formData.category.trim();
    if (!categoryName) {
      Swal.fire({ icon: 'warning', title: 'Error', text: 'Category name is required' });
      return;
    }
    try {
      setUploadingCategoryImage(true);
      let categoryImageUrl = "";
      if (categoryImage) {
        categoryImageUrl = await uploadToMedia(categoryImage);
      }
      const catRes = await api.post(`/api/categories`, {
        name: categoryName,
        image: categoryImageUrl,
        slug: categoryName.toLowerCase().trim().replace(/\s+/g, '-'),
      });
      const newCat = catRes.data.category || catRes.data;
      const createdCat = {
        _id: newCat._id?.$oid || newCat._id,
        name: newCat.name || categoryName,
        image: newCat.image || "",
      };
      setDbCategories(prev => [...prev, createdCat]);
      setIsNewCategory(false);
      setFormData(prev => ({ ...prev, category: createdCat.name }));
      setSelectedCatPreview(createdCat.image);
      setCategoryImage(null);
      setCategoryImagePreview(null);
      Swal.fire({ icon: 'success', title: 'Success', text: 'Category added!' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err?.response?.data?.message || "Failed to add category" });
    } finally {
      setUploadingCategoryImage(false);
    }
  };

  const handleEditCategory = async (cat) => {
    const { value: formValues } = await Swal.fire({
      title: 'Edit Category',
      html: `
        <div id="swal-edit-overlay" style="display: none; position: fixed; inset: 0; background: rgba(255,255,255,0.85); z-index: 9999; border-radius: 12px; flex-direction: column; align-items: center; justify-content: center;">
          <div style="width: 40px; height: 40px; border: 3px solid #10b981; border-top-color: transparent; border-radius: 50%; animation: swal-spin 0.8s linear infinite;"></div>
          <p style="margin-top: 12px; font-size: 14px; font-weight: 600; color: #374151;">Uploading image...</p>
          <style>@keyframes swal-spin { to { transform: rotate(360deg); } }</style>
        </div>
        <div style="text-align: left; margin-bottom: 14px;">
          <label style="font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 6px;">Category Name</label>
          <input id="swal-cat-name" type="text" value="${cat.name}" style="width: 100%; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none; box-sizing: border-box;">
        </div>
        <div style="text-align: left;">
          <label style="font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 6px;">Category Image</label>
          <img id="swal-cat-preview" src="${cat.image || ""}" style="width: 64px; height: 64px; object-fit: cover; border-radius: 8px; margin-bottom: 8px; display: ${cat.image ? "block" : "none"};">
          <label for="swal-cat-image" id="swal-cat-upload-btn" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: #f3f4f6; border: 1px dashed #d1d5db; border-radius: 8px; cursor: pointer; font-size: 13px; color: #6b7280;">
            <span style="font-size: 16px;">📁</span> Choose New Image
          </label>
          <input id="swal-cat-image" type="file" accept="image/*" style="display: none;">
          <p style="font-size: 11px; color: #9ca3af; margin-top: 4px;">PNG, JPG, WEBP</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Update',
      cancelButtonText: 'Cancel',
      confirmButtonColor: Colors.primary,
      didOpen: () => {
        const fileInput = document.getElementById('swal-cat-image');
        const previewImg = document.getElementById('swal-cat-preview');
        fileInput.addEventListener("change", (e) => {
          const file = e.target.files[0];
          if (file) {
            previewImg.src = URL.createObjectURL(file);
            previewImg.style.display = "block";
          }
        });
      },
      preConfirm: async () => {
        const newName = document.getElementById('swal-cat-name').value.trim();
        const newFile = document.getElementById('swal-cat-image').files[0];
        if (!newName) { Swal.showValidationMessage("Category name required"); return false; }
        let newImage = cat.image || "";
        if (newFile) {
          const overlay = document.getElementById("swal-edit-overlay");
          if (overlay) overlay.style.display = "flex";
          newImage = await uploadToMedia(newFile);
          if (overlay) overlay.style.display = "none";
        }
        return {
          name: newName,
          image: newImage,
          slug: newName.toLowerCase().trim().replace(/\s+/g, '-'),
        };
      },
    });

    if (!formValues) return;

    try {
      const res = await api.patch(`/api/categories/${cat._id}`, {
        name: formValues.name,
        image: formValues.image,
        slug: formValues.slug,
      });
      const updatedCat = res.data.category;
      if (formData.category === cat.name && updatedCat && updatedCat.name !== cat.name) {
        setFormData(prev => ({ ...prev, category: updatedCat.name }));
      }
      if (formData.category === cat.name && updatedCat) {
        setSelectedCatPreview(updatedCat.image || "");
      }
      fetchCats();
      Swal.fire({ icon: 'success', title: 'Updated', text: 'Category updated' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err?.response?.data?.message || "Failed to update category" });
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    const result = await Swal.fire({
      title: 'Delete Category?',
      text: `Delete "${catName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: Colors.danger,
      cancelButtonColor: Colors.gray,
      confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/api/categories/${catId}`);
      if (formData.category === catName) {
        setFormData(prev => ({ ...prev, category: "General" }));
        setSelectedCatPreview("");
      }
      fetchCats();
      Swal.fire({ icon: 'success', title: 'Deleted', text: 'Category deleted' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err?.response?.data?.message || "Failed to delete category" });
    }
  };

  const handleDeleteProduct = async () => {
    const result = await Swal.fire({
      title: 'Delete Product?',
      html: `<p>This will permanently delete this product${isParent ? " and all its variants" : ""}.</p><p>This action cannot be undone.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: Colors.danger,
      cancelButtonColor: Colors.gray,
      confirmButtonText: 'Yes, delete it',
    });
    if (!result.isConfirmed) return;

    setSaving(true);
    try {
      await api.delete(`/api/products/${data.productId}`);
      Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'Product deleted successfully',
        timer: 1500,
        showConfirmButton: false,
      }).then(() => navigate("/admin/dashboard/adminviewproducts"));
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Delete Failed', text: err.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  const validateForm = () => {
    if (!formData.productName.trim()) {
      Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Product name is required' });
      return false;
    }
    if (!formData.category.trim()) {
      Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Category is required' });
      return false;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Please enter a valid price' });
      return false;
    }
    if (imagePreviews.length === 0) {
      Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Please upload at least one image' });
      return false;
    }
    if (!isParent && (!formData.stock || parseInt(formData.stock) <= 0)) {
      Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Please enter a valid stock quantity' });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const confirmResult = await Swal.fire({
      title: 'Update Product?',
      text: "Are you sure you want to save these changes?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: Colors.primary,
      cancelButtonColor: Colors.danger,
      confirmButtonText: 'Yes, update it'
    });

    if (!confirmResult.isConfirmed) return;

    setSaving(true);
    setProgress(10);

    try {
      Swal.fire({ title: 'Updating Product...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

      let finalCategoryName = formData.category.trim();

      if (isNewCategory) {
        const catImageUrl = await uploadToMedia(categoryImage);
        const catRes = await api.post(
          `/api/categories`,
          { name: finalCategoryName, image: catImageUrl, slug: finalCategoryName.toLowerCase().trim().replace(/\s+/g, '-') }
        );
        const created = catRes.data?.category || catRes.data;
        finalCategoryName = created.name || finalCategoryName;
        await fetchCats();
      }

      setProgress(30);
      let imgUrls = existingImageUrls;
      if (images.length > 0) {
        const newImgUrls = await Promise.all(images.map(file => uploadToMedia(file)));
        imgUrls = [...existingImageUrls, ...newImgUrls];
      }

      const isParentEdit = isParent;

      const payload = {
        productName: formData.productName.trim(),
        altNames: formData.altNames ? formData.altNames.split(",").map(n => n.trim()).filter(n => n !== "") : [],
        price: parseFloat(formData.price),
        sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : parseFloat(formData.price),
        stock: isParentEdit ? undefined : parseInt(formData.stock) || 0,
        description: formData.description.trim(),
        category: finalCategoryName,
        brand: formData.brand.trim(),
        status: data?.status || "ready",
        highlights: formData.highlights ? formData.highlights.split(",").map(n => n.trim()).filter(n => n !== "") : [],
        whatsInTheBox: formData.whatsInTheBox?.trim() || "",
        images: imgUrls,
      };

      setProgress(50);
      await api.patch(
        `/api/products/${data.productId}`,
        payload
      );

      setProgress(70);
      // Persist variant stock/price/images. Upload group images first (shared per group),
      // then per-variant images. Priority: variant image > group image > existing images.
      if (isParentEdit && variants.length > 0) {
        const uploadedGroupImages = {};
        for (const groupName of Object.keys(groupImages)) {
          const groupImgData = groupImages[groupName];
          if (groupImgData && groupImgData.length > 0) {
            const urls = await Promise.all(groupImgData.map(img => uploadToMedia(img.file || img)));
            uploadedGroupImages[groupName] = urls;
          }
        }

        for (const variant of variants) {
          const newStock = variantStocks[variant._id] ?? variant.stock;
          const newPrice = variantPrices[variant._id] ?? variant.price;

          let finalImages = variantImages[variant._id] || [];
          const newVariantImages = finalImages.filter(img => img && img.file);
          const existingVariantImages = finalImages.filter(img => !img || !img.file);

          if (newVariantImages.length > 0) {
            const uploadedUrls = await Promise.all(newVariantImages.map(img => uploadToMedia(img.file)));
            finalImages = [...existingVariantImages, ...uploadedUrls];
          } else {
            const firstAttr = data.variantAttributes?.[0];
            const groupName = getVariantAttributes(variant)[firstAttr] || "Default";
            const groupImgUrls = uploadedGroupImages[groupName];
            finalImages = groupImgUrls && groupImgUrls.length > 0 ? groupImgUrls : existingVariantImages;
          }

          if (newStock !== variant.stock || newPrice !== variant.price || finalImages.length > 0) {
            try {
              await api.patch(
                `/api/products/variants/${variant._id}`,
                { stock: newStock, price: newPrice, sellingPrice: newPrice, images: finalImages }
              );
            } catch (varErr) {
              console.error(`Failed to update variant ${variant._id}:`, varErr);
            }
          }
        }
      }

      setProgress(100);
      Swal.fire({ icon: 'success', title: 'Success!', text: 'Product updated successfully', timer: 1500, showConfirmButton: false })
        .then(() => navigate("/admin/dashboard/adminviewproducts"));

    } catch (err) {
      console.error("Update failed:", err);
      Swal.fire({ icon: 'error', title: 'Update Failed', text: err.response?.data?.message || err.message });
    } finally {
      setSaving(false);
      setProgress(0);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", border: "4px solid #e5e7eb", borderTopColor: Colors.primary, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }}></div>
          <p style={{ color: Colors.gray }}>Loading product data...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", fontFamily: "'Segoe UI', sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <button onClick={() => navigate("/admin/dashboard/adminviewproducts")} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: Colors.gray, cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>
          <FiArrowLeft /> Back to Products
        </button>
        <button onClick={handleDeleteProduct} disabled={saving} style={{ display: "flex", alignItems: "center", gap: "6px", background: saving ? Colors.gray : "#fef2f2", color: Colors.danger, border: `1px solid ${Colors.danger}`, cursor: saving ? "not-allowed" : "pointer", padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "600" }}>
          <FiTrash2 size={14} /> Delete Product
        </button>
      </div>

      <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#1f2937", marginBottom: "24px" }}>Edit Product</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "24px", ...(saving ? disabledStyle : {}) }}>
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Basic Info */}
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#374151", marginBottom: "16px", borderBottom: `1px solid ${Colors.border}`, paddingBottom: "12px" }}>Basic Information</h2>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>Product Name <span style={{ color: Colors.danger }}>*</span></label>
              <input type="text" name="productName" value={formData.productName} onChange={handleChange} placeholder="Enter product name" style={{ width: "100%", padding: "12px", border: `1px solid ${Colors.border}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>Alternate Names</label>
              <input type="text" name="altNames" value={formData.altNames} onChange={handleChange} placeholder="Separate with commas" style={{ width: "100%", padding: "12px", border: `1px solid ${Colors.border}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>Price (LKR) <span style={{ color: Colors.danger }}>*</span></label>
                <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="0.00" min="0" style={{ width: "100%", padding: "12px", border: `1px solid ${Colors.border}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>Selling Price</label>
                <input type="number" name="sellingPrice" value={formData.sellingPrice} onChange={handleChange} placeholder="0.00" min="0" style={{ width: "100%", padding: "12px", border: `1px solid ${Colors.border}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              {isParent ? (
                <>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>Total Stock (auto)</label>
                  <div style={{ width: "100%", padding: "12px", border: `1px solid ${Colors.border}`, borderRadius: "10px", fontSize: "14px", background: Colors.bgLight, display: "flex", alignItems: "center", justifyContent: "space-between", color: "#111827", fontWeight: 600, boxSizing: "border-box" }}>
                    <span style={{ color: "#6b7280", fontWeight: 500, fontSize: "12px" }}>Sum of variant stocks</span>
                    <span>{totalVariantStock}</span>
                  </div>
                  <p style={{ fontSize: "11px", color: Colors.grayLight, marginTop: "4px" }}>Enter each variant's stock below — this total updates instantly.</p>
                </>
              ) : (
                <>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>Stock Quantity</label>
                  <input type="number" name="stock" value={formData.stock} onChange={handleChange} placeholder="0" min="0" style={{ width: "100%", padding: "12px", border: `1px solid ${Colors.border}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                </>
              )}
            </div>
          </div>

          {/* Product Type */}
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ marginBottom: "16px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#374151", marginBottom: "12px" }}>Product Type</h2>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div 
                  style={{ 
                    padding: "16px", 
                    borderRadius: "12px", 
                    border: `2px solid ${!isParent ? Colors.primary : Colors.border}`,
                    background: !isParent ? "#eff6ff" : "white",
                    opacity: isParent ? 0.6 : 1,
                    cursor: "default"
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: "600", color: !isParent ? Colors.primary : "#374151", marginBottom: "4px" }}>Simple Product</div>
                  <div style={{ fontSize: "12px", color: Colors.gray }}>One size, one price</div>
                </div>
                
                <div 
                  style={{ 
                    padding: "16px", 
                    borderRadius: "12px", 
                    border: `2px solid ${isParent ? Colors.purple : Colors.border}`,
                    background: isParent ? "#faf5ff" : "white",
                    opacity: isParent ? 1 : 0.6,
                    cursor: "default"
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: "600", color: isParent ? Colors.purple : "#374151", marginBottom: "4px" }}>Product with Variants</div>
                  <div style={{ fontSize: "12px", color: Colors.gray }}>{variants.length} variants</div>
                </div>
              </div>
              
              {isParent && data?.variantAttributes && (
                <div style={{ marginTop: "12px", padding: "12px", background: Colors.bgLight, borderRadius: "8px" }}>
                  <div style={{ fontSize: "12px", color: Colors.gray }}><strong>Attributes:</strong> {data.variantAttributes.join(", ")}</div>
                </div>
              )}
            </div>
          </div>

          {/* Add New Variants Section */}
          {isParent && (
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: Colors.purple, marginBottom: "16px", borderBottom: `1px solid ${Colors.border}`, paddingBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              Add New Variants
            </h2>
            
            <div style={{ padding: "12px", background: Colors.bgLight, borderRadius: "12px", border: "1px solid " + Colors.border, marginBottom: "16px", fontSize: "12px", color: Colors.gray }}>
              <span style={{ fontWeight: 600, color: "#374151" }}>How it works:</span> 1. Pick attributes · 2. Add their values · 3. Set stock & price per combination — e.g. Color (Red, Blue) + Size (S, M) = 4 variants
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: Colors.gray, marginBottom: "8px" }}>Start from a preset</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {VARIANT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setNewVariantAttributes(preset.attributes);
                      setNewAttributeOptions(preset.options);
                    }}
                    style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: `1px solid ${Colors.border}`, borderRadius: "16px", color: "#4b5563", cursor: "pointer" }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: "16px", background: "#f0f9ff", borderRadius: "12px", border: "1px solid #bae6fd", marginBottom: "16px" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#0369a1", marginBottom: "8px" }}>Or add your own options</div>
              <div style={{ fontSize: "13px", color: "#075985", marginBottom: "12px" }}>
                Add new options like "Size", "Color" to create more variants
              </div>

              <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                <input
                  type="text"
                  value={newAttrName}
                  onChange={(e) => setNewAttrName(e.target.value)}
                  placeholder='Type an attribute name, e.g. "Color"'
                  style={{ flex: 1, padding: "8px 10px", border: `1px solid ${Colors.border}`, borderRadius: "8px", fontSize: "12px", outline: "none" }}
                  onKeyPress={(e) => e.key === "Enter" && addNewVariantAttribute()}
                />
                <button type="button" onClick={addNewVariantAttribute} style={{ padding: "8px 14px", background: Colors.purple, color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>Add</button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                <button 
                  type="button"
                  onClick={() => {
                    setNewVariantAttributes([...newVariantAttributes, "Color"]);
                    setNewAttributeOptions({ ...newAttributeOptions, Color: [] });
                  }}
                  style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: "1px solid #7c3aed", borderRadius: "16px", color: "#7c3aed", cursor: "pointer" }}
                >
                  + Color
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setNewVariantAttributes([...newVariantAttributes, "Size"]);
                    setNewAttributeOptions({ ...newAttributeOptions, Size: [] });
                  }}
                  style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: "1px solid #7c3aed", borderRadius: "16px", color: "#7c3aed", cursor: "pointer" }}
                >
                  + Size
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setNewVariantAttributes([...newVariantAttributes, "Model"]);
                    setNewAttributeOptions({ ...newAttributeOptions, Model: [] });
                  }}
                  style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: "1px solid #10b981", borderRadius: "16px", color: "#10b981", cursor: "pointer" }}
                >
                  + Model
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setNewVariantAttributes([...newVariantAttributes, "Storage"]);
                    setNewAttributeOptions({ ...newAttributeOptions, Storage: [] });
                  }}
                  style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: "1px solid #10b981", borderRadius: "16px", color: "#10b981", cursor: "pointer" }}
                >
                  + Storage
                </button>
              </div>

              {newVariantAttributes.length > 0 && (
                <div>
                  {newVariantAttributes.map(attr => (
                    <div key={attr} style={{ padding: "12px", background: "white", borderRadius: "8px", marginBottom: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "600", color: Colors.purple }}>{attr}</span>
                        <button type="button" onClick={() => removeNewVariantAttribute(attr)} style={{ color: Colors.danger, background: "none", border: "none", cursor: "pointer", fontSize: "11px" }}>Remove</button>
                      </div>
                      
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                        {(newAttributeOptions[attr] || []).map(value => (
                          <div key={value} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 8px", background: Colors.bgLight, borderRadius: "4px", fontSize: "12px" }}>
                            <span>{value}</span>
                            <button type="button" onClick={() => removeNewAttributeOption(attr, value)} style={{ color: Colors.danger, background: "none", border: "none", cursor: "pointer", fontSize: "10px" }}>x</button>
                          </div>
                        ))}
                      </div>
                      
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input 
                          type="text" 
                          value={newAttrValue[attr] || ""} 
                          onChange={(e) => setNewAttrValue({ ...newAttrValue, [attr]: e.target.value })} 
                          placeholder={`Add ${attr} value`}
                          style={{ flex: 1, padding: "6px 10px", border: `1px solid ${Colors.border}`, borderRadius: "6px", fontSize: "12px" }}
                          onKeyPress={(e) => e.key === "Enter" && addNewAttributeOption(attr)}
                        />
                        <button type="button" onClick={() => addNewAttributeOption(attr)} style={{ padding: "6px 12px", background: Colors.purple, color: "white", border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>Add</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {newVariantAttributes.length > 0 && Object.values(newAttributeOptions).some(arr => arr.length > 0) && (
              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "999px", background: "#f5f3ff", border: "1px solid #ede9fe", marginBottom: "16px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: generateNewVariants().length > 0 ? "#10b981" : "#fbbf24" }}></span>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: Colors.purple }}>
                    {generateNewVariants().length} variants · grouped by {newVariantAttributes[0]}
                  </span>
                </div>

                <div style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "12px" }}>Set price & stock for each combination</div>

                {Object.entries(getNewGroupedVariants()).map(([groupName, groupVariants]) => {
                  const isExpanded = newExpandedGroups[groupName] !== false;
                  return (
                    <div key={groupName} style={{ marginBottom: "12px", background: "white", borderRadius: "12px", border: `1px solid ${Colors.border}`, overflow: "hidden" }}>
                      <div 
                        onClick={() => setNewExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                        style={{ padding: "12px", background: isExpanded ? Colors.bgLight : "white", cursor: "pointer", borderBottom: isExpanded ? `1px solid ${Colors.border}` : "none" }}
                      >
                        <span style={{ fontSize: "12px", color: Colors.gray }}>{isExpanded ? "▼" : "▶"}</span>
                        <span style={{ fontSize: "13px", fontWeight: "600", color: Colors.purple, marginLeft: "8px" }}>{newVariantAttributes[0]}: {groupName}</span>
                        <span style={{ fontSize: "11px", color: Colors.gray, marginLeft: "8px" }}>({groupVariants.length})</span>
                      </div>
                      {isExpanded && (
                        <div style={{ padding: "12px" }}>
                          {/* Group images (applies to all variants in this group) */}
                          <div style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: `1px dashed ${Colors.border}` }}>
                            <div style={{ fontSize: "12px", fontWeight: "500", color: Colors.gray, marginBottom: "8px" }}>
                              Images for {newVariantAttributes[0]}: {groupName} <span style={{ color: Colors.grayLight }}>(applies to all in this group)</span>
                            </div>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              {(newGroupImages[groupName] || []).map((img, i) => (
                                <div key={i} style={{ position: "relative" }}>
                                  <img src={img.preview} alt="" style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "8px", border: `1px solid ${Colors.border}` }} />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = (newGroupImages[groupName] || []).filter((_, idx) => idx !== i);
                                      setNewGroupImages(prev => ({ ...prev, [groupName]: updated }));
                                    }}
                                    style={{ position: "absolute", top: "-6px", right: "-6px", width: "18px", height: "18px", background: Colors.danger, color: "white", border: "none", borderRadius: "50%", fontSize: "10px", cursor: "pointer" }}
                                  >×
                                  </button>
                                </div>
                              ))}
                              <label style={{ width: "48px", height: "48px", display: "grid", placeItems: "center", cursor: "pointer", border: `2px dashed ${Colors.border}`, borderRadius: "8px" }}>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files);
                                    if (files.length > 0) {
                                      const newImgs = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
                                      setNewGroupImages(prev => ({ ...prev, [groupName]: [...(prev[groupName] || []), ...newImgs] }));
                                    }
                                  }}
                                />
                                <span style={{ fontSize: "18px", color: Colors.grayLight }}>+</span>
                              </label>
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "10px" }}>
                            {groupVariants.map((variant, idx) => {
                              const variantKey = Object.values(variant).join("-");
                              const variantImgs = newVariantImages[variantKey] || [];
                              return (
                                <div key={idx} style={{ background: Colors.bgLight, borderRadius: "8px", padding: "10px" }}>
                                  <div style={{ fontSize: "11px", fontWeight: "600", color: Colors.purple, marginBottom: "8px", textAlign: "center" }}>
                                    {Object.values(variant).join(" / ")}
                                  </div>
                                  {/* Per-variant images */}
                                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px", justifyContent: "center" }}>
                                    {variantImgs.slice(0, 4).map((img, i) => (
                                      <div key={i} style={{ position: "relative" }}>
                                        <img src={img.preview} alt="" style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "6px", border: `1px solid ${Colors.border}` }} />
                                        <button
                                          type="button"
                                          onClick={() => handleNewVariantImageRemove(variantKey, i)}
                                          style={{ position: "absolute", top: "-5px", right: "-5px", width: "16px", height: "16px", background: Colors.danger, color: "white", border: "none", borderRadius: "50%", fontSize: "9px", cursor: "pointer" }}
                                        >×
                                        </button>
                                      </div>
                                    ))}
                                    <label style={{ cursor: "pointer", display: "grid", placeItems: "center" }}>
                                      <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => handleNewVariantImageAdd(variantKey, e)} />
                                      <span style={{ padding: "4px 8px", fontSize: "10px", fontWeight: "500", color: "#059669", border: `1px dashed #6ee7b7`, borderRadius: "6px" }}>+ Image</span>
                                    </label>
                                  </div>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Stock"
                                    value={newVariantStocks[variantKey] || ""}
                                    onChange={(e) => setNewVariantStocks(prev => ({ ...prev, [variantKey]: parseInt(e.target.value) || 0 }))}
                                    style={{ width: "100%", padding: "6px", border: `1px solid ${Colors.border}`, borderRadius: "4px", fontSize: "11px", marginBottom: "6px", textAlign: "center" }}
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Price"
                                    value={newVariantPrices[variantKey] || ""}
                                    onChange={(e) => setNewVariantPrices(prev => ({ ...prev, [variantKey]: parseFloat(e.target.value) || 0 }))}
                                    style={{ width: "100%", padding: "6px", border: `1px solid ${Colors.border}`, borderRadius: "4px", fontSize: "11px", textAlign: "center" }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      const all = {};
                      Object.keys(getNewGroupedVariants()).forEach(g => all[g] = true);
                      setNewExpandedGroups(all);
                    }}
                    style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: `1px solid ${Colors.border}`, borderRadius: "6px", cursor: "pointer" }}
                  >
                    Expand All
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewExpandedGroups({})}
                    style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: `1px solid ${Colors.border}`, borderRadius: "6px", cursor: "pointer" }}
                  >
                    Collapse All
                  </button>
                </div>
              </div>
            )}

            {newVariantAttributes.length > 0 && Object.values(newAttributeOptions).some(arr => arr.length > 0) && (
              <button 
                  onClick={async () => {
                    if (!validateForm()) return;
                    const confirmResult = await Swal.fire({
                      title: 'Add New Variants?',
                      text: `This will add ${generateNewVariants().length} new variants to this product.`,
                      icon: 'question',
                      showCancelButton: true,
                      confirmButtonColor: Colors.primary,
                      cancelButtonColor: Colors.danger,
                      confirmButtonText: 'Yes, add them'
                    });
                    if (!confirmResult.isConfirmed) return;

                    setSaving(true);
                  try {
                      Swal.fire({ title: 'Updating Product...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

                      const generatedVariants = generateNewVariants();
                      const basePrice = formData.sellingPrice || formData.price || 0;

                      // Upload group images first (shared per group)
                      const uploadedGroupImages = {};
                      for (const groupName of Object.keys(newGroupImages)) {
                        const groupImgData = newGroupImages[groupName];
                        if (groupImgData && groupImgData.length > 0) {
                          const urls = await Promise.all(groupImgData.map(img => uploadToMedia(img.file || img)));
                          uploadedGroupImages[groupName] = urls;
                        }
                      }

                      const variantsPayload = generatedVariants.map((variant) => {
                        const variantKey = Object.values(variant).join("-");
                        const specificImgs = newVariantImages[variantKey] || [];
                        const firstAttr = newVariantAttributes[0];
                        const groupName = variant[firstAttr];
                        const groupImg = uploadedGroupImages[groupName];
                        const imageUrls = specificImgs.length > 0
                          ? specificImgs.map(img => img.preview)
                          : (groupImg && groupImg.length > 0 ? groupImg : []);
                        return {
                          attributes: variant,
                          price: newVariantPrices[variantKey] || basePrice,
                          sellingPrice: newVariantPrices[variantKey] || basePrice,
                          stock: newVariantStocks[variantKey] || 0,
                          _variantKey: variantKey,
                          images: imageUrls,
                        };
                      });

                      // Upload new per-variant image files to media, then swap in real URLs
                      for (const v of variantsPayload) {
                        const specificImgs = newVariantImages[v._variantKey] || [];
                        if (specificImgs.length > 0) {
                          const urls = await Promise.all(specificImgs.map(img => uploadToMedia(img.file || img)));
                          v.images = urls;
                        }
                        delete v._variantKey;
                      }

                      await api.post(
                        `/api/products/${data.productId}/variants`,
                        { variants: variantsPayload }
                      );

                    Swal.fire({ icon: 'success', title: 'Success!', text: `Added ${generatedVariants.length} new variants!`, timer: 1500, showConfirmButton: false });

                    // Reset and reload
                    setNewVariantAttributes([]);
                    setNewAttributeOptions({});
                    setNewVariantStocks({});
                    setNewVariantPrices({});
                    setNewVariantImages({});
                    setNewGroupImages({});
                    setNewAttrName("");
                    setNewAttrValue({});
                    setNewExpandedGroups({});
                    fetchVariants(data.productId);
                  } catch (err) {
                    console.error("Add variants failed:", err);
                    Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.message || err.message });
                  } finally {
                    setSaving(false);
                  }
                }}
                style={{ marginTop: "16px", padding: "12px 20px", background: Colors.purple, color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer", width: "100%" }}
              >
                Add {generateNewVariants().length} New Variants
              </button>
            )}
          </div>
          )}

          {/* Manage Existing Variants */}
          {isParent && variants.length > 0 && (
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: Colors.purple, marginBottom: "16px", borderBottom: `1px solid ${Colors.border}`, paddingBottom: "12px" }}>
              Manage Existing Variants
            </h2>

            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "999px", background: "#f5f3ff", border: "1px solid #ede9fe", marginBottom: "16px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }}></span>
              <span style={{ fontSize: "12px", fontWeight: "600", color: Colors.purple }}>
                {variants.length} variants · total stock: {totalVariantStock}
              </span>
            </div>

            {Object.entries(getGroupedVariants()).map(([groupName, groupVariants]) => {
              const isExpanded = expandedGroups[groupName] !== false;
              return (
                <div key={groupName} style={{ marginBottom: "12px", background: "white", borderRadius: "12px", border: `1px solid ${Colors.border}`, overflow: "hidden" }}>
                  <div
                    onClick={() => setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: isExpanded ? Colors.bgLight : "white", cursor: "pointer", borderBottom: isExpanded ? `1px solid ${Colors.border}` : "none" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "12px", color: Colors.gray }}>{isExpanded ? "▼" : "▶"}</span>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: Colors.purple }}>{data.variantAttributes?.[0] || "Group"}: {groupName}</span>
                      <span style={{ fontSize: "11px", color: Colors.gray }}>({groupVariants.length})</span>
                    </div>
                    {(groupImages[groupName] || []).length > 0 ? (
                      <img src={groupImages[groupName][0].preview || groupImages[groupName][0]} alt="" style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "6px" }} />
                    ) : null}
                  </div>

                  {isExpanded && (
                    <div style={{ padding: "12px" }}>
                      {/* Group images (applies to all variants in this group) */}
                      <div style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: `1px dashed ${Colors.border}` }}>
                        <div style={{ fontSize: "12px", fontWeight: "500", color: Colors.gray, marginBottom: "8px" }}>
                          Images for {groupName} <span style={{ color: Colors.grayLight }}>(applies to all in this group)</span>
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {(groupImages[groupName] || []).map((img, i) => (
                            <div key={i} style={{ position: "relative" }}>
                              <img src={img.preview || img} alt="" style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "8px", border: `1px solid ${Colors.border}` }} />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (groupImages[groupName] || []).filter((_, idx) => idx !== i);
                                  setGroupImages(prev => ({ ...prev, [groupName]: updated }));
                                }}
                                style={{ position: "absolute", top: "-6px", right: "-6px", width: "18px", height: "18px", background: Colors.danger, color: "white", border: "none", borderRadius: "50%", fontSize: "10px", cursor: "pointer" }}
                              >×
                              </button>
                            </div>
                          ))}
                          <label style={{ width: "48px", height: "48px", display: "grid", placeItems: "center", cursor: "pointer", border: `2px dashed ${Colors.border}`, borderRadius: "8px" }}>
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: "none" }}
                              onChange={(e) => {
                                const files = Array.from(e.target.files);
                                if (files.length > 0) {
                                  const newImgs = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
                                  setGroupImages(prev => ({ ...prev, [groupName]: [...(prev[groupName] || []), ...newImgs] }));
                                }
                              }}
                            />
                            <span style={{ fontSize: "18px", color: Colors.grayLight }}>+</span>
                          </label>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
                        {groupVariants.map((variant) => {
                          const vId = variant._id;
                          const vImgs = variantImages[vId] || [];
                          return (
                            <div key={vId} style={{ background: Colors.bgLight, borderRadius: "8px", padding: "10px" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginBottom: "8px" }}>
                                <div style={{ fontSize: "11px", fontWeight: "600", color: Colors.purple, textAlign: "center", flex: 1 }}>
                                  {Object.entries(getVariantAttributes(variant)).map(([k, v]) => `${k}: ${v}`).join(" / ") || variant.variantSku || "Variant"}
                                </div>
                                <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                                  <button type="button" onClick={() => handleEditVariantValues(variant)} style={{ padding: "3px 8px", fontSize: "10px", fontWeight: "500", background: "#3b82f6", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>Edit</button>
                                  <button type="button" onClick={() => handleDeleteVariant(variant)} style={{ padding: "3px 8px", fontSize: "10px", fontWeight: "500", background: Colors.danger, color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>Remove</button>
                                </div>
                              </div>

                              {/* Variant images */}
                              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                                {vImgs.slice(0, 4).map((img, i) => (
                                  <div key={i} style={{ position: "relative" }}>
                                    <img src={img.preview || img} alt="" style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "6px", border: `1px solid ${Colors.border}` }} />
                                    <button
                                      type="button"
                                      onClick={() => handleVariantImageRemove(vId, i)}
                                      style={{ position: "absolute", top: "-5px", right: "-5px", width: "16px", height: "16px", background: Colors.danger, color: "white", border: "none", borderRadius: "50%", fontSize: "9px", cursor: "pointer" }}
                                    >×
                                    </button>
                                  </div>
                                ))}
                                <label style={{ cursor: "pointer", display: "grid", placeItems: "center" }}>
                                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleVariantImageAdd(vId, e)} />
                                  <span style={{ padding: "4px 8px", fontSize: "10px", fontWeight: "500", color: "#059669", border: `1px dashed #6ee7b7`, borderRadius: "6px" }}>+ Image</span>
                                </label>
                              </div>

                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                                <div>
                                  <label style={{ display: "block", fontSize: "10px", color: Colors.gray, marginBottom: "2px" }}>Stock</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={variantStocks[vId] ?? ""}
                                    onChange={(e) => handleVariantStockChange(vId, e.target.value)}
                                    style={{ width: "100%", padding: "6px", border: `1px solid ${Number(variantStocks[vId]) === 0 ? "#fcd34d" : Colors.border}`, borderRadius: "6px", fontSize: "11px", textAlign: "center" }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: "block", fontSize: "10px", color: Colors.gray, marginBottom: "2px" }}>Price</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={variantPrices[vId] ?? ""}
                                    onChange={(e) => handleVariantPriceChange(vId, e.target.value)}
                                    style={{ width: "100%", padding: "6px", border: `1px solid ${Colors.border}`, borderRadius: "6px", fontSize: "11px", textAlign: "center" }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
              <button
                type="button"
                onClick={() => {
                  const all = {};
                  Object.keys(getGroupedVariants()).forEach(g => all[g] = true);
                  setExpandedGroups(all);
                }}
                style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: `1px solid ${Colors.border}`, borderRadius: "6px", cursor: "pointer" }}
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={() => setExpandedGroups({})}
                style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: `1px solid ${Colors.border}`, borderRadius: "6px", cursor: "pointer" }}
              >
                Collapse All
              </button>
            </div>
          </div>
          )}

          {/* Category & Brand */}
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#374151" }}>Category & Brand</h2>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>Category <span style={{ color: Colors.danger }}>*</span></label>
              <button
                type="button"
                onClick={() => {
                  const newToggle = !isNewCategory;
                  setIsNewCategory(newToggle);
                  setFormData(prev => ({ ...prev, category: newToggle ? "" : (dbCategories[0]?.name || "General") }));
                  setCategoryImage(null);
                  setCategoryImagePreview(null);
                }}
                style={{ fontSize: "12px", padding: "6px 12px", background: Colors.primary, color: "white", border: "none", borderRadius: "20px", cursor: "pointer" }}
              >
                {isNewCategory ? "Choose from List" : "Add New"}
              </button>
            </div>

            {isNewCategory ? (
              <div style={{ marginBottom: "16px" }}>
                <input type="text" name="category" value={formData.category} onChange={handleChange} placeholder="Category name" style={{ width: "100%", padding: "12px", border: `1px solid ${Colors.primary}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", marginBottom: "12px" }} />
                <div>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: Colors.gray, display: "block", marginBottom: "6px" }}>Category Image (optional)</span>
                  {uploadingCategoryImage ? (
                    <div style={{ width: "64px", height: "64px", display: "flex", alignItems: "center", justifyContent: "center", background: Colors.bgLight, borderRadius: "10px", border: `1px solid ${Colors.border}`, marginBottom: "8px" }}>
                      <div style={{ width: "20px", height: "20px", border: `2px solid ${Colors.primary}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}></div>
                    </div>
                  ) : categoryImagePreview ? (
                    <div style={{ position: "relative", width: "64px", height: "64px", marginBottom: "8px" }}>
                      <img src={categoryImagePreview} alt="Category" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "10px" }} />
                      <button type="button" onClick={() => { setCategoryImage(null); setCategoryImagePreview(null); setSelectedCatPreview(""); }} style={{ position: "absolute", top: "-6px", right: "-6px", width: "18px", height: "18px", background: Colors.danger, color: "white", borderRadius: "50%", border: "none", fontSize: "10px", cursor: "pointer" }}>✕</button>
                    </div>
                  ) : null}
                  {!uploadingCategoryImage && (
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: Colors.bgLight, border: `1px dashed ${Colors.grayLight}`, borderRadius: "8px", cursor: "pointer", fontSize: "12px", color: Colors.gray }}>
                      <span>📁</span> Choose Image
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const file = e.target.files[0]; if (file) { setCategoryImage(file); setCategoryImagePreview(URL.createObjectURL(file)); setSelectedCatPreview(URL.createObjectURL(file)); } }} />
                    </label>
                  )}
                </div>
                <button type="button" onClick={handleAddCategory} disabled={uploadingCategoryImage} style={{ marginTop: "12px", width: "100%", padding: "10px", background: uploadingCategoryImage ? Colors.gray : Colors.primary, color: "white", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: "600", cursor: uploadingCategoryImage ? "not-allowed" : "pointer" }}>
                  Add Category
                </button>
              </div>
            ) : (
              <div style={{ marginBottom: "16px" }}>
                <select name="category" value={formData.category} onChange={handleChange} style={{ width: "100%", padding: "12px", border: `1px solid ${Colors.border}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}>
                  {dbCategories.length === 0 && <option value="General">General</option>}
                  {dbCategories.map(cat => (<option key={cat._id} value={cat.name}>{cat.name}</option>))}
                </select>

                {selectedCatPreview && (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: Colors.bgLight, borderRadius: "12px", marginBottom: "12px" }}>
                    <img src={selectedCatPreview} alt="Category" style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "8px" }} />
                    <div>
                      <p style={{ fontSize: "10px", fontWeight: "600", color: Colors.primary, textTransform: "uppercase" }}>Category Icon</p>
                      <p style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>{formData.category}</p>
                    </div>
                  </div>
                )}

                {dbCategories.length > 0 && (
                  <div style={{ border: `1px solid ${Colors.border}`, borderRadius: "12px", overflow: "hidden", maxHeight: "192px", overflowY: "auto" }}>
                    {dbCategories.map((cat, idx) => (
                      <div key={cat._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: idx < dbCategories.length - 1 ? `1px solid ${Colors.bgLight}` : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {cat.image ? (
                            <img src={cat.image} alt={cat.name} style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "8px" }} onError={(e) => { e.target.style.display = "none"; e.target.nextElementSibling.style.display = "grid"; }} />
                          ) : null}
                          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#ecfdf5", color: Colors.primary, display: cat.image ? "none" : "grid", placeItems: "center", fontSize: "12px", fontWeight: "700" }}>
                            {cat.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: "13px", color: "#374151", fontWeight: "500" }}>{cat.name}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <button type="button" onClick={() => handleEditCategory(cat)} style={{ padding: "4px 10px", background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "500", cursor: "pointer" }}>Edit</button>
                          <button type="button" onClick={() => handleDeleteCategory(cat._id, cat.name)} style={{ padding: "4px 10px", background: Colors.danger, color: "white", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "500", cursor: "pointer" }}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ borderTop: `1px solid ${Colors.bgLight}`, paddingTop: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>Brand</label>
              <input type="text" name="brand" value={formData.brand} onChange={handleChange} placeholder="Enter brand name" style={{ width: "100%", padding: "12px", border: `1px solid ${Colors.border}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
        </div>

        {/* Right Column */}

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Images */}
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#374151", marginBottom: "16px" }}>Product Images <span style={{ color: Colors.danger }}>*</span></h2>
            
            {imagePreviews.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
                {imagePreviews.map((preview, index) => (
                  <div key={index} style={{ position: "relative" }}>
                    <img src={preview} alt={`Preview ${index + 1}`} style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "10px", border: `1px solid ${Colors.border}` }} />
                    <button type="button" onClick={() => removeImage(index)} style={{ position: "absolute", top: "-6px", right: "-6px", background: Colors.danger, color: "white", border: "none", borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
                  </div>
                ))}
              </div>
            )}
            
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px", border: `2px dashed ${Colors.border}`, borderRadius: "12px", cursor: "pointer", transition: "all 0.2s" }}>
              <input type="file" multiple accept="image/*" onChange={handleImageChange} style={{ display: "none" }} id="file-upload" />
              <div style={{ fontSize: "40px", color: Colors.grayLight, marginBottom: "8px" }}>+</div>
              <div style={{ color: "#374151", fontSize: "14px", fontWeight: "500" }}>Click to upload images</div>
              <div style={{ fontSize: "12px", color: Colors.grayLight, marginTop: "4px" }}>PNG, JPG, WEBP up to 5MB</div>
            </label>
          </div>

          {/* Description */}
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#374151", marginBottom: "16px" }}>Product Description</h2>
            <QuillEditor
              value={formData.description}
              onChange={handleDescriptionChange}
              placeholder="Describe the product details..."
            />

            <div style={{ marginTop: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>Key Features (Highlights)</label>
              <input type="text" name="highlights" value={formData.highlights} onChange={handleChange} placeholder="e.g., Waterproof, Durable, Fast Shipping (separate with commas)" style={{ width: "100%", padding: "12px", border: `1px solid ${Colors.border}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              <span style={{ fontSize: "11px", color: Colors.grayLight, marginTop: "4px", display: "block" }}>Separate each feature with a comma</span>
            </div>

            <div style={{ marginTop: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>What's in the Box</label>
              <input type="text" name="whatsInTheBox" value={formData.whatsInTheBox} onChange={handleChange} placeholder="e.g., 1x Hot Water Bottle, 1x Cover" style={{ width: "100%", padding: "12px", border: `1px solid ${Colors.border}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          {/* Save Button */}
          <button onClick={handleSave} disabled={saving} style={{ 
            padding: "16px", background: saving ? Colors.gray : Colors.primary, color: "white", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "600", cursor: saving ? "not-allowed" : "pointer", transition: "all 0.2s"
          }}>
            {saving ? "Updating..." : "Update Product"}
          </button>

          {saving && (
            <div style={{ marginTop: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "12px", color: Colors.gray }}>Updating...</span>
                <span style={{ fontSize: "12px", color: Colors.gray, fontWeight: "600" }}>{progress}%</span>
              </div>
              <div style={{ width: "100%", height: "8px", background: Colors.bgLight, borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: Colors.primary, borderRadius: "4px", transition: "width 0.3s" }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
