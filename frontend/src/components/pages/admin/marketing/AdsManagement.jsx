import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import api from "@/utils/api";
import Cropper from "react-easy-crop";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import uploadToMedia from "@/components/utils/Mediaupload";
import {
  MdCloudUpload,
  MdDelete,
  MdCategory,
  MdCheck,
  MdWarning,
  MdClose,
  MdEdit,
  MdToggleOn,
  MdToggleOff,
  MdAdd,
  MdSearch,
  MdCampaign,
  MdImage,
  MdVideoLibrary,
} from "react-icons/md";

/* ---------------------------------- constants ---------------------------------- */

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

/* ---------------------------------- helpers ---------------------------------- */

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

const categoryLabel = (category, categories) => {
  if (category === "home") return "Main Home";
  return categories.find((c) => c.slug === category)?.name || category;
};

const isExpired = (ad) =>
  ad.status === "active" && ad.endDate && new Date(ad.endDate) < new Date();

const statusInfo = (ad) => {
  if (isExpired(ad)) return { label: "Expired", cls: "text-red-500", dot: "bg-red-500" };
  if (ad.status === "active") return { label: "Active", cls: "text-emerald-600", dot: "bg-emerald-500" };
  return { label: "Inactive", cls: "text-slate-400", dot: "bg-slate-300" };
};

/* ---------------------------------- small pieces ---------------------------------- */

const Input = ({ icon, required, label, hint, className = "", ...props }) => (
  <div className={className}>
    {label && (
      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
    )}
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {icon}
        </span>
      )}
      <input
        {...props}
        className={`w-full py-2.5 ${icon ? "pl-10 " : "pl-4 "}pr-4 bg-slate-100/60 border border-transparent rounded-lg focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-brand-100 transition-all font-medium text-slate-700 text-sm outline-none`}
      />
    </div>
    {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
  </div>
);

/* ------------------------------------ page ------------------------------------ */

