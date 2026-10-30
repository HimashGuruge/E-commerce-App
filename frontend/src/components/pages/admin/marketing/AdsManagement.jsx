import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import api from "@/utils/api";
import Cropper from "react-easy-crop";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import uploadToMedia from "@/components/utils/Mediaupload";
import {
  MdCloudUpload,
  MdTextFields,
  MdCrop,
  MdDelete,
  MdDesktopWindows,
  MdCategory,
  MdCheck,
  MdWarning,
  MdClose,
  MdEdit,
  MdDragIndicator,
  MdToggleOn,
  MdToggleOff,
  MdRefresh,
  MdImage,
} from "react-icons/md";

const MEDIA_CONFIG = {
  maxSizeMB: 5,
  maxVideoSizeMB: 50,
  minWidth: 750,
  minHeight: 250,
  recommendedWidth: 1920,
  recommendedHeight: 537,
  aspectRatio: 3.57 / 1,
  aspectTolerance: 0.7,
  imageTypes: ["image/jpeg", "image/png", "image/webp"],
  videoTypes: ["video/mp4", "video/webm", "video/quicktime"],
};

const validateImage = (file) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      const aspectRatio = width / height;
      const ratioDiff = Math.abs(aspectRatio - MEDIA_CONFIG.aspectRatio);
      const isValidRatio = ratioDiff <= MEDIA_CONFIG.aspectTolerance;
      
      const errors = [];
      const warnings = [];

      if (width < MEDIA_CONFIG.minWidth) {
        errors.push(`Width must be at least ${MEDIA_CONFIG.minWidth}px (current: ${width}px)`);
      }
      if (height < MEDIA_CONFIG.minHeight) {
        errors.push(`Height must be at least ${MEDIA_CONFIG.minHeight}px (current: ${height}px)`);
      }
      if (!isValidRatio) {
        warnings.push(`Aspect ratio ${aspectRatio.toFixed(2)}:1 (recommended ${MEDIA_CONFIG.aspectRatio.toFixed(2)}:1)`);
      }
      if (width > 3840) {
        warnings.push(`Large image may affect load time. Consider ${MEDIA_CONFIG.recommendedWidth}px or less`);
      }

      resolve({
        isValid: errors.length === 0,
        errors,
        warnings,
        dimensions: { width, height },
        aspectRatio: aspectRatio.toFixed(2),
        isOptimal: isValidRatio && width >= MEDIA_CONFIG.minWidth && width <= MEDIA_CONFIG.recommendedWidth,
      });
    };
    img.onerror = () => resolve({ isValid: false, errors: ["Failed to load image"], warnings: [] });
    img.src = URL.createObjectURL(file);
  });
};

const validateVideo = (file) => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const errors = [];
      const warnings = [];
      const duration = video.duration;
      if (duration > 30) {
        warnings.push(`Video is ${Math.round(duration)}s long. Consider keeping it under 30s for better engagement`);
      }
      resolve({
        isValid: true,
        errors,
        warnings,
        duration: Math.round(duration),
        dimensions: { width: video.videoWidth, height: video.videoHeight },
      });
    };
    video.onerror = () => resolve({ isValid: false, errors: ["Failed to load video"], warnings: [] });
    video.src = URL.createObjectURL(file);
  });
};

const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => { image.onload = resolve; });
  
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
  });
};

const toast = (icon, title, timer = 2000) => {
  Swal.fire({ icon, title, timer, showConfirmButton: false });
};

