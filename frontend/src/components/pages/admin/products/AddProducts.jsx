import React, { useState, useEffect } from "react";
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
          variants.forEach(v => {
            const key = Object.values(v.attributes || {}).join("-");
            stocks[key] = v.stock;
            prices[key] = v.sellingPrice || v.price;
            if (v.images && v.images.length > 0) {
              imgs[key] = v.images;
            }
          });
          setVariantStocks(stocks);
          setVariantPrices(prices);
          setVariantImages(imgs);
          
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

        // Upload variant images and group images to Supabase first
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
            skuSuffix: Object.values(variant).join("-"),
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
      
      const payload = {
        productName: formData.productName.trim(),
        altNames: formData.altNames ? formData.altNames.split(",").map(n => n.trim()).filter(n => n !== "") : [],
        images: allImgUrls,
        price: parseFloat(formData.price),
        sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : parseFloat(formData.price),
        stock: parseInt(formData.stock) || 0,
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
                <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="0.00" min="0" step="0.01" style={{ width: "100%", padding: "12px", border: `1px solid ${Colors.border}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>Selling Price</label>
                <input type="number" name="sellingPrice" value={formData.sellingPrice} onChange={handleChange} placeholder="0.00" min="0" step="0.01" style={{ width: "100%", padding: "12px", border: `1px solid ${Colors.border}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>Stock Quantity</label>
              <input type="number" name="stock" value={formData.stock} onChange={handleChange} placeholder="0" min="0" style={{ width: "100%", padding: "12px", border: `1px solid ${Colors.border}`, borderRadius: "10px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
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

          <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ marginBottom: "16px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#374151", marginBottom: "12px" }}>Product Type</h2>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div 
                  onClick={() => setIsParentProduct(false)}
                  style={{ 
                    padding: "16px", 
                    borderRadius: "12px", 
                    border: `2px solid ${!isParentProduct ? Colors.primary : Colors.border}`,
                    background: !isParentProduct ? "#eff6ff" : "white",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: "600", color: !isParentProduct ? Colors.primary : "#374151", marginBottom: "4px" }}>Simple Product</div>
                  <div style={{ fontSize: "12px", color: Colors.gray }}>One size, one price, one stock</div>
                </div>
                
                <div 
                  onClick={() => setIsParentProduct(true)}
                  style={{ 
                    padding: "16px", 
                    borderRadius: "12px", 
                    border: `2px solid ${isParentProduct ? Colors.purple : Colors.border}`,
                    background: isParentProduct ? "#faf5ff" : "white",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: "600", color: isParentProduct ? Colors.purple : "#374151", marginBottom: "4px" }}>Product with Variants</div>
                  <div style={{ fontSize: "12px", color: Colors.gray }}>Multiple sizes/colors/prices</div>
                </div>
              </div>
            </div>

            {isParentProduct && (
              <div>
                <div style={{ padding: "16px", background: "#f0f9ff", borderRadius: "12px", border: "1px solid #bae6fd", marginBottom: "16px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#0369a1", marginBottom: "8px" }}>How to use variants:</div>
                  <div style={{ fontSize: "13px", color: "#075985", marginBottom: "12px" }}>
                    <strong>Step 1:</strong> Add attributes like "Color", "Size", "Material"<br/>
                    <strong>Step 2:</strong> Add values for each attribute (e.g., Color: Red, Blue, Black)<br/>
                    <strong>Step 3:</strong> Set stock & price for each variant below
                  </div>
                  <div style={{ fontSize: "12px", color: "#0c4a6e", background: "white", padding: "12px", borderRadius: "8px", marginBottom: "12px" }}>
                    <strong>Example:</strong> If you add Color (Red, Blue) + Size (S, M, L)<br/>
                    → System creates <strong>6 variants</strong>: Red-S, Red-M, Red-L, Blue-S, Blue-M, Blue-L
                  </div>
                  
                  <div style={{ fontSize: "12px", color: "#0369a1", marginBottom: "8px" }}><strong>Quick presets:</strong></div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    <button 
                      type="button"
                      onClick={() => {
                        setVariantAttributes(["Color", "Size"]);
                        setAttributeOptions({
                          Color: ["Red", "Blue", "Black", "White"],
                          Size: ["S", "M", "L", "XL"]
                        });
                      }}
                      style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: "1px solid #7c3aed", borderRadius: "16px", color: "#7c3aed", cursor: "pointer" }}
                    >
                      + Color + Size
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setVariantAttributes(["Model"]);
                        setAttributeOptions({ Model: ["iPhone 14", "iPhone 15", "iPhone 16", "Samsung S23", "Samsung S24"] });
                      }}
                      style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: "1px solid #10b981", borderRadius: "16px", color: "#10b981", cursor: "pointer" }}
                    >
                      + Phone Model
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setVariantAttributes(["Storage"]);
                        setAttributeOptions({ Storage: ["64GB", "128GB", "256GB", "512GB", "1TB"] });
                      }}
                      style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: "1px solid #10b981", borderRadius: "16px", color: "#10b981", cursor: "pointer" }}
                    >
                      + Storage
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setVariantAttributes(["RAM"]);
                        setAttributeOptions({ RAM: ["4GB", "8GB", "16GB", "32GB"] });
                      }}
                      style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: "1px solid #10b981", borderRadius: "16px", color: "#10b981", cursor: "pointer" }}
                    >
                      + RAM
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setVariantAttributes(["Size"]);
                        setAttributeOptions({ Size: ["S", "M", "L", "XL", "XXL"] });
                      }}
                      style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: "1px solid #7c3aed", borderRadius: "16px", color: "#7c3aed", cursor: "pointer" }}
                    >
                      + Size Only
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setVariantAttributes(["Material"]);
                        setAttributeOptions({ Material: ["Cotton", "Polyester", "Silk", "Wool", "Linen"] });
                      }}
                      style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: "1px solid #10b981", borderRadius: "16px", color: "#10b981", cursor: "pointer" }}
                    >
                      + Material
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setVariantAttributes(["Scent"]);
                        setAttributeOptions({ Scent: ["Lavender", "Rose", "Vanilla", "Citrus", "Ocean"] });
                      }}
                      style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: "1px solid #10b981", borderRadius: "16px", color: "#10b981", cursor: "pointer" }}
                    >
                      + Scent
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setVariantAttributes(["Color", "Storage"]);
                        setAttributeOptions({
                          Color: ["Black", "White", "Blue", "Green"],
                          Storage: ["128GB", "256GB", "512GB", "1TB"]
                        });
                      }}
                      style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: "1px solid #ec4899", borderRadius: "16px", color: "#ec4899", cursor: "pointer" }}
                    >
                      + Color + Storage
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setVariantAttributes(["Flavor"]);
                        setAttributeOptions({ Flavor: ["Chocolate", "Vanilla", "Strawberry", "Coffee", "Mint"] });
                      }}
                      style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: "1px solid #f59e0b", borderRadius: "16px", color: "#f59e0b", cursor: "pointer" }}
                    >
                      + Flavor
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setVariantAttributes(["Weight"]);
                        setAttributeOptions({ Weight: ["100g", "250g", "500g", "1kg", "2kg"] });
                      }}
                      style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: "1px solid #f59e0b", borderRadius: "16px", color: "#f59e0b", cursor: "pointer" }}
                    >
                      + Weight
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setVariantAttributes(["Volume"]);
                        setAttributeOptions({ Volume: ["100ml", "250ml", "500ml", "1L", "2L"] });
                      }}
                      style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: "1px solid #06b6d4", borderRadius: "16px", color: "#06b6d4", cursor: "pointer" }}
                    >
                      + Volume
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setVariantAttributes(["Pattern"]);
                        setAttributeOptions({ Pattern: ["Solid", "Striped", "Floral", "Plaid", "Geometric"] });
                      }}
                      style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: "1px solid #8b5cf6", borderRadius: "16px", color: "#8b5cf6", cursor: "pointer" }}
                    >
                      + Pattern
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setVariantAttributes(["Wattage"]);
                        setAttributeOptions({ Wattage: ["5W", "10W", "15W", "20W", "50W", "100W"] });
                      }}
                      style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: "1px solid #ef4444", borderRadius: "16px", color: "#ef4444", cursor: "pointer" }}
                    >
                      + Wattage
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setVariantAttributes(["Capacity"]);
                        setAttributeOptions({ Capacity: ["1000mAh", "2000mAh", "5000mAh", "10000mAh", "20000mAh"] });
                      }}
                      style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: "1px solid #ef4444", borderRadius: "16px", color: "#ef4444", cursor: "pointer" }}
                    >
                      + Capacity
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setVariantAttributes(["Edition"]);
                        setAttributeOptions({ Edition: ["Standard", "Deluxe", "Limited", "Collector's", "Anniversary"] });
                      }}
                      style={{ padding: "6px 12px", fontSize: "11px", background: "white", border: "1px solid #6366f1", borderRadius: "16px", color: "#6366f1", cursor: "pointer" }}
                    >
                      + Edition
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                    <input 
                      type="text" 
                      value={newAttrName} 
                      onChange={(e) => setNewAttrName(e.target.value)} 
                      placeholder="e.g., Color, Size, Material" 
                      style={{ flex: 1, padding: "10px 14px", border: `1px solid ${Colors.border}`, borderRadius: "8px", fontSize: "13px", outline: "none" }}
                      onKeyPress={(e) => e.key === "Enter" && addVariantAttribute()}
                    />
                    <button type="button" onClick={addVariantAttribute} style={{ padding: "10px 16px", background: Colors.purple, color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
                      Add
                    </button>
                  </div>

                  {variantAttributes.length === 0 ? (
                    <p style={{ fontSize: "13px", color: Colors.grayLight, fontStyle: "italic" }}>No attributes added yet. Add attributes above (e.g., Color, Size)</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {variantAttributes.map(attr => (
                        <div key={attr} style={{ padding: "14px", background: Colors.bgLight, borderRadius: "10px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                            <span style={{ fontSize: "14px", fontWeight: "600", color: Colors.purple }}>{attr}</span>
                            <button type="button" onClick={() => removeVariantAttribute(attr)} style={{ color: Colors.danger, background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>Remove</button>
                          </div>
                          
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                            {(attributeOptions[attr] || []).map(value => (
                              <div key={value} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 10px", background: "white", borderRadius: "6px", fontSize: "13px", border: `1px solid ${Colors.border}` }}>
                                <span>{value}</span>
                                <button type="button" onClick={() => removeAttributeOption(attr, value)} style={{ color: Colors.danger, background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}>x</button>
                              </div>
                            ))}
                          </div>
                          
                          <div style={{ display: "flex", gap: "6px" }}>
                            <input 
                              type="text" 
                              value={newAttrValue[attr] || ""} 
                              onChange={(e) => setNewAttrValue({ ...newAttrValue, [attr]: e.target.value })} 
                              placeholder={`Add ${attr} value`}
                              style={{ flex: 1, padding: "8px 12px", border: `1px solid ${Colors.border}`, borderRadius: "6px", fontSize: "13px", outline: "none" }}
                              onKeyPress={(e) => e.key === "Enter" && addAttributeOption(attr)}
                            />
                            <button type="button" onClick={() => addAttributeOption(attr)} style={{ padding: "8px 14px", background: Colors.purple, color: "white", border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>Add</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {variantAttributes.length > 0 && Object.values(attributeOptions).some(arr => arr.length > 0) && (
                  <div style={{ marginBottom: "16px" }}>
                    {/* Variant Summary */}
                    <div style={{ padding: "14px", background: "#fefce8", borderRadius: "10px", border: "1px solid #fde047", marginBottom: "16px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "#a16207" }}>
                        {generateVariants().length} variants in {Object.keys(getGroupedVariants()).length} {variantAttributes[0]} groups
                      </span>
                    </div>

                    {/* Grouped Variant UI */}
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "12px" }}>
                      Set Stock & Price per Variant
                    </div>

                    {Object.entries(getGroupedVariants()).map(([groupName, variants]) => {
                      const isExpanded = expandedGroups[groupName] !== false;
                      return (
                        <div key={groupName} style={{ marginBottom: "12px", background: "white", borderRadius: "12px", border: `1px solid ${Colors.border}`, overflow: "hidden" }}>
                          {/* Group Header */}
                          <div 
                            onClick={() => setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                            style={{ 
                              padding: "14px 16px", 
                              background: isExpanded ? Colors.bgLight : "white",
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "space-between",
                              cursor: "pointer",
                              borderBottom: isExpanded ? `1px solid ${Colors.border}` : "none"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <span style={{ fontSize: "12px", color: Colors.gray }}>{isExpanded ? "▼" : "▶"}</span>
                              <span style={{ fontSize: "14px", fontWeight: "600", color: Colors.purple }}>{variantAttributes[0]}: {groupName}</span>
                              <span style={{ fontSize: "11px", color: Colors.gray }}>({variants.length} items)</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {(groupImages[groupName] || []).length > 0 ? (
                                <img src={groupImages[groupName][0].preview} alt="" style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "6px" }} />
                              ) : (
                                <span style={{ fontSize: "10px", color: Colors.grayLight }}>No img</span>
                              )}
                            </div>
                          </div>

                          {/* Expanded Group Content */}
                          {isExpanded && (
                            <div style={{ padding: "16px" }}>
                              {/* Group Image Upload */}
                              <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: `1px dashed ${Colors.border}` }}>
                                <div style={{ fontSize: "12px", fontWeight: "600", color: Colors.gray, marginBottom: "8px" }}>
                                  Main Image for {variantAttributes[0]}: {groupName} (applies to all)
                                </div>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                  {(groupImages[groupName] || []).map((img, i) => (
                                    <div key={i} style={{ position: "relative" }}>
                                      <img src={img.preview} alt="" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px" }} />
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          const updated = (groupImages[groupName] || []).filter((_, idx) => idx !== i);
                                          setGroupImages(prev => ({ ...prev, [groupName]: updated }));
                                        }}
                                        style={{ position: "absolute", top: "-6px", right: "-6px", width: "16px", height: "16px", background: Colors.danger, color: "white", border: "none", borderRadius: "50%", fontSize: "10px", cursor: "pointer" }}
                                      >x</button>
                                    </div>
                                  ))}
                                  <label style={{ cursor: "pointer", width: "60px", height: "60px", border: `2px dashed ${Colors.border}`, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                                      const files = Array.from(e.target.files);
                                      if (files.length > 0) {
                                        const newImgs = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
                                        setGroupImages(prev => ({ ...prev, [groupName]: [...(prev[groupName] || []), ...newImgs] }));
                                      }
                                    }} />
                                    <span style={{ fontSize: "20px", color: Colors.grayLight }}>+</span>
                                    <span style={{ fontSize: "9px", color: Colors.grayLight }}>Group</span>
                                  </label>
                                </div>
                              </div>

                              {/* Individual Variants */}
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
                                {variants.map((variant, idx) => {
                                  const variantKey = Object.values(variant).join("-");
                                  const variantImg = variantImages[variantKey] || groupImages[groupName] || [];
                                  const variantStock = variantStocks[variantKey] ?? "";
                                  const variantPrice = variantPrices[variantKey] ?? "";
                                  const basePrice = formData.sellingPrice || formData.price || 0;
                                  
                                  return (
                                    <div key={idx} style={{ background: Colors.bgLight, borderRadius: "10px", padding: "12px" }}>
                                      <div style={{ fontSize: "12px", fontWeight: "600", color: Colors.purple, marginBottom: "10px", textAlign: "center" }}>
                                        {Object.values(variant).join(" / ")}
                                      </div>
                                      
                                      {/* Variant Image */}
                                      <div style={{ marginBottom: "10px" }}>
                                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "center", position: "relative" }}>
                                          {(variantImg || []).slice(0, 2).map((img, i) => (
                                            <div key={i} style={{ position: "relative" }}>
                                              <img src={img.preview || img} alt="" style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "6px" }} />
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const newImgs = (variantImg || []).filter((_, idx) => idx !== i);
                                                  setVariantImages(prev => ({ ...prev, [variantKey]: newImgs }));
                                                }}
                                                style={{
                                                  position: "absolute",
                                                  top: "-4px",
                                                  right: "-4px",
                                                  width: "16px",
                                                  height: "16px",
                                                  background: Colors.danger,
                                                  color: "white",
                                                  border: "none",
                                                  borderRadius: "50%",
                                                  fontSize: "10px",
                                                  cursor: "pointer",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  lineHeight: 1,
                                                }}
                                              >
                                                ×
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                        <label style={{ display: "block", textAlign: "center", marginTop: "6px", cursor: "pointer" }}>
                                          <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                                            const files = Array.from(e.target.files);
                                            if (files.length > 0) {
                                              const newImgs = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
                                              setVariantImages(prev => ({ ...prev, [variantKey]: [...(prev[variantKey] || []), ...newImgs] }));
                                            }
                                          }} />
                                          <span style={{ fontSize: "10px", color: Colors.primary }}>+ Image</span>
                                        </label>
                                      </div>

                                      {/* Stock & Price */}
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                                        <div>
                                          <label style={{ fontSize: "10px", color: Colors.gray, display: "block", marginBottom: "2px" }}>Stock</label>
                                          <input
                                            type="number"
                                            min="0"
                                            value={variantStock}
                                            onChange={(e) => setVariantStocks(prev => ({ ...prev, [variantKey]: parseInt(e.target.value) || 0 }))}
                                            placeholder="0"
                                            style={{ width: "100%", padding: "6px", border: `1px solid ${Colors.border}`, borderRadius: "6px", fontSize: "12px", textAlign: "center" }}
                                          />
                                        </div>
                                        <div>
                                          <label style={{ fontSize: "10px", color: Colors.gray, display: "block", marginBottom: "2px" }}>Price</label>
                                          <input
                                            type="number"
                                            min="0"
                                            value={variantPrice}
                                            onChange={(e) => setVariantPrices(prev => ({ ...prev, [variantKey]: parseFloat(e.target.value) || basePrice }))}
                                            placeholder={basePrice}
                                            style={{ width: "100%", padding: "6px", border: `1px solid ${Colors.border}`, borderRadius: "6px", fontSize: "12px", textAlign: "center" }}
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