export default function AdsManagement() {
  /* data state */
  const [ads, setAds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  /* filter state */
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  /* selection / form state */
  const [selectedAd, setSelectedAd] = useState(null);
  const [formMode, setFormMode] = useState(null); // "create" | "edit" | null
  const [selectedIds, setSelectedIds] = useState(new Set());

  /* form fields */
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [targetCategory, setTargetCategory] = useState("home");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [countdownText, setCountdownText] = useState("Sale Ends In:");
  const [adStatus, setAdStatus] = useState("active");
  const [mediaType, setMediaType] = useState("image");

  const [imageValidation, setImageValidation] = useState(null);
  const [videoDuration, setVideoDuration] = useState(null);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImage, setTempImage] = useState(null);

  const rightPanelRef = useRef(null);

  const filteredAds = useMemo(() => {
    return Array.isArray(ads)
      ? ads.filter((ad) => {
          if (filterCategory !== "all" && ad.category !== filterCategory) return false;
          if (search && !(ad.title || "").toLowerCase().includes(search.toLowerCase())) return false;
          return true;
        })
      : [];
  }, [ads, filterCategory, search]);

  /* ---------------------------------- data loading ---------------------------------- */

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

  /* ---------------------------------- form logic ---------------------------------- */

  const clearForm = useCallback(() => {
    setSelectedAd(null);
    setFormMode(null);
    setFile(null);
    setPreview(null);
    setTitle("");
    setDescription("");
    setButtonText("");
    setTargetCategory("home");
    setStartDate("");
    setEndDate("");
    setCountdownText("Sale Ends In:");
    setAdStatus("active");
    setMediaType("image");
    setImageValidation(null);
    setVideoDuration(null);
  }, []);

  const openCreate = useCallback(() => {
    clearForm();
    setFormMode("create");
  }, [clearForm]);

  const selectAd = useCallback((ad) => {
    setSelectedAd(ad);
    setFormMode(null);
  }, []);

  const startEditing = useCallback((ad) => {
    setSelectedAd(ad);
    setFormMode("edit");
    setTitle(ad.title || "");
    setDescription(ad.description || "");
    setButtonText(ad.buttonText || "");
    setTargetCategory(ad.category);
    setStartDate(ad.startDate ? new Date(ad.startDate).toISOString().split("T")[0] : "");
    setEndDate(ad.endDate ? new Date(ad.endDate).toISOString().split("T")[0] : "");
    setCountdownText(ad.countdownText || "Sale Ends In:");
    setAdStatus(ad.status || "active");
    setMediaType(ad.mediaType || "image");
    const mediaUrl = ad.mediaType === "video" ? ad.videoUrl : ad.imageUrl || ad.image;
    setPreview(mediaUrl || null);
    setFile(null);
    setImageValidation(null);
    setVideoDuration(null);

    setTimeout(() => {
      rightPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 60);
  }, []);

  const handleSave = useCallback(async () => {
    if (!preview) {
      toast("error", "Please select a media file");
      return;
    }
    if (!title.trim()) {
      toast("error", "Headline text is required");
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      toast("error", "Start date cannot be after end date");
      return;
    }

    setSaving(true);
    try {
      let uploadedUrl = preview;
      if (file) {
        setUploading(true);
        uploadedUrl = await uploadToMedia(file);
      }

      const isVideo = mediaType === "video";
      const payload = {
        title: title.trim(),
        description: description.trim(),
        buttonText: buttonText.trim(),
        status: adStatus,
        mediaType,
        category: targetCategory,
        startDate: startDate || null,
        endDate: endDate || null,
        countdownText: countdownText.trim() || "Sale Ends In:",
      };
      if (isVideo) {
        payload.videoUrl = uploadedUrl;
      } else {
        payload.imageUrl = uploadedUrl;
      }

      if (formMode === "edit" && selectedAd) {
        await api.put(`/api/ads/${selectedAd._id}`, payload);
        toast("success", "Campaign updated!");
      } else {
        await api.post(`/api/ads`, payload);
        toast("success", "Campaign published!");
      }

      clearForm();
      await fetchAds();
    } catch (err) {
      console.error("Save error:", err);
      toast("error", err.response?.data?.message || "Failed to save campaign");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }, [preview, title, startDate, endDate, mediaType, description, buttonText, adStatus, targetCategory, countdownText, file, formMode, selectedAd, clearForm, fetchAds]);

  const handleDelete = useCallback(async (ad) => {
    const result = await Swal.fire({
      title: "Delete Campaign?",
      text: `"${ad.title || "Untitled"}" will be removed permanently.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete",
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/api/ads/${ad._id}`);
      if (selectedAd?._id === ad._id) clearForm();
      await fetchAds();
      toast("success", "Campaign deleted!");
    } catch (err) {
      console.error("Delete error:", err);
      toast("error", "Failed to delete campaign");
    }
  }, [selectedAd, clearForm, fetchAds]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const result = await Swal.fire({
      title: `Delete ${selectedIds.size} Campaigns?`,
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: `Delete ${selectedIds.size} Items`,
    });
    if (!result.isConfirmed) return;

    try {
      await Promise.all([...selectedIds].map((id) => api.delete(`/api/ads/${id}`)));
      setSelectedIds(new Set());
      clearForm();
      await fetchAds();
      toast("success", "Campaigns deleted!");
    } catch (err) {
      console.error("Bulk delete error:", err);
      toast("error", "Failed to delete campaigns");
    }
  }, [selectedIds, clearForm, fetchAds]);

  const toggleStatus = useCallback(async (ad) => {
    if (togglingId) return;
    setTogglingId(ad._id);
    try {
      await api.patch(`/api/ads/${ad._id}/status`);
      await fetchAds();
    } catch (err) {
      console.error("Toggle status error:", err);
      toast("error", "Failed to update status");
    } finally {
      setTogglingId(null);
    }
  }, [fetchAds, togglingId]);

  const toggleAdSelection = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /* ---------------------------------- media ---------------------------------- */

  const onCropComplete = useCallback((_area, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleFileChange = useCallback(async (e) => {
    const selectedFile = e.target.files[0];
    if (e.target) e.target.value = "";
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

  const openCropper = useCallback((fileToCrop) => {
    const url = URL.createObjectURL(fileToCrop);
    setTempImage(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
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

  /* ---------------------------------- render ---------------------------------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6 px-4 md:px-6 pb-20 lg:pb-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Loading campaigns...</p>
          </div>
        </div>
      </div>
    );
  }

  const active = filteredAds.length;
  const formOpen = formMode !== null;
  const showingAd = formMode === "edit" ? null : selectedAd;

  return (
    <div className="min-h-screen bg-slate-50 px-4 md:px-6 pb-20 lg:pb-6">
      {/* top bar */}
      <div className="max-w-7xl mx-auto pt-6 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Campaigns</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {ads.length} total • {ads.filter((a) => a.status === "active" && !isExpired(a)).length} running now
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
                >
                  Clear
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium"
                >
                  <MdDelete size={16} /> Delete {selectedIds.size}
                </button>
              </>
            )}
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <MdAdd size={16} /> New Campaign
            </button>
          </div>
        </div>
      </div>

      {/* main split */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ---------------------- left: list ---------------------- */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            {/* search + filter */}
            <div className="p-3 border-b border-slate-100 space-y-2">
              <div className="relative">
                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search campaigns..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-lg focus:bg-white focus:border-slate-300 transition-all font-medium text-slate-700 text-sm outline-none"
                />
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-lg focus:bg-white focus:border-slate-300 transition-all font-medium text-slate-600 text-sm outline-none"
              >
                <option value="all">All locations</option>
                <option value="home">Main Home</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* rows */}
            <div className="divide-y divide-slate-100 max-h-[65vh] overflow-y-auto">
              {active > 0 ? (
                filteredAds.map((ad) => {
                  const status = statusInfo(ad);
                  const isSelected = selectedIds.has(ad._id) || showingAd?._id === ad._id;
                  return (
                    <div
                      key={ad._id}
                      onClick={() => selectAd(ad)}
                      className={`group flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                        showingAd?._id === ad._id ? "bg-brand-50/70" : "hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(ad._id)}
                        onChange={() => toggleAdSelection(ad._id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-brand-500 rounded border-slate-300 focus:ring-brand-500 flex-shrink-0"
                      />
                      <div className="w-20 h-11 rounded-md overflow-hidden bg-slate-100 flex-shrink-0">
                        {ad.mediaType === "video" ? (
                          <video src={ad.videoUrl} className="w-full h-full object-cover" muted loop playsInline />
                        ) : (
                          <img src={ad.imageUrl || ad.image} className="w-full h-full object-cover" alt={ad.title || "Ad"} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{ad.title || "Untitled Banner"}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-400">{categoryLabel(ad.category, categories)}</span>
                          <span className={`flex items-center gap-1 text-[11px] font-semibold ${status.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStatus(ad);
                        }}
                        disabled={togglingId === ad._id}
                        className={`p-1.5 opacity-0 group-hover:opacity-100 rounded-md transition-all disabled:opacity-40 ${
                          ad.status === "active" ? "text-emerald-500 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-100"
                        }`}
                        title={ad.status === "active" ? "Deactivate" : "Activate"}
                      >
                        {togglingId === ad._id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : ad.status === "active" ? (
                          <MdToggleOn size={18} />
                        ) : (
                          <MdToggleOff size={18} />
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="py-16 text-center">
                  <MdCampaign size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-400 text-sm">No campaigns found</p>
                  {search && <p className="text-slate-400 text-xs mt-1">Try a different search.</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---------------------- right: detail / form ---------------------- */}
        <div ref={rightPanelRef} className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {formOpen ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 md:p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-bold text-slate-800">
                    {formMode === "create" ? "New Campaign" : "Edit Campaign"}
                  </h3>
                  <button
                    onClick={clearForm}
                    className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 font-medium"
                  >
                    <MdClose size={16} /> Close
                  </button>
                </div>

                <div className="space-y-5">
                  {/* live preview */}
                  <div className="relative aspect-[1920/537] bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                    {preview ? (
                      mediaType === "video" ? (
                        <video src={preview} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                      ) : (
                        <img src={preview} className="w-full h-full object-cover" alt="Banner" />
                      )
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        {mediaType === "video" ? <MdVideoLibrary size={26} /> : <MdImage size={26} />}
                        <p className="text-xs mt-1.5 font-medium">No media yet — upload below</p>
                      </div>
                    )}
                    {preview && title && (
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-white text-sm font-bold truncate">{title}</p>
                      </div>
                    )}
                  </div>

                  {/* media */}
                  <div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                        <button
                          onClick={() => setMediaType("image")}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            mediaType === "image" ? "bg-white shadow-sm text-slate-800" : "text-slate-500"
                          }`}
                        >
                          Image
                        </button>
                        <button
                          onClick={() => setMediaType("video")}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            mediaType === "video" ? "bg-white shadow-sm text-slate-800" : "text-slate-500"
                          }`}
                        >
                          Video
                        </button>
                      </div>
                      <label
                        className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-md text-xs font-semibold cursor-pointer transition-colors"
                      >
                        <MdCloudUpload size={14} />
                        {preview ? "Replace media" : "Upload media"}
                        <input
                          type="file"
                          onChange={handleFileChange}
                          accept={mediaType === "image" ? MEDIA_CONFIG.imageTypes.join(",") : MEDIA_CONFIG.videoTypes.join(",")}
                          disabled={uploading}
                          hidden
                        />
                      </label>
                      {file && mediaType === "image" && (
                        <button
                          onClick={() => openCropper(file)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-xs font-semibold transition-colors"
                        >
                          <MdEdit size={14} /> Crop
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400">
                      {mediaType === "image"
                        ? `≈3.57:1 ratio • min ${MEDIA_CONFIG.minWidth}×${MEDIA_CONFIG.minHeight}px • max ${MEDIA_CONFIG.maxSizeMB}MB • JPG, PNG, WebP`
                        : `max ${MEDIA_CONFIG.maxVideoSizeMB}MB • MP4, WebM, MOV`}
                    </p>

                    {imageValidation && mediaType === "image" && (
                      <p
                        className={`mt-1.5 text-[11px] font-medium flex items-center gap-1 ${
                          imageValidation.isOptimal ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {imageValidation.isOptimal ? <MdCheck size={13} /> : <MdWarning size={13} />}
                        {imageValidation.dimensions.width}×{imageValidation.dimensions.height}px • {imageValidation.aspectRatio}:1
                      </p>
                    )}
                    {videoDuration !== null && mediaType === "video" && (
                      <p className="mt-1.5 text-[11px] font-medium text-blue-600">
                        {videoDuration}s duration{file ? ` • ${(file.size / (1024 * 1024)).toFixed(1)}MB` : ""}
                      </p>
                    )}
                  </div>

                  {/* content */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      className="sm:col-span-2"
                      label="Headline *"
                      icon={<MdCampaign size={18} />}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., WINTER COLLECTION 2026"
                      maxLength={100}
                    />
                    <Input
                      className="sm:col-span-2"
                      label="Description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g., Get up to 50% off on all winter items"
                      maxLength={200}
                    />
                    <Input
                      label="Button text"
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      placeholder="e.g., Shop Now"
                      maxLength={50}
                    />
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                        Location
                      </label>
                      <div className="relative">
                        <MdCategory className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        <select
                          value={targetCategory}
                          onChange={(e) => setTargetCategory(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-100/60 border border-transparent rounded-lg focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-brand-100 transition-all font-medium text-slate-700 text-sm outline-none appearance-none cursor-pointer"
                        >
                          <option value="home">Main Home Page</option>
                          {categories.map((cat) => (
                            <option key={cat._id} value={cat.slug}>{cat.name} Page</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* schedule */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      type="date"
                      label="Start date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      hint="Empty = show immediately"
                    />
                    <Input
                      type="date"
                      label="End date"
                      value={endDate}
                      min={startDate || new Date().toISOString().split("T")[0]}
                      onChange={(e) => setEndDate(e.target.value)}
                      hint="Sets the countdown timer"
                    />
                    <Input
                      className="sm:col-span-2"
                      label="Countdown text"
                      value={countdownText}
                      onChange={(e) => setCountdownText(e.target.value)}
                      placeholder="Sale Ends In:"
                      maxLength={50}
                    />
                  </div>

                  {/* status + actions */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      onClick={() => setAdStatus((s) => (s === "active" ? "inactive" : "active"))}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                        adStatus === "active" ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {adStatus === "active" ? <MdToggleOn size={18} /> : <MdToggleOff size={18} />}
                      {adStatus === "active" ? "Active" : "Inactive"}
                    </button>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={clearForm}
                        className="px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving || uploading || !preview || !title.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        {saving || uploading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <MdCheck size={16} />
                        )}
                        {formMode === "edit" ? "Save Changes" : "Publish"}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="detail"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 md:p-6"
              >
                {showingAd ? (
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-800 truncate">{showingAd.title || "Untitled Banner"}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {categoryLabel(showingAd.category, categories)} • {showingAd.mediaType === "video" ? "Video" : "Image"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => toggleStatus(showingAd)}
                          disabled={togglingId === showingAd._id}
                          className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${
                            showingAd.status === "active" ? "text-emerald-500 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-100"
                          }`}
                          title={showingAd.status === "active" ? "Deactivate" : "Activate"}
                        >
                          {togglingId === showingAd._id ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : showingAd.status === "active" ? (
                            <MdToggleOn size={18} />
                          ) : (
                            <MdToggleOff size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => startEditing(showingAd)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-sm font-semibold transition-colors"
                        >
                          <MdEdit size={16} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(showingAd)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <MdDelete size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="relative aspect-[1920/537] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 mb-4">
                      {showingAd.mediaType === "video" ? (
                        <video src={showingAd.videoUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                      ) : (
                        <img src={showingAd.imageUrl || showingAd.image} className="w-full h-full object-cover" alt={showingAd.title || "Ad"} />
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {showingAd.description && (
                        <div className="sm:col-span-2 p-3 bg-slate-50 rounded-lg">
                          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Description</p>
                          <p className="text-slate-700">{showingAd.description}</p>
                        </div>
                      )}
                      {showingAd.buttonText && (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Button</p>
                          <p className="text-slate-700 font-medium">{showingAd.buttonText}</p>
                        </div>
                      )}
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Status</p>
                        <p className={`font-semibold flex items-center gap-1.5 ${statusInfo(showingAd).cls}`}>
                          <span className={`w-2 h-2 rounded-full ${statusInfo(showingAd).dot}`} />
                          {statusInfo(showingAd).label}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Live Dates</p>
                        <p className="text-slate-700 text-xs leading-relaxed">
                          {showingAd.startDate ? new Date(showingAd.startDate).toLocaleDateString() : "Immediately"}
                          {" - "}
                          {showingAd.endDate ? new Date(showingAd.endDate).toLocaleDateString() : "No end date"}
                        </p>
                      </div>
                      {showingAd.countdownText && (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Countdown Text</p>
                          <p className="text-slate-700">{showingAd.countdownText}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                      <MdCampaign size={28} className="text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-semibold">Select a campaign</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Click a campaign on the left to preview and edit it, or create a new one.
                    </p>
                    <button
                      onClick={openCreate}
                      className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      <MdAdd size={16} /> New Campaign
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* cropper */}
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
