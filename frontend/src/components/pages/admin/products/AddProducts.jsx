import React, { useState, useEffect, useMemo } from "react";
import api from "@/utils/api";
import uploadToMedia from "@/components/utils/Mediaupload.jsx";
import { useNavigate, useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { jwtDecode } from "jwt-decode";
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

const inputBaseStyle = {
  width: "100%",
  padding: "12px",
  border: `1px solid ${Colors.border}`,
  borderRadius: "10px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

export default function AddProducts() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const isEditMode = Boolean(productId);
  
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingProduct, setLoadingProduct] = useState(isEditMode);
  const [existingProduct, setExistingProduct] = useState(null);
  
  const [isParentProduct, setIsParentProduct] = useState(false);
  const [variantAttributes, setVariantAttributes] = useState([]);
  const [attributeOptions, setAttributeOptions] = useState({});
  const [variantImages, setVariantImages] = useState({});
  const [variantStocks, setVariantStocks] = useState({});
  const [variantPrices, setVariantPrices] = useState({});
  const [existingVariantIds, setExistingVariantIds] = useState({});
  const [groupImages, setGroupImages] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});
  const [newAttrName, setNewAttrName] = useState("");
  const [newAttrValue, setNewAttrValue] = useState({});
  
  const [dbCategories, setDbCategories] = useState([]);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [categoryImage, setCategoryImage] = useState(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState(null);
  const [uploadingCategoryImage, setUploadingCategoryImage] = useState(false);

  const [formData, setFormData] = useState({
    productId: uuidv4().substring(0, 8).toUpperCase(),
    productName: "",
    altNames: "",
    price: "",
    sellingPrice: "",
    stock: "",
    description: "",
    category: "General",
    brand: "Unbranded",
    status: "pending",
    highlights: "",
    whatsInTheBox: "",
  });

  // Live total stock for variant parents (sum of every variant's stock). Always in sync
  // as you type/edit a variant, so the UI reflects the real main-stock count instantly.
  const totalVariantStock = useMemo(
    () =>
      Object.values(variantStocks).reduce(
        (sum, v) => sum + (Number(v) || 0),
        0
      ),
    [variantStocks]
  );

  const handleAddCategory = async () => {
    const categoryName = formData.category.trim();
    if (!categoryName) {
      Swal.fire({ icon: "warning", title: "Error", text: "Category name is required" });
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
        slug: categoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''),
      });
      const newCat = catRes.data.category || catRes.data;
      const catId = newCat._id?.$oid || newCat._id || Date.now().toString();
      const createdCat = { _id: catId, name: newCat.name || categoryName, image: newCat.image || "" };
      setDbCategories(prev => [...prev, createdCat]);
      setIsNewCategory(false);
      setFormData(prev => ({ ...prev, category: createdCat.name }));
      setCategoryImage(null);
      setCategoryImagePreview(null);
      Swal.fire({ icon: "success", title: "Success", text: "Category added!" });
    } catch (err) {
      console.error("Add category error:", err);
      Swal.fire({ icon: "error", title: "Error", text: err?.response?.data?.message || "Failed to add category" });
    } finally {
      setUploadingCategoryImage(false);
    }
  };

