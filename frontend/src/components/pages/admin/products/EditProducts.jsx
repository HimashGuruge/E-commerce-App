import React, { useState, useEffect } from "react";
import api from "@/utils/api";
import uploadToMedia from "@/components/utils/Mediaupload.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { v4 as uuidv4 } from "uuid";
import {
  FiUpload, FiImage, FiArrowLeft, FiTrash2, FiEdit2, FiX, FiPlusCircle
} from "react-icons/fi";
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
  const [newExpandedGroups, setNewExpandedGroups] = useState({});

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
  });

  const brands = ["Unbranded", "Nike", "Samsung", "Apple", "Sony", "Adidas", "Dell", "LG", "Other"];

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
    if (variants.length === 0 || !productData?.variantAttributes?.[0]) return {};
    
    const firstAttr = productData.variantAttributes[0];
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

  const handleVariantImageRemove = async (variantId, index, isExisting = false) => {
    const result = await Swal.fire({
      title: 'Remove Image?',
      text: isExisting ? "This will remove the image from the variant." : "This will discard the new image.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: Colors.danger,
      cancelButtonColor: Colors.gray,
      confirmButtonText: 'Yes, remove it'
    });

    if (result.isConfirmed) {
      if (isExisting) {
        // Remove from existing images - need to track which are existing
        const currentImages = variantImages[variantId] || [];
        const newImages = currentImages.filter((_, i) => i !== index);
        setVariantImages(prev => ({ ...prev, [variantId]: newImages }));
      } else {
        // Remove from new images
        const currentPreviews = variantImagePreviews[variantId] || [];
        const newPreviews = currentPreviews.filter((_, i) => i !== index);
        setVariantImagePreviews(prev => ({ ...prev, [variantId]: newPreviews }));
      }
    }
  };

  const handleVariantStockChange = (variantId, value) => {
    setVariantStocks((prev) => ({ ...prev, [variantId]: parseInt(value) || 0 }));
  };

  const handleVariantPriceChange = (variantId, value) => {
    setVariantPrices((prev) => ({ ...prev, [variantId]: parseFloat(value) || 0 }));
  };

  const fetchCats = async (currentCategoryName) => {
    try {
      const res = await api.get(`/api/categories`);
      if (res.data && res.data.length > 0) {
        setDbCategories(res.data);
        const target = currentCategoryName || formData.category;
        const current = res.data.find(c => c.name === target);
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

  useEffect(() => {
    if (!productData) {
      Swal.fire({ icon: 'error', title: 'No Product Data', text: 'Product information not found' })
        .then(() => navigate("/admin/dashboard/adminviewproducts"));
      return;
    }

    const initialCategory = productData.category || "General";
    
    setFormData({
      productId: productData.productId ? productData.productId.replace('PROD-', '') : uuidv4().substring(0, 8).toUpperCase(),
      productName: productData.productName || "",
      altNames: Array.isArray(productData.altNames) ? productData.altNames.join(", ") : productData.altNames || "",
      price: productData.price || "",
      sellingPrice: productData.sellingPrice || productData.price || "",
      stock: productData.stock || "",
      description: productData.description || "",
      category: initialCategory,
      brand: productData.brand || "Unbranded",
    });
    
    if (productData.images && productData.images.length > 0) {
      setImagePreviews(productData.images);
      setExistingImageUrls(productData.images);
    }
    
    fetchCats(initialCategory);

    if (productData.isParent) {
      fetchVariants(productData.productId);
    }

    setLoading(false);
  }, [productData, navigate]);

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

  const handleNewCategoryFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCategoryImage(file);
      setSelectedCatPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdateCurrentCategory = async () => {
    const currentCat = dbCategories.find(c => c.name === formData.category);
    if (!currentCat) return;

    const { value: formValues } = await Swal.fire({
      title: 'Update Category Icon',
      html: `
        <div style="text-align: left;">
          <label style="font-weight:bold; font-size: 14px;">Category Name</label>
          <input id="swal-input-name" class="swal2-input" value="${currentCat.name}" style="width: 100%; margin: 10px 0;">
          <label style="font-weight:bold; font-size: 14px; display:block; margin-top:10px;">New Icon</label>
          <div style="display:flex; align-items:center; gap:15px; margin-top:10px; background:#f4f4f4; padding:10px; border-radius:10px;">
             <img id="swal-preview-node" src="${currentCat.image}" style="width:60px; height:60px; object-fit:cover; border-radius:8px; border:2px solid #fff;">
             <input type="file" id="swal-input-file" accept="image/*" style="font-size:12px;">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Update',
      cancelButtonText: 'Cancel',
      didOpen: () => {
        const fileInput = document.getElementById('swal-input-file');
        const previewImg = document.getElementById('swal-preview-node');
        fileInput.onchange = (e) => {
          const file = e.target.files[0];
          if (file) previewImg.src = URL.createObjectURL(file);
        };
      },
      preConfirm: () => ({
        newName: document.getElementById('swal-input-name').value,
        newFile: document.getElementById('swal-input-file').files[0]
      })
    });

    if (formValues) {
      try {
        Swal.fire({ title: 'Uploading...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

        let finalUrl = currentCat.image;
        if (formValues.newFile) {
          finalUrl = await uploadToMedia(formValues.newFile);
        }

        await api.put(`/api/categories/${currentCat._id}`, {
          name: formValues.newName,
          image: finalUrl
        });

        Swal.fire({ icon: 'success', title: 'Success!', text: 'Category updated successfully', timer: 1500, showConfirmButton: false });
        setFormData(prev => ({ ...prev, category: formValues.newName }));
        setSelectedCatPreview(finalUrl);
        fetchCats(formValues.newName);
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update category' });
      }
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
    if (!productData?.isParent && (!formData.stock || parseInt(formData.stock) <= 0)) {
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
    
    try {
      Swal.fire({ title: 'Updating Product...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

      let finalCategoryName = formData.category.trim();

      if (isNewCategory) {
        const catImageUrl = await uploadToMedia(categoryImage);
        const catRes = await api.post(
          `/api/categories`,
          { name: finalCategoryName, image: catImageUrl, slug: finalCategoryName.toLowerCase().trim().replace(/\s+/g, '-') }
        );
        finalCategoryName = catRes.data.name;
        await fetchCats();
      }

      let imgUrls = [...existingImageUrls];
      if (images.length > 0) {
        const newImgUrls = await Promise.all(images.map(file => uploadToMedia(file)));
        imgUrls = [...existingImageUrls, ...newImgUrls];
      }

      const payload = {
        productId: `PROD-${formData.productId.trim()}`,
        productName: formData.productName.trim(),
        altNames: formData.altNames ? formData.altNames.split(",").map(n => n.trim()).filter(n => n !== "") : [],
        price: parseFloat(formData.price),
        sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : parseFloat(formData.price),
        stock: parseInt(formData.stock) || 0,
        description: formData.description.trim(),
        category: finalCategoryName,
        brand: formData.brand.trim(),
        images: imgUrls,
      };

      await api.patch(
        `/api/products/${productData.productId}`,
        payload
      );

      if (productData.isParent && variants.length > 0) {
        for (const variant of variants) {
          const newStock = variantStocks[variant._id] ?? variant.stock;
          const newPrice = variantPrices[variant._id] ?? variant.price;
          
          // Handle variant images
          let finalImages = variantImages[variant._id] || [];
          const newVariantImages = finalImages.filter(img => img.file);
          const existingVariantImages = finalImages.filter(img => !img.file);
          
          if (newVariantImages.length > 0) {
            // Upload new images
            const uploadedUrls = await Promise.all(newVariantImages.map(img => uploadToMedia(img.file)));
            finalImages = [...existingVariantImages, ...uploadedUrls];
          } else if (finalImages.length > 0 && typeof finalImages[0] === 'string') {
            finalImages = finalImages;
          } else {
            finalImages = variant.images || [];
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
      
      Swal.fire({ icon: 'success', title: 'Success!', text: 'Product updated successfully', timer: 1500, showConfirmButton: false })
        .then(() => navigate("/admin/dashboard/adminviewproducts"));

    } catch (err) {
      console.error("Update failed:", err);
      Swal.fire({ icon: 'error', title: 'Update Failed', text: err.response?.data?.message || err.message });
    } finally {
      setSaving(false);
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
      <button onClick={() => navigate("/admin/dashboard/adminviewproducts")} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: Colors.gray, cursor: "pointer", marginBottom: "20px", fontSize: "14px", fontWeight: "500" }}>
        <FiArrowLeft /> Back to Products
      </button>

      <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#1f2937", marginBottom: "24px" }}>Edit Product</h1>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "24px" }}>
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
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>Stock Quantity</label>
              <input type="number" name="stock" value={formData.stock} onChange={handleChange} placeholder="0" min="0" style={{ width: "100%", padding: "12px", border: `1px solid ${Colors.border}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
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
                    border: `2px solid ${!productData?.isParent ? Colors.primary : Colors.border}`,
                    background: !productData?.isParent ? "#eff6ff" : "white",
                    opacity: productData?.isParent ? 0.6 : 1,
                    cursor: "default"
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: "600", color: !productData?.isParent ? Colors.primary : "#374151", marginBottom: "4px" }}>Simple Product</div>
                  <div style={{ fontSize: "12px", color: Colors.gray }}>One size, one price</div>
                </div>
                
                <div 
                  style={{ 
                    padding: "16px", 
                    borderRadius: "12px", 
                    border: `2px solid ${productData?.isParent ? Colors.purple : Colors.border}`,
                    background: productData?.isParent ? "#faf5ff" : "white",
                    opacity: productData?.isParent ? 1 : 0.6,
                    cursor: "default"
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: "600", color: productData?.isParent ? Colors.purple : "#374151", marginBottom: "4px" }}>Product with Variants</div>
                  <div style={{ fontSize: "12px", color: Colors.gray }}>{variants.length} variants</div>
                </div>
              </div>
              
              {productData?.isParent && productData?.variantAttributes && (
                <div style={{ marginTop: "12px", padding: "12px", background: Colors.bgLight, borderRadius: "8px" }}>
                  <div style={{ fontSize: "12px", color: Colors.gray }}><strong>Attributes:</strong> {productData.variantAttributes.join(", ")}</div>
                </div>
)}
          </div>

          {/* Add New Variants Section */}
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: Colors.purple, marginBottom: "16px", borderBottom: `1px solid ${Colors.border}`, paddingBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              Add New Variants
            </h2>
            
            <div style={{ padding: "16px", background: "#f0f9ff", borderRadius: "12px", border: "1px solid #bae6fd", marginBottom: "16px" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#0369a1", marginBottom: "8px" }}>Add new attribute:</div>
              <div style={{ fontSize: "13px", color: "#075985", marginBottom: "12px" }}>
                Add new options like "Size", "Color" to create more variants
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
                <div style={{ padding: "14px", background: "#fefce8", borderRadius: "10px", border: "1px solid #fde047", marginBottom: "16px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#a16207" }}>
                    {generateNewVariants().length} new variants will be created
                  </span>
                </div>

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
                        <div style={{ padding: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "10px" }}>
                          {groupVariants.map((variant, idx) => {
                            const variantKey = Object.values(variant).join("-");
                            return (
                              <div key={idx} style={{ background: Colors.bgLight, borderRadius: "8px", padding: "10px" }}>
                                <div style={{ fontSize: "11px", fontWeight: "600", color: Colors.purple, marginBottom: "8px", textAlign: "center" }}>
                                  {Object.values(variant).join(" / ")}
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
                      )}
                    </div>
                  );
                })}
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

                      const variantsPayload = generatedVariants.map((variant) => {
                        const variantKey = Object.values(variant).join("-");
                        return {
                          attributes: variant,
                          price: newVariantPrices[variantKey] || basePrice,
                          sellingPrice: newVariantPrices[variantKey] || basePrice,
                          stock: newVariantStocks[variantKey] || 0,
                          images: [],
                        };
                      });

                      await api.post(
                        `/api/products/${productData.productId}/variants`,
                        { variants: variantsPayload }
                      );

                    Swal.fire({ icon: 'success', title: 'Success!', text: `Added ${generatedVariants.length} new variants!`, timer: 1500, showConfirmButton: false });
                    
                    // Reset and reload
                    setNewVariantAttributes([]);
                    setNewAttributeOptions({});
                    setNewVariantStocks({});
                    setNewVariantPrices({});
                    fetchVariants(productData.productId);
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

          {/* Category */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#374151" }}>Category & Brand</h2>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>Category <span style={{ color: Colors.danger }}>*</span></label>
              <button type="button" onClick={() => setIsNewCategory(!isNewCategory)} style={{ fontSize: "12px", padding: "6px 12px", background: Colors.primary, color: "white", border: "none", borderRadius: "20px", cursor: "pointer" }}>
                {isNewCategory ? "Choose from List" : "Add New"}
              </button>
            </div>

            {isNewCategory ? (
              <div style={{ marginBottom: "16px" }}>
                <input type="text" name="category" value={formData.category} onChange={handleChange} placeholder="Category name" style={{ width: "100%", padding: "12px", border: `1px solid ${Colors.primary}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", marginBottom: "12px" }} />
                <div>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: Colors.gray, display: "block", marginBottom: "6px" }}>Category Image</span>
                  <input type="file" accept="image/*" onChange={handleNewCategoryFile} style={{ fontSize: "12px" }} />
                </div>
              </div>
            ) : (
              <>
                <select name="category" value={formData.category} onChange={handleChange} style={{ width: "100%", padding: "12px", border: `1px solid ${Colors.border}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box", marginBottom: "16px" }}>
                  {dbCategories.map(cat => (<option key={cat._id} value={cat.name}>{cat.name}</option>))}
                </select>
                
                {selectedCatPreview && (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: Colors.bgLight, borderRadius: "12px", marginBottom: "12px" }}>
                    <img src={selectedCatPreview} alt="Category" style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "8px" }} />
                    <div>
                      <p style={{ fontSize: "10px", fontWeight: "600", color: Colors.primary, textTransform: "uppercase" }}>Category Icon</p>
                      <p style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>{formData.category}</p>
                    </div>
                    <button type="button" onClick={handleUpdateCurrentCategory} style={{ marginLeft: "auto", padding: "6px", background: "none", border: "none", cursor: "pointer" }}>
                      <FiEdit2 size={16} color={Colors.primary} />
                    </button>
                  </div>
                )}
              </>
            )}

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>Brand</label>
              <select name="brand" value={formData.brand} onChange={handleChange} style={{ width: "100%", padding: "12px", border: `1px solid ${Colors.border}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}>
                {brands.map(brand => (<option key={brand} value={brand}>{brand}</option>))}
              </select>
            </div>
          </div>
        </div>

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
          </div>

          {/* Save Button */}
          <button onClick={handleSave} disabled={saving} style={{ 
            padding: "16px", background: saving ? Colors.gray : Colors.primary, color: "white", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "600", cursor: saving ? "not-allowed" : "pointer", transition: "all 0.2s"
          }}>
            {saving ? "Updating..." : "Update Product"}
          </button>
        </div>
      </div>
    </div>
  );
}