export default function AdsManagement() {
  const fileInputRef = useRef(null);
  
  const [ads, setAds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState("");
  const [targetCategory, setTargetCategory] = useState("home");
  const [endDate, setEndDate] = useState("");
  const [countdownText, setCountdownText] = useState("Sale Ends In:");
  const [description, setDescription] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [adStatus, setAdStatus] = useState("active");
  const [mediaType, setMediaType] = useState("image");
  
  const [imageValidation, setImageValidation] = useState(null);
  const [showValidation, setShowValidation] = useState(false);
  const [videoDuration, setVideoDuration] = useState(null);
  
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  
  const [editingAd, setEditingAd] = useState(null);
  const [selectedAds, setSelectedAds] = useState(new Set());

  const selectedCategoryName = useMemo(() => {
    if (targetCategory === "home") return "Main Home";
    return categories.find((c) => c.slug === targetCategory)?.name || targetCategory;
  }, [targetCategory, categories]);

  const filteredAds = useMemo(() => {
    return Array.isArray(ads) ? ads.filter((ad) => ad.category === targetCategory) : [];
  }, [ads, targetCategory]);

  const fetchAds = useCallback(async () => {
    try {
      const res = await api.get(`/api/ads`);
      setAds(res.data?.ads || res.data?.data || []);
    } catch (err) {
      console.error("Error fetching ads:", err);
      setAds([]);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get(`/api/categories`);
      setCategories(res.data?.categories || res.data?.data || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAds(), fetchCategories()]);
      setLoading(false);
    };
    loadData();
  }, [fetchAds, fetchCategories]);

  useEffect(() => {
    return () => {
      if (tempImage) URL.revokeObjectURL(tempImage);
      if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [tempImage, preview]);

  const resetForm = useCallback(() => {
    setFile(null);
    setPreview(null);
    setTitle("");
    setImageValidation(null);
    setShowValidation(false);
    setEditingAd(null);
    setSelectedAds(new Set());
    setEndDate("");
    setCountdownText("Sale Ends In:");
    setDescription("");
    setButtonText("");
    setAdStatus("active");
    setMediaType("image");
    setVideoDuration(null);
  }, []);

  const startEditing = useCallback((ad) => {
    setEditingAd(ad);
    setTitle(ad.title || "");
    setTargetCategory(ad.category);
    setPreview(ad.mediaType === "video" ? ad.videoUrl : (ad.imageUrl || ad.image));
    setFile(null);
    setEndDate(ad.endDate ? new Date(ad.endDate).toISOString().split('T')[0] : "");
    setCountdownText(ad.countdownText || "Sale Ends In:");
    setDescription(ad.description || "");
    setButtonText(ad.buttonText || "");
    setAdStatus(ad.status || "active");
    setMediaType(ad.mediaType || "image");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const onCropComplete = useCallback((_area, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleFileChange = useCallback(async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const isVideo = selectedFile.type.startsWith("video/");

    if (isVideo) {
      if (!MEDIA_CONFIG.videoTypes.includes(selectedFile.type)) {
        toast("error", "Invalid file type. Use MP4, WebM, or MOV");
        return;
      }
      if (selectedFile.size > MEDIA_CONFIG.maxVideoSizeMB * 1024 * 1024) {
        toast("error", `Video should be less than ${MEDIA_CONFIG.maxVideoSizeMB}MB`);
        return;
      }
      try {
        setUploading(true);
        setMediaType("video");
        const validation = await validateVideo(selectedFile);
        setVideoDuration(validation.duration);
        setImageValidation(validation);

        if (validation.warnings.length > 0) {
          await Swal.fire({
            icon: "info",
            title: "Video Info",
            html: `<div class="text-left text-sm">${validation.warnings.map((w) => `<p>${w}</p>`).join("")}</div>`,
            confirmButtonText: "Continue",
          });
        }

        setFile(selectedFile);
        setPreview(URL.createObjectURL(selectedFile));
        setUploading(false);
      } catch (error) {
        console.error("Video validation error:", error);
        toast("error", "Failed to validate video");
        setUploading(false);
      }
      return;
    }

    if (!MEDIA_CONFIG.imageTypes.includes(selectedFile.type)) {
      toast("error", "Invalid file type. Use JPG, PNG, or WebP");
      return;
    }

    if (selectedFile.size > MEDIA_CONFIG.maxSizeMB * 1024 * 1024) {
      toast("error", `Image should be less than ${MEDIA_CONFIG.maxSizeMB}MB`);
      return;
    }

    try {
      setUploading(true);
      setMediaType("image");
      const validation = await validateImage(selectedFile);
      setImageValidation(validation);
      setShowValidation(true);

      if (!validation.isValid) {
        const result = await Swal.fire({
          icon: "warning",
          title: "Image Optimization Needed",
          html: `
            <div class="text-left">
              ${validation.errors.length > 0 ? `
                <p class="font-bold mb-2">Issues:</p>
                <ul class="list-disc pl-4 text-sm">${validation.errors.map((err) => `<li>${err}</li>`).join("")}</ul>
              ` : ""}
              ${validation.warnings.length > 0 ? `
                <p class="font-bold mt-3 mb-2">Suggestions:</p>
                <ul class="list-disc pl-4 text-sm">${validation.warnings.map((warn) => `<li>${warn}</li>`).join("")}</ul>
              ` : ""}
            </div>
          `,
          confirmButtonText: "Continue Anyway",
          cancelButtonText: "Choose Different",
          showCancelButton: true,
        });

        if (result.isConfirmed) {
          setFile(selectedFile);
          setPreview(URL.createObjectURL(selectedFile));
        }
        setUploading(false);
        return;
      }

      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setUploading(false);
    } catch (error) {
      console.error("Validation error:", error);
      toast("error", "Failed to validate image");
      setUploading(false);
    }
  }, []);

  const openCropper = useCallback(async (fileToCrop) => {
    const url = URL.createObjectURL(fileToCrop);
    setTempImage(url);
    setShowCropper(true);
  }, []);

  const confirmCrop = useCallback(async () => {
    if (!tempImage || !croppedAreaPixels) return;

    try {
      setUploading(true);
      const croppedBlob = await getCroppedImg(tempImage, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], `ad-${Date.now()}.jpg`, { type: "image/jpeg" });
      setFile(croppedFile);
      setPreview(URL.createObjectURL(croppedBlob));
      setShowCropper(false);
      URL.revokeObjectURL(tempImage);
      setTempImage(null);
      setCroppedAreaPixels(null);
      toast("success", "Image optimized!");
    } catch (e) {
      console.error("Crop error:", e);
      toast("error", "Failed to crop image");
    } finally {
      setUploading(false);
    }
  }, [tempImage, croppedAreaPixels]);

  const cancelCrop = useCallback(() => {
    if (tempImage) URL.revokeObjectURL(tempImage);
    setShowCropper(false);
    setTempImage(null);
    setCroppedAreaPixels(null);
    setUploading(false);
  }, [tempImage]);

  const handleUpload = useCallback(async () => {
    if (!preview) {
      toast("error", "Please select a media file");
      return;
    }

    if (uploading) return;
    setUploading(true);

    try {
      if (!title.trim()) {
        toast("error", "Headline text is required");
        setUploading(false);
        return;
      }

      let uploadedUrl = preview;
      let isVideo = mediaType === "video";

      if (file) {
        uploadedUrl = await uploadToMedia(file);
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        buttonText: buttonText.trim(),
        status: adStatus,
        mediaType,
        category: targetCategory,
        endDate: endDate || null,
        countdownText: countdownText.trim() || "Sale Ends In:",
      };

      if (isVideo) {
        payload.videoUrl = uploadedUrl;
      } else {
        payload.imageUrl = uploadedUrl;
      }

      if (editingAd) {
        await api.put(`/api/ads/${editingAd._id}`, payload);
        toast("success", "Campaign updated!");
      } else {
        await api.post(`/api/ads`, payload);
        toast("success", "Campaign published!");
      }

      resetForm();
      await fetchAds();
    } catch (err) {
      console.error("Upload error:", err);
      toast("error", err.response?.data?.message || "Failed to save campaign");
    } finally {
      setUploading(false);
    }
  }, [file, preview, title, description, buttonText, adStatus, targetCategory, mediaType, uploading, editingAd, fetchAds, resetForm]);

  const handleDelete = useCallback(async (id) => {
    const result = await Swal.fire({
      title: "Delete Campaign?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete",
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/api/ads/${id}`);
      await fetchAds();
      toast("success", "Campaign deleted!");
    } catch (err) {
      console.error("Delete error:", err);
      toast("error", "Failed to delete campaign");
    }
  }, [fetchAds]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedAds.size === 0) return;

    const result = await Swal.fire({
      title: `Delete ${selectedAds.size} Campaigns?`,
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: `Delete ${selectedAds.size} Items`,
    });

    if (!result.isConfirmed) return;

    try {
      await Promise.all([...selectedAds].map((id) => api.delete(`/api/ads/${id}`)));
      await fetchAds();
      setSelectedAds(new Set());
      toast("success", "Campaigns deleted!");
    } catch (err) {
      console.error("Bulk delete error:", err);
      toast("error", "Failed to delete campaigns");
    }
  }, [selectedAds, fetchAds]);

  const toggleAdSelection = useCallback((id) => {
    setSelectedAds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    if (selectedAds.size === filteredAds.length) {
      setSelectedAds(new Set());
    } else {
      setSelectedAds(new Set(filteredAds.map((ad) => ad._id)));
    }
  }, [filteredAds, selectedAds]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-20 lg:pb-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Loading campaigns...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-20 lg:pb-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
            <MdCloudUpload size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {editingAd ? "Edit Campaign" : "Campaign Manager"}
            </h1>
            <p className="text-xs text-slate-500 uppercase font-medium">Manage Targeted Ads</p>
          </div>
          {editingAd && (
            <button
              onClick={resetForm}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-600 transition-colors"
            >
              <MdClose size={16} />
              Cancel Edit
            </button>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Headline Text <span className="text-red-400 font-normal">(Required)</span>
                </label>
                <div className="relative">
                  <MdTextFields className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., WINTER COLLECTION 2026"
                    maxLength={100}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-emerald-500 transition-all font-medium text-slate-700"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">{title.length}/100 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Get up to 50% off on all winter items"
                  maxLength={200}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-emerald-500 transition-all font-medium text-slate-700 resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">{description.length}/200 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Button Text <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <MdTextFields className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="e.g., Shop Now"
                    maxLength={50}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-emerald-500 transition-all font-medium text-slate-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-slate-700">Campaign Status</p>
                  <p className="text-xs text-slate-400">{adStatus === "active" ? "Visible on the site" : "Hidden from visitors"}</p>
                </div>
                <button
                  onClick={() => setAdStatus((s) => (s === "active" ? "inactive" : "active"))}
                  className={adStatus === "active" ? "text-brand-500 hover:text-brand-600" : "text-slate-400 hover:text-slate-500"}
                >
                  {adStatus === "active" ? <MdToggleOn size={32} /> : <MdToggleOff size={32} />}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Target Placement</label>
                <div className="relative">
                  <MdCategory className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select
                    value={targetCategory}
                    onChange={(e) => setTargetCategory(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-emerald-500 transition-all font-medium text-slate-700 appearance-none"
                  >
                    <option value="home">Main Home Page</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat.slug}>{cat.name} Page</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Countdown Text</label>
                  <div className="relative">
                    <MdTextFields className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={countdownText}
                      onChange={(e) => setCountdownText(e.target.value)}
                      placeholder="Sale Ends In:"
                      maxLength={50}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-emerald-500 transition-all font-medium text-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Countdown End Date (Optional)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-emerald-500 transition-all font-medium text-slate-700"
                  />
                  <p className="text-xs text-slate-400 mt-1">Set for countdown timer on banner</p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4 bg-slate-100 rounded-xl p-1 w-fit">
                  <button
                    onClick={() => setMediaType("image")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      mediaType === "image" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <MdImage size={16} className="inline mr-1.5" />Image
                  </button>
                  <button
                    onClick={() => setMediaType("video")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      mediaType === "video" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <MdCloudUpload size={16} className="inline mr-1.5" />Video
                  </button>
                </div>

                <label className="block text-sm font-medium text-slate-600 mb-2">
                  {mediaType === "image" ? "Banner Image" : "Banner Video"} {!editingAd && (mediaType === "image" ? "(≈3.57:1 Ratio Recommended)" : "")}
                </label>
                <div className="relative border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-white transition-all cursor-pointer">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    accept={mediaType === "image" ? MEDIA_CONFIG.imageTypes.join(",") : MEDIA_CONFIG.videoTypes.join(",")}
                    disabled={uploading}
                  />
                  <div className="p-8 text-center">
                    {uploading ? (
                      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    ) : (
                      <>
                        <MdCloudUpload size={32} className="mx-auto text-slate-400 mb-2" />
                        <p className="text-slate-600 font-medium">
                          {editingAd ? `Replace Banner ${mediaType === "image" ? "Image" : "Video"}` : `Upload Banner ${mediaType === "image" ? "Image" : "Video"}`}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {mediaType === "image"
                            ? `≈3.57:1 Ratio | Max ${MEDIA_CONFIG.maxSizeMB}MB | JPG, PNG, WebP`
                            : `Max ${MEDIA_CONFIG.maxVideoSizeMB}MB | MP4, WebM, MOV`}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {file && mediaType === "image" && (
                  <button
                    onClick={() => openCropper(file)}
                    className="mt-2 flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
                  >
                    <MdCrop size={16} />
                    Crop Image
                  </button>
                )}

                {imageValidation && showValidation && mediaType === "image" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-3 p-3 rounded-lg text-xs flex items-start gap-2 ${
                      imageValidation.isOptimal ? "bg-brand-50 text-brand-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {imageValidation.isOptimal ? (
                      <MdCheck size={14} className="flex-shrink-0 mt-0.5" />
                    ) : (
                      <MdWarning size={14} className="flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p>{imageValidation.dimensions.width} x {imageValidation.dimensions.height}px • {imageValidation.aspectRatio}:1</p>
                      <p className="mt-1">
                        {imageValidation.isOptimal ? "Optimized for all devices" : `Recommended: ${MEDIA_CONFIG.recommendedWidth}x${MEDIA_CONFIG.recommendedHeight}px`}
                      </p>
                    </div>
                  </motion.div>
                )}

                {videoDuration && mediaType === "video" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-3 rounded-lg text-xs bg-blue-50 text-blue-700 flex items-start gap-2"
                  >
                    <MdCheck size={14} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <p>Duration: {videoDuration}s • {file?.size ? `${(file.size / (1024 * 1024)).toFixed(1)}MB` : ""}</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading || !preview}
              className="w-full py-3 rounded-xl font-medium text-white bg-brand-500 hover:bg-brand-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {editingAd ? "Updating..." : "Publishing..."}
                </>
              ) : (
                editingAd ? "Update Campaign" : "Publish Campaign"
              )}
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-5 space-y-4"
          >
            <div className="bg-slate-900 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400 uppercase">Preview</span>
                <span className="text-xs font-medium text-brand-400">{selectedCategoryName}</span>
              </div>
              <div className="relative aspect-[1920/537] bg-slate-800 rounded-xl overflow-hidden">
                {preview ? (
                  mediaType === "video" ? (
                    <video src={preview} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                  ) : (
                    <img src={preview} className="w-full h-full object-cover" alt="Preview" />
                  )
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600">
                    {mediaType === "video" ? <MdCloudUpload size={24} /> : <MdImage size={24} />}
                    <p className="text-xs mt-2">{mediaType === "video" ? "Video Preview" : "Image Preview"}</p>
                  </div>
                )}
                {title && preview && (
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-white text-sm font-bold truncate">{title}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex gap-3 items-center">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-brand-500">
                <MdDesktopWindows size={20} />
              </div>
              <div>
                <p className="text-xs text-brand-600 font-medium uppercase">Active Location</p>
                <p className="text-sm font-semibold text-slate-800">{selectedCategoryName} Page</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 font-medium mb-2">Quick Stats</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold text-slate-800">{ads.length}</p>
                  <p className="text-xs text-slate-500">Total Campaigns</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold text-brand-600">{filteredAds.length}</p>
                  <p className="text-xs text-slate-500">In This Category</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">
              Active Campaigns on {selectedCategoryName}
            </h3>
            <div className="flex items-center gap-3">
              {filteredAds.length > 0 && (
                <button
                  onClick={selectAllFiltered}
                  className="text-sm text-slate-500 hover:text-slate-700 font-medium"
                >
                  {selectedAds.size === filteredAds.length ? "Deselect All" : "Select All"}
                </button>
              )}
              {selectedAds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                >
                  <MdDelete size={16} />
                  Delete ({selectedAds.size})
                </button>
              )}
              <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {filteredAds.length} {filteredAds.length === 1 ? "campaign" : "campaigns"}
              </span>
            </div>
          </div>

          {filteredAds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAds.map((ad, index) => (
                <motion.div
                  key={ad._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-4 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all group ${
                    selectedAds.has(ad._id) ? "ring-2 ring-brand-500 bg-brand-50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAds.has(ad._id)}
                    onChange={() => toggleAdSelection(ad._id)}
                    className="w-4 h-4 text-brand-500 rounded border-slate-300 focus:ring-brand-500"
                  />
                  <div className="w-32 aspect-[1920/537] rounded-lg overflow-hidden bg-slate-200 flex-shrink-0 relative">
                    {ad.mediaType === "video" ? (
                      <>
                        <video src={ad.videoUrl} className="w-full h-full object-cover" muted loop playsInline />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-slate-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                        </div>
                      </>
                    ) : (
                      <img src={ad.imageUrl || ad.image} className="w-full h-full object-cover" alt={ad.title || "Ad"} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{ad.title || "Untitled Banner"}</p>
                    <p className="text-xs text-slate-500">{ad.category === "home" ? "Main Page" : ad.category}</p>
                    {ad.endDate && (
                      <p className={`text-xs mt-1 ${new Date(ad.endDate) > new Date() ? "text-brand-600" : "text-red-500"}`}>
                        {new Date(ad.endDate) > new Date() ? `Ends ${new Date(ad.endDate).toLocaleDateString()}` : "Expired"}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEditing(ad)}
                      className="p-2 text-slate-600 hover:bg-white rounded-lg transition-all"
                      title="Edit campaign"
                    >
                      <MdEdit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(ad._id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete campaign"
                    >
                      <MdDelete size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-slate-50 rounded-xl">
              <MdWarning size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-slate-400 text-sm">No Active Campaigns</p>
              <p className="text-slate-400 text-xs mt-1">Upload a banner to get started</p>
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {showCropper && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
          >
            <div className="relative w-full max-w-4xl h-[50vh] rounded-2xl overflow-hidden">
              <Cropper
                image={tempImage}
                crop={crop}
                zoom={zoom}
                aspect={MEDIA_CONFIG.aspectRatio}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="mt-6 flex gap-4">
              <button
                onClick={cancelCrop}
                className="px-8 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-all flex items-center gap-2"
              >
                <MdClose size={18} />
                Cancel
              </button>
              <button
                onClick={confirmCrop}
                disabled={!croppedAreaPixels}
                className="px-8 py-3 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <MdCheck size={18} />
                Apply Crop
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