const handleEditCategory = async (cat) => {
    const { value: formValues } = await Swal.fire({
      title: "Edit Category",
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
      confirmButtonText: "Update",
      cancelButtonText: "Cancel",
      confirmButtonColor: Colors.primary,
      didOpen: () => {
        const fileInput = document.getElementById("swal-cat-image");
        const previewImg = document.getElementById("swal-cat-preview");
        fileInput.addEventListener("change", (e) => {
          const file = e.target.files[0];
          if (file) {
            previewImg.src = URL.createObjectURL(file);
            previewImg.style.display = "block";
          }
        });
      },
      preConfirm: async () => {
        const newName = document.getElementById("swal-cat-name").value.trim();
        const newFile = document.getElementById("swal-cat-image").files[0];
        if (!newName) { Swal.showValidationMessage("Category name required"); return false; }
        let newImage = cat.image || "";
        if (newFile) {
          const overlay = document.getElementById("swal-edit-overlay");
          if (overlay) overlay.style.display = "flex";
          newImage = await uploadToMedia(newFile);
          if (overlay) overlay.style.display = "none";
        }
        return { name: newName, image: newImage, slug: newName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '') };
      },
    });

    if (!formValues) return;

    const catIdRaw = cat._id?.$oid || cat._id;
    const cleanId = String(catIdRaw).split(":")[0];
    const cleanId2 = cleanId.replace(/\$oid/g, "").trim();
    if (!cleanId2) { console.error("No category ID", cat); return; }

    console.log("Patching category:", cleanId2, { name: formValues.name, image: formValues.image, slug: formValues.slug });
    try {
      const res = await api.patch(`/api/categories/${cleanId2}`, {
        name: formValues.name,
        image: formValues.image,
        slug: formValues.slug,
      });
      console.log("Patch response:", res.data);
      await fetchCats();
      Swal.fire({ icon: "success", title: "Updated", text: "Category updated" });
    } catch (err) {
      console.error("Edit category error:", err);
      Swal.fire({ icon: "error", title: "Error", text: err?.response?.data?.message || "Failed to update category" });
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    const result = await Swal.fire({
      title: "Delete Category?",
      text: `Delete "${catName}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: Colors.danger,
      cancelButtonColor: Colors.gray,
      confirmButtonText: "Delete",
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/api/categories/${catId}`);
      await fetchCats();
      Swal.fire({ icon: "success", title: "Deleted", text: "Category deleted" });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err?.response?.data?.message || "Failed to delete category" });
    }
  };

  const fetchCats = async () => {
    try {
      const res = await api.get(`/api/categories`);
      const cats = res.data?.categories || res.data || [];
      if (cats.length > 0) {
        setDbCategories(cats.map(c => ({
          _id: c._id?.$oid || c._id,
          name: c.name,
          image: c.image || "",
        })));
        if (!isNewCategory) {
          setFormData(prev => ({ ...prev, category: cats[0].name }));
        }
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  useEffect(() => { fetchCats(); }, []);

  const fetchProduct = async () => {
    if (!productId) return;
    setLoadingProduct(true);
    try {
      // Fetch product with variants
      const res = await api.get(`/api/products/${productId}/with-variants`);
      
      if (res.data?.success && res.data?.product) {
        const { product, variants } = res.data;
        setExistingProduct(product);
        
        // Set form data
        setFormData({
          productId: product.productId?.replace("PROD-", "").replace("PARENT-", "") || "",
          productName: product.productName || "",
          altNames: Array.isArray(product.altNames) ? product.altNames.join(", ") : product.altNames || "",
          price: product.price || "",
          sellingPrice: product.sellingPrice || "",
          stock: product.stock || "",
          description: product.description || "",
          category: product.category || "General",
          brand: product.brand || "Unbranded",
          status: product.status || "pending",
          highlights: Array.isArray(product.highlights) ? product.highlights.join(", ") : product.highlights || "",
          whatsInTheBox: product.whatsInTheBox || "",
        });
        
        // Set images
        if (product.images && product.images.length > 0) {
          setImagePreviews(product.images);
        }
        
        // Set variant attributes
        if (product.isParent && product.variantAttributes && product.variantAttributes.length > 0) {
          setIsParentProduct(true);
          setVariantAttributes(product.variantAttributes);
          
          // Reconstruct attribute options from variants
          const attrOpts = {};
          variants.forEach(v => {
            if (v.attributes) {
              Object.entries(v.attributes).forEach(([key, val]) => {
                if (!attrOpts[key]) attrOpts[key] = [];
                if (!attrOpts[key].includes(val)) attrOpts[key].push(val);
              });
            }
          });
          setAttributeOptions(attrOpts);
          
          // Set variant stocks and prices
          const stocks = {};
          const prices = {};
          const imgs = {};
          const ids = {};
          variants.forEach(v => {
            const key = Object.values(v.attributes || {}).join("-");
            stocks[key] = v.stock;
            prices[key] = v.sellingPrice || v.price;
            ids[key] = v._id;
            if (v.images && v.images.length > 0) {
              imgs[key] = v.images;
            }
          });
          setVariantStocks(stocks);
          setVariantPrices(prices);
          setVariantImages(imgs);
          setExistingVariantIds(ids);
          
          // Expand first group
          if (variants.length > 0) {
            const firstAttr = product.variantAttributes[0];
            const firstValue = Object.values(variants[0].attributes || {})[0];
            setExpandedGroups({ [firstValue]: true });
          }
        }
      }
    } catch (err) {
      console.error("Error fetching product:", err);
      Swal.fire({ icon: "error", title: "Error", text: "Failed to load product data" });
    } finally {
      setLoadingProduct(false);
    }
  };

  useEffect(() => {
    if (isEditMode) {
      fetchProduct();
    }
  }, [productId]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    try {
      const decoded = jwtDecode(token);
      if (decoded.role !== "admin") {
        alert("Only administrators can add products.");
        navigate("/");
      }
    } catch {
      localStorage.removeItem("token");
      navigate("/login");
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // For price/stock fields: strip any minus sign so negative values are impossible.
  const handleNumericChange = (e) => {
    const { name, value } = e.target;
    const clean = value.replace(/-/g, "");
    setFormData(prev => ({ ...prev, [name]: clean }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    setImagePreviews(files.map(file => URL.createObjectURL(file)));
  };

  const removeImage = (index) => {
    const newImages = [...images];
    const newPreviews = [...imagePreviews];
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleVariantImageAdd = (attr, value, e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Store with both old format (attr-value) and new format (value)
      const keyOld = `${attr}-${value}`;
      const keyNew = value;
      const newImages = files.map(file => ({
        file: file,
        preview: URL.createObjectURL(file)
      }));
      setVariantImages(prev => ({
        ...prev,
        [keyOld]: [...(prev[keyOld] || []), ...newImages],
        [keyNew]: [...(prev[keyNew] || []), ...newImages]
      }));
    }
  };

  const removeVariantImage = (attr, value, imgIndex) => {
    // Remove from both key formats
    const keyOld = `${attr}-${value}`;
    const keyNew = value;
    setVariantImages(prev => {
      const oldData = prev[keyOld] ? prev[keyOld].filter((_, i) => i !== imgIndex) : null;
      const newData = prev[keyNew] ? prev[keyNew].filter((_, i) => i !== imgIndex) : null;
      return {
        ...prev,
        ...(oldData ? { [keyOld]: oldData } : {}),
        ...(newData ? { [keyNew]: newData } : {})
      };
    });
  };

  const handleVariantStockChange = (attr, value, stock) => {
    const key = `${attr}-${value}`;
    setVariantStocks(prev => ({ ...prev, [key]: parseInt(stock) || 0 }));
  };

  const handleVariantPriceChange = (attr, value, price) => {
    const key = `${attr}-${value}`;
    setVariantPrices(prev => ({ ...prev, [key]: parseFloat(price) || 0 }));
  };

  const addVariantAttribute = () => {
    if (newAttrName.trim() && !variantAttributes.includes(newAttrName.trim())) {
      setVariantAttributes([...variantAttributes, newAttrName.trim()]);
      setAttributeOptions({ ...attributeOptions, [newAttrName.trim()]: [] });
      setNewAttrName("");
    }
  };

  const addAttributeOption = (attr) => {
    if (newAttrValue[attr]?.trim()) {
      const current = attributeOptions[attr] || [];
      if (!current.includes(newAttrValue[attr].trim())) {
        setAttributeOptions({ ...attributeOptions, [attr]: [...current, newAttrValue[attr].trim()] });
        setNewAttrValue({ ...newAttrValue, [attr]: "" });
      }
    }
  };

  const removeAttributeOption = (attr, value) => {
    const current = attributeOptions[attr] || [];
    setAttributeOptions({ ...attributeOptions, [attr]: current.filter(v => v !== value) });
  };

  const removeVariantAttribute = (attr) => {
    setVariantAttributes(variantAttributes.filter(a => a !== attr));
    const newOpts = { ...attributeOptions };
    delete newOpts[attr];
    setAttributeOptions(newOpts);
  };

  const generateVariants = () => {
    const attrs = Object.keys(attributeOptions);
    if (attrs.length === 0) return [{}];
    
    const generate = (index, current) => {
      if (index === attrs.length) return [current];
      const attr = attrs[index];
      const options = attributeOptions[attr] || [];
      let result = [];
      for (const opt of options) {
        const newCurrent = { ...current, [attr]: opt };
        result = result.concat(generate(index + 1, newCurrent));
      }
      return result;
    };
    
    return generate(0, {});
  };

  const getGroupedVariants = () => {
    const variants = generateVariants();
    if (variants.length === 0 || !variantAttributes[0]) return {};
    
    const firstAttr = variantAttributes[0];
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

  const validateForm = () => {
    if (!formData.productName.trim()) {
      Swal.fire({ icon: "warning", title: "Validation Error", text: "Product name is required" });
      return false;
    }
    if (!formData.category.trim()) {
      Swal.fire({ icon: "warning", title: "Validation Error", text: "Category is required" });
      return false;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      Swal.fire({ icon: "warning", title: "Validation Error", text: "Please enter a valid price" });
      return false;
    }
    if (images.length === 0) {
      Swal.fire({ icon: "warning", title: "Validation Error", text: "Please upload at least one image" });
      return false;
    }
    if (isParentProduct && variantAttributes.length === 0) {
      Swal.fire({ icon: "warning", title: "Validation Error", text: "Please add at least one variant attribute" });
      return false;
    }
    if (isParentProduct && Object.values(attributeOptions).every(arr => arr.length === 0)) {
      Swal.fire({ icon: "warning", title: "Validation Error", text: "Please add options for the variant attributes" });
      return false;
    }
    if (!isParentProduct && (!formData.stock || parseInt(formData.stock) <= 0)) {
      Swal.fire({ icon: "warning", title: "Validation Error", text: "Please enter a valid stock quantity" });
      return false;
    }
    return true;
  };

  const handleUpload = async () => {
    if (!validateForm()) return;
    setUploading(true);
    setProgress(0);
    
    try {
      setProgress(10);
      let finalCategoryName = formData.category.trim();

      if (isNewCategory) {
        try {
          const categoryImageUrl = await uploadToMedia(categoryImage);
          const catRes = await api.post(
            `/api/categories`,
            { name: finalCategoryName, image: categoryImageUrl, slug: finalCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '') }
          );
          finalCategoryName = catRes.data.category?.name || catRes.data.name || finalCategoryName;
          await fetchCats();
        } catch (catErr) {
          console.error("Category creation error:", catErr);
          Swal.fire({ icon: "error", title: "Category Error", text: catErr?.response?.data?.message || "Failed to create new category" });
          setUploading(false);
          return;
        }
      }

      setProgress(30);
      const imgUrls = await Promise.all(images.map(file => uploadToMedia(file)));
      setProgress(50);

      const payload = {
        productId: `PROD-${formData.productId}`,
        productName: formData.productName.trim(),
        altNames: formData.altNames ? formData.altNames.split(",").map(n => n.trim()).filter(n => n !== "") : [],
        images: imgUrls,
        price: parseFloat(formData.price),
        sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : parseFloat(formData.price),
        stock: parseInt(formData.stock) || 0,
        description: formData.description.trim(),
        category: finalCategoryName,
        brand: formData.brand.trim(),
        status: "ready",
        highlights: formData.highlights ? formData.highlights.split(",").map(n => n.trim()).filter(n => n !== "") : [],
        whatsInTheBox: formData.whatsInTheBox?.trim() || "",
      };

      if (isParentProduct) {
        setProgress(40);
        const parentPayload = {
          productName: formData.productName.trim(),
          altNames: formData.altNames ? formData.altNames.split(",").map(n => n.trim()).filter(n => n !== "") : [],
          images: imgUrls,
          price: parseFloat(formData.price),
          sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : parseFloat(formData.price),
          description: formData.description.trim(),
          category: finalCategoryName,
          brand: formData.brand.trim(),
          highlights: formData.highlights ? formData.highlights.split(",").map(n => n.trim()).filter(n => n !== "") : [],
          whatsInTheBox: formData.whatsInTheBox?.trim() || "",
          variantAttributes: variantAttributes,
        };
        const parentRes = await api.post(
          `/api/products/parent`,
          parentPayload
        );
        // Extract MongoDB _id for variant creation
        const parentId = parentRes.data.data._id;

        setProgress(50);
        const basePrice = formData.sellingPrice ? parseFloat(formData.sellingPrice) : parseFloat(formData.price);
        const generatedVariants = generateVariants();
        const totalVars = generatedVariants.length;

        // Upload variant images and group images to the backend (multer/local storage) first
        const uploadedVariantImages = {};
        const uploadedGroupImages = {};
        
        // Upload individual variant images
        for (const variant of generatedVariants) {
          const variantKey = Object.values(variant).join("-");
          const variantImgData = variantImages[variantKey];
          if (variantImgData && variantImgData.length > 0) {
            setProgress(55);
            const urls = await Promise.all(variantImgData.map(img => uploadToMedia(img.file || img)));
            uploadedVariantImages[variantKey] = urls;
          }
        }
        
        // Upload group images
        for (const groupName of Object.keys(groupImages)) {
          const groupImgData = groupImages[groupName];
          if (groupImgData && groupImgData.length > 0) {
            const urls = await Promise.all(groupImgData.map(img => uploadToMedia(img.file || img)));
            uploadedGroupImages[groupName] = urls;
          }
        }

        const variantsPayload = generatedVariants.map((variant) => {
          let variantImageUrls = [...imgUrls];
          let stock = 0;
          let price = basePrice;
          
          const variantKey = Object.values(variant).join("-");
          
          // Priority: variant specific image > group image > parent image
          const variantSpecificImg = uploadedVariantImages[variantKey];
          if (variantSpecificImg && variantSpecificImg.length > 0) {
            variantImageUrls = variantSpecificImg;
          } else if (variantAttributes.length > 0) {
            const firstAttr = variantAttributes[0];
            const groupValue = variant[firstAttr];
            const groupImg = uploadedGroupImages[groupValue];
            if (groupImg && groupImg.length > 0) {
              variantImageUrls = groupImg;
            }
          }
          
          if (variantStocks[variantKey] !== undefined) {
            stock = variantStocks[variantKey];
          }
          if (variantPrices[variantKey] !== undefined) {
            price = variantPrices[variantKey];
          }
          
          return {
            attributes: variant,
            price: price,
            sellingPrice: price,
            stock: stock,
            images: variantImageUrls,
          };
        });

        setProgress(70);
        await api.post(
          `/api/products/${parentId}/variants`,
          { variants: variantsPayload }
        );

        setProgress(100);
        Swal.fire({ icon: "success", title: "Success!", text: `Product uploaded with ${generatedVariants.length} variants!`, timer: 2000, showConfirmButton: false });
      } else {
        setProgress(80);
        await api.post(`/api/products`, payload);
        setProgress(100);
        Swal.fire({ icon: "success", title: "Success!", text: "Product uploaded successfully!", timer: 2000, showConfirmButton: false });
      }
      
      setFormData({
        productId: uuidv4().substring(0, 8).toUpperCase(),
        productName: "", altNames: "", price: "", sellingPrice: "", stock: "", description: "",
        category: dbCategories.length > 0 ? dbCategories[0].name : "General",
        brand: "Unbranded", status: "pending", highlights: "", whatsInTheBox: "",
      });
      setImages([]); setImagePreviews([]); setIsNewCategory(false); setCategoryImage(null);
      setCategoryImagePreview(null); setIsParentProduct(false); setVariantAttributes([]);
      setAttributeOptions({}); setVariantImages({}); setVariantStocks({}); setVariantPrices({}); setGroupImages({}); setExpandedGroups({});

    } catch (err) {
      console.error("Upload failed:", err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to upload product";
      Swal.fire({ icon: "error", title: "Upload Failed", text: errorMsg });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;
    
    const confirmResult = await Swal.fire({
      title: "Update Product?",
      text: "Are you sure you want to save these changes?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: Colors.primary,
      cancelButtonColor: Colors.gray,
      confirmButtonText: "Yes, update it",
    });
    
    if (!confirmResult.isConfirmed) return;
    
    setUploading(true);
    
    try {
      setProgress(10);
      let finalCategoryName = formData.category.trim();
      
      if (isNewCategory) {
        const categoryImageUrl = await uploadToMedia(categoryImage, 'category');
        const catRes = await api.post(
          `/api/categories`,
          { name: finalCategoryName, image: categoryImageUrl, slug: finalCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '') }
        );
        finalCategoryName = catRes.data.category?.name || catRes.data.name || finalCategoryName;
        await fetchCats();
      }
      
      setProgress(30);
      
      // Upload new images only
      const newImgUrls = images.length > 0 
        ? await Promise.all(images.map(file => uploadToMedia(file)))
        : [];
      const allImgUrls = [...imagePreviews, ...newImgUrls];
      
      const isParentEdit = Boolean(existingProduct?.isParent);

      const payload = {
        productName: formData.productName.trim(),
        altNames: formData.altNames ? formData.altNames.split(",").map(n => n.trim()).filter(n => n !== "") : [],
        images: allImgUrls,
        price: parseFloat(formData.price),
        sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : parseFloat(formData.price),
        stock: isParentEdit ? undefined : parseInt(formData.stock) || 0,
        description: formData.description.trim(),
        category: finalCategoryName,
        brand: formData.brand.trim(),
        status: existingProduct?.status || "ready",
        highlights: formData.highlights ? formData.highlights.split(",").map(n => n.trim()).filter(n => n !== "") : [],
        whatsInTheBox: formData.whatsInTheBox?.trim() || "",
      };
      
      setProgress(50);
      await api.patch(
        `/api/products/${productId}`,
        payload
      );
      
      setProgress(70);
      // Persist variant + stock (and price) for existing variants. Each server call also
      // re-computes the parent total stock, so the main-stock count stays accurate.
      if (isParentEdit) {
        const generated = generateVariants();
        for (const variant of generated) {
          const key = Object.values(variant).join("-");
          const vid = existingVariantIds[key];
          if (!vid) continue;
          await api.patch(`/api/products/variants/${vid}`, {
            stock: Number(variantStocks[key]) || 0,
            price: Number(variantPrices[key]) || 0,
            sellingPrice: Number(variantPrices[key]) || 0,
          });
        }
      }
      
      setProgress(100);
      Swal.fire({ 
        icon: "success", 
        title: "Updated!", 
        text: "Product updated successfully", 
        timer: 2000, 
        showConfirmButton: false 
      }).then(() => {
        navigate("/admin/dashboard/adminviewproducts");
      });
      
    } catch (err) {
      console.error("Update failed:", err);
      Swal.fire({ icon: "error", title: "Update Failed", text: err.response?.data?.message || err.message });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: "Delete Product?",
      html: `<p>This will permanently delete this product${existingProduct?.isParent ? " and all its variants" : ""}.</p><p>This action cannot be undone.</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: Colors.danger,
      cancelButtonColor: Colors.gray,
      confirmButtonText: "Yes, delete it",
    });
    
    if (!result.isConfirmed) return;
    
    setUploading(true);
    
    try {
      await api.delete(`/api/products/${productId}`);
      
      Swal.fire({ 
        icon: "success", 
        title: "Deleted!", 
        text: "Product and variants deleted successfully", 
        timer: 2000, 
        showConfirmButton: false 
      }).then(() => {
        navigate("/admin/dashboard/adminviewproducts");
      });
    } catch (err) {
      console.error("Delete failed:", err);
      Swal.fire({ icon: "error", title: "Delete Failed", text: err.response?.data?.message || err.message });
    } finally {
      setUploading(false);
    }
  };

  if (loadingProduct) {
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
    <div className="p-6" style={{ fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#1f2937" }}>
          {isEditMode ? "Edit Product" : "Add New Product"}
        </h1>
        {isEditMode && (
          <button
            onClick={handleDelete}
            disabled={uploading}
            style={{
              padding: "10px 20px",
              background: Colors.danger,
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: uploading ? "not-allowed" : "pointer",
              opacity: uploading ? 0.6 : 1,
            }}
          >
            Delete Product
          </button>
        )}
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "24px", ...(uploading ? disabledStyle : {}) }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
                <input type="number" name="price" value={formData.price} onChange={handleNumericChange} placeholder="0.00" min="0" step="0.01" style={{ width: "100%", padding: "12px", border: `1px solid ${Colors.border}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>Selling Price</label>
                <input type="number" name="sellingPrice" value={formData.sellingPrice} onChange={handleNumericChange} placeholder="0.00" min="0" step="0.01" style={{ width: "100%", padding: "12px", border: `1px solid ${Colors.border}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              {isParentProduct ? (
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
                  <input type="number" name="stock" value={formData.stock} onChange={handleNumericChange} placeholder="0" min="0" style={{ width: "100%", padding: "12px", border: `1px solid ${Colors.border}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">Category & Brand</h2>
            </div>

            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-slate-700">Category <span className="text-red-500">*</span></label>
              <button
                type="button"
                onClick={() => {
                  const newToggle = !isNewCategory;
                  setIsNewCategory(newToggle);
                  setFormData(prev => ({ ...prev, category: newToggle ? "" : (dbCategories[0]?.name || "General") }));
                  setCategoryImage(null); setCategoryImagePreview(null);
                }}
                className="text-xs px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-full font-medium transition-colors"
              >
                {isNewCategory ? "Choose from List" : "Add New"}
              </button>
            </div>

            {isNewCategory ? (
              <div className="mb-4 space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="Category name"
                    className="w-full px-4 py-3 border border-brand-500 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 block mb-2">Category Image (optional)</span>
                  {uploadingCategoryImage ? (
                    <div className="relative w-16 h-16 mb-2 flex items-center justify-center bg-slate-100 rounded-xl border border-slate-200">
                      <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : categoryImagePreview ? (
                    <div className="relative w-16 h-16 mb-2">
                      <img src={categoryImagePreview} alt="Category" className="w-full h-full object-cover rounded-xl" />
                      <button
                        type="button"
                        onClick={() => { setCategoryImage(null); setCategoryImagePreview(null); }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] leading-none"
                      >
                        ✕
                      </button>
                    </div>
                  ) : null}
                  {!uploadingCategoryImage && (
                    <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-lg cursor-pointer text-xs text-slate-500 transition-colors">
                      <span>📁</span> Choose Image
                      <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files[0]; if (file) { setCategoryImage(file); setCategoryImagePreview(URL.createObjectURL(file)); } }} className="hidden" />
                    </label>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Add Category
                </button>
              </div>
            ) : (
              <div className="mb-4">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                >
                  {dbCategories.map(cat => (<option key={cat._id} value={cat.name}>{cat.name}</option>))}
                  {dbCategories.length === 0 && <option value="General">General</option>}
                </select>
                {dbCategories.length > 0 && (
                  <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    {dbCategories.map((cat, idx) => (
                      <div
                        key={cat._id}
                        className={`flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors group ${idx < dbCategories.length - 1 ? "border-b border-slate-100" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          {cat.image ? (
                            <img src={cat.image} alt={cat.name} className="w-8 h-8 rounded-lg object-cover" onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                          ) : null}
                          <div className={`w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold ${cat.image ? "hidden" : ""}`}>
                            {cat.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-slate-700 font-medium">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleEditCategory(cat)}
                            className="px-2.5 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-[11px] font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat._id, cat.name)}
                            className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md text-[11px] font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100">
              <label className="text-sm font-semibold text-slate-700 block mb-2">Brand</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="Enter brand name"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-slate-100">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-slate-700 mb-3">Product Type</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsParentProduct(false)}
                  className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-colors ${!isParentProduct ? "border-violet-600 bg-violet-50" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <div className={`text-sm font-semibold ${!isParentProduct ? "text-violet-700" : "text-slate-700"}`}>Simple Product</div>
                  <div className="text-xs text-slate-500 mt-0.5">One size, one price, one stock</div>
                </button>
                <button
                  type="button"
                  onClick={() => setIsParentProduct(true)}
                  className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-colors ${isParentProduct ? "border-violet-600 bg-violet-50" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <div className={`text-sm font-semibold ${isParentProduct ? "text-violet-700" : "text-slate-700"}`}>Product with Variants</div>
                  <div className="text-xs text-slate-500 mt-0.5">Multiple sizes/colors/prices</div>
                </button>
              </div>
            </div>

            {isParentProduct && (
              <div>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 rounded-xl bg-slate-50 ring-1 ring-slate-100 px-4 py-3 mb-4 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">How it works:</span>
                  <span>1. Pick attributes</span>
                  <span>·</span>
                  <span>2. Add their values</span>
                  <span>·</span>
                  <span>3. Set stock & price per combination</span>
                  <span className="text-slate-400">— e.g. Color (Red, Blue) + Size (S, M, L) = 6 variants</span>
                </div>

                <div className="mb-4">
                  <div className="text-xs font-semibold text-slate-500 mb-2">Start from a preset</div>
                  <div className="flex flex-wrap gap-2">
                    {VARIANT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setVariantAttributes([...preset.attributes]);
                          setAttributeOptions({ ...preset.options });
                        }}
                        className="px-3 py-1.5 text-xs font-medium rounded-full bg-white border border-slate-200 text-slate-600 hover:border-violet-400 hover:text-violet-700 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-sm font-semibold text-slate-700 mb-2">Or add your own options</div>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newAttrName}
                      onChange={(e) => setNewAttrName(e.target.value)}
                      placeholder='Type an option name, e.g. "Color"'
                      className="flex-1 px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                      onKeyDown={(e) => e.key === "Enter" && addVariantAttribute()}
                    />
                    <button
                      type="button"
                      onClick={addVariantAttribute}
                      className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      Add
                    </button>
                  </div>

                  {variantAttributes.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-5 text-center">
                      <div className="text-sm text-slate-500">No options yet — pick a preset above or add one here.</div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {variantAttributes.map((attr) => (
                        <div key={attr} className="rounded-xl bg-white ring-1 ring-slate-100 p-4">
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-sm font-semibold text-violet-700">{attr}</span>
                            <button
                              type="button"
                              onClick={() => removeVariantAttribute(attr)}
                              className="text-xs font-medium text-slate-400 hover:text-red-600 transition-colors"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-2.5">
                            {(attributeOptions[attr] || []).map((value) => (
                              <span
                                key={value}
                                className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-xs bg-violet-50 text-violet-800 rounded-full"
                              >
                                {value}
                                <button
                                  type="button"
                                  onClick={() => removeAttributeOption(attr, value)}
                                  aria-label={`Remove ${value}`}
                                  className="w-4 h-4 grid place-items-center rounded-full text-violet-400 hover:bg-violet-100 hover:text-violet-700 text-[11px] leading-none"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>

                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={newAttrValue[attr] || ""}
                              onChange={(e) => setNewAttrValue({ ...newAttrValue, [attr]: e.target.value })}
                              placeholder={`Add a ${attr.toLowerCase()} value`}
                              className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                              onKeyDown={(e) => e.key === "Enter" && addAttributeOption(attr)}
                            />
                            <button
                              type="button"
                              onClick={() => addAttributeOption(attr)}
                              className="px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {variantAttributes.length > 0 && Object.values(attributeOptions).some(arr => arr.length > 0) && (
                  <div style={{ marginBottom: "16px" }}>
                    {/* Variant Summary */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-2 mb-4 rounded-full bg-violet-50 ring-1 ring-violet-100">
                      <span className={`h-2 w-2 rounded-full ${generateVariants().length > 0 ? "bg-emerald-500" : "bg-amber-400"}`}></span>
                      <span className="text-xs font-semibold text-violet-800">
                        {generateVariants().length} variants · grouped by {variantAttributes[0]}
                      </span>
                      <span className="text-xs text-slate-400">total stock updates automatically</span>
                    </div>

                    {/* Grouped Variant UI */}
                    <div className="text-sm font-semibold text-slate-700 mb-3">
                      Set price & stock for each combination
                    </div>

                    {Object.entries(getGroupedVariants()).map(([groupName, variants]) => {
                      const isExpanded = expandedGroups[groupName] !== false;
                      return (
                        <div key={groupName} className="mb-3 rounded-xl bg-white ring-1 ring-slate-100 overflow-hidden">
                          {/* Group Header */}
                          <div
                            onClick={() => setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                            className={`flex items-center justify-between px-4 py-3.5 cursor-pointer transition-colors ${isExpanded ? "bg-slate-50" : "bg-white hover:bg-slate-50/60"}`}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === "Enter" && setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-xs text-slate-400 transition-transform duration-200" style={{ transform: isExpanded ? "rotate(0deg)" : "" }}>{isExpanded ? "▾" : "▸"}</span>
                              <span className="text-sm font-semibold text-violet-700">{variantAttributes[0]}: {groupName}</span>
                              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{variants.length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {(groupImages[groupName] || []).length > 0 ? (
                                <img src={groupImages[groupName][0].preview} alt="" className="w-8 h-8 object-cover rounded-md ring-1 ring-slate-100" />
                              ) : (
                                <span className="text-[10px] text-slate-300">no image</span>
                              )}
                            </div>
                          </div>

                          {/* Expanded Group Content */}
                          {isExpanded && (
                            <div className="p-4">
                              {/* Group Image Upload */}
                              <div className="mb-4 pb-4 border-b border-dashed border-slate-200">
                                <div className="text-xs font-medium text-slate-500 mb-2">
                                  Images for {variantAttributes[0]}: {groupName} <span className="text-slate-400">(applies to all in this group)</span>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                  {(groupImages[groupName] || []).map((img, i) => (
                                    <div key={i} className="relative">
                                      <img src={img.preview} alt="" className="w-14 h-14 object-cover rounded-lg ring-1 ring-slate-200" />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = (groupImages[groupName] || []).filter((_, idx) => idx !== i);
                                          setGroupImages(prev => ({ ...prev, [groupName]: updated }));
                                        }}
                                        aria-label={`Remove image ${i + 1}`}
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 grid place-items-center bg-red-500 text-white rounded-full text-[10px] hover:bg-red-600"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                  <label className="w-14 h-14 grid place-items-center cursor-pointer border-2 border-dashed border-slate-200 rounded-lg hover:border-violet-300 transition-colors">
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                      const files = Array.from(e.target.files);
                                      if (files.length > 0) {
                                        const newImgs = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
                                        setGroupImages(prev => ({ ...prev, [groupName]: [...(prev[groupName] || []), ...newImgs] }));
                                      }
                                    }} />
                                    <span className="text-lg leading-none text-slate-300">+</span>
                                  </label>
                                </div>
                              </div>

                              {/* Individual Variants */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                {variants.map((variant, idx) => {
                                  const variantKey = Object.values(variant).join("-");
                                  const variantImg = variantImages[variantKey] || groupImages[groupName] || [];
                                  const variantStock = variantStocks[variantKey] ?? "";
                                  const variantPrice = variantPrices[variantKey] ?? "";
                                  const basePrice = formData.sellingPrice || formData.price || 0;
                                  
                                  return (
                                    <div key={idx} className="rounded-xl bg-slate-50/70 p-3">
                                      <div className="text-xs font-semibold text-violet-700 text-center mb-2">
                                        {Object.values(variant).join(" / ")}
                                      </div>
                                      
                                      {/* Variant Image */}
                                      <div className="mb-2.5 flex justify-center">
                                        <div className="flex gap-1.5 flex-wrap justify-center relative">
                                          {(variantImg || []).slice(0, 2).map((img, i) => (
                                            <div key={i} className="relative">
                                              <img src={img.preview || img} alt="" className="w-9 h-9 object-cover rounded-md ring-1 ring-slate-200" />
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const newImgs = (variantImg || []).filter((_, idx) => idx !== i);
                                                  setVariantImages(prev => ({ ...prev, [variantKey]: newImgs }));
                                                }}
                                                aria-label={`Remove image ${i + 1}`}
                                                className="absolute -top-1 -right-1 w-4 h-4 grid place-items-center bg-red-500 text-white rounded-full text-[9px] leading-none hover:bg-red-600"
                                              >
                                                ×
                                              </button>
                                            </div>
                                          ))}
                                          <label className="cursor-pointer block">
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                              const files = Array.from(e.target.files);
                                              if (files.length > 0) {
                                                const newImgs = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
                                                setVariantImages(prev => ({ ...prev, [variantKey]: [...(prev[variantKey] || []), ...newImgs] }));
                                              }
                                            }} />
                                            <span className="inline-block px-2 py-1 text-[10px] font-medium text-emerald-600 border border-dashed border-emerald-300 rounded-md hover:bg-emerald-50 transition-colors">+ Image</span>
                                          </label>
                                        </div>
                                      </div>

                                      {/* Stock & Price */}
                                      <div className="grid grid-cols-2 gap-1.5">
                                        <div>
                                          <label className="block text-[10px] text-slate-500 mb-0.5">Stock</label>
                                          <input
                                            type="number"
                                            min="0"
                                            value={variantStock}
                                            onChange={(e) => setVariantStocks(prev => ({ ...prev, [variantKey]: parseInt(e.target.value.replace(/-/g, "")) || 0 }))}
                                            placeholder="0"
                                            className={`w-full px-2 py-1.5 text-xs border rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white text-center ${Number(variantStock) === 0 ? "border-amber-300 text-amber-700" : "border-slate-200"}`}
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[10px] text-slate-500 mb-0.5">Price</label>
                                          <input
                                            type="number"
                                            min="0"
                                            value={variantPrice}
                                            onChange={(e) => setVariantPrices(prev => ({ ...prev, [variantKey]: parseFloat(e.target.value.replace(/-/g, "")) || basePrice }))}
                                            placeholder={basePrice}
                                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white text-center"
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

                    {/* Quick: Expand All / Collapse All */}
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                      <button 
                        type="button"
                        onClick={() => {
                          const groups = Object.keys(getGroupedVariants());
                          const allExpanded = {};
                          groups.forEach(g => allExpanded[g] = true);
                          setExpandedGroups(allExpanded);
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
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#374151", marginBottom: "16px" }}>Product Images <span style={{ color: Colors.danger }}>*</span></h2>
            
            {imagePreviews.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
                {imagePreviews.map((preview, index) => (
                  <div key={index} style={{ position: "relative", width: "90px", height: "90px" }}>
                    <img src={preview} alt={`Preview ${index + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "10px", border: `1px solid ${Colors.border}` }} />
                    <button type="button" onClick={() => removeImage(index)} style={{ position: "absolute", top: "-6px", right: "-6px", background: Colors.danger, color: "white", border: "none", borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer", fontSize: "12px" }}>x</button>
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

          <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#374151", marginBottom: "16px" }}>Product Description</h2>
            <div style={{ marginBottom: "16px" }}>
              <QuillEditor
                value={formData.description}
                onChange={(content) => setFormData(prev => ({ ...prev, description: content }))}
                placeholder="Describe the product details..."
              />
            </div>

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

          {/* Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {isEditMode && (
              <button
                onClick={() => navigate("/admin/dashboard/adminviewproducts")}
                style={{
                  padding: "12px",
                  background: "white",
                  color: Colors.gray,
                  border: `1px solid ${Colors.border}`,
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                ← Back to Products
              </button>
            )}
            
            <button onClick={isEditMode ? handleUpdate : handleUpload} disabled={uploading} style={{ 
              padding: "16px", background: uploading ? Colors.gray : Colors.primary, color: "white", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "600", cursor: uploading ? "not-allowed" : "pointer", transition: "all 0.2s"
            }}>
              {uploading 
                ? (isEditMode ? "Updating..." : "Uploading...") 
                : (isEditMode ? "Update Product" : "Upload Product")}
            </button>
            
            {uploading && (
              <div style={{ marginTop: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", color: Colors.gray }}>{isEditMode ? "Updating..." : "Uploading..."}</span>
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
    </div>
  );
}

