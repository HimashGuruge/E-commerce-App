import React, { useEffect, useState, useRef } from "react";
import api from "@/utils/api";
import { getPublicSettings } from "@/utils/siteSettings";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { addToCart } from "@/components/utils/Cart.jsx";
import { getWishlistLocal, addToWishlistLocal, removeFromWishlistLocal, isInWishlistLocal } from "@/components/utils/Wishlist.jsx";
import ProductRecommendations from "@/components/home/ProductRecommendations.jsx";
import SellerChatPanel from "./SellerChatPanel.jsx";
import QuillEditor from "@/components/shared/QuillEditor.jsx";
import uploadToMedia from "@/components/utils/Mediaupload.jsx";
import { QRCodeCanvas } from "qrcode.react";
import SkeletonLoader from "@/components/shared/SkeletonLoader.jsx";
import {
  FiShoppingCart,
  FiArrowLeft,
  FiTruck,
  FiShield,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiHeart,
  FiShare2,
  FiPackage,
  FiRefreshCw,
  FiThumbsUp,
  FiTrendingUp,
  FiSend,
  FiUser,
  FiMail,
  FiMessageSquare,
  FiEdit2,
  FiTrash2,
  FiX,
  FiEye,
  FiEyeOff,
  FiMapPin,
  FiStar,
  FiShoppingBag,
  FiPlus,
  FiInfo,
} from "react-icons/fi";
import { FaStar, FaRegStar, FaStarHalfAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { onSocketEvent } from "@/utils/socket";

export default function ProductOverview() {
  const { productId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [sellerChatOpen, setSellerChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartQuantity, setCartQuantity] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [reviewLightboxOpen, setReviewLightboxOpen] = useState(false);
  const [reviewLightboxImages, setReviewLightboxImages] = useState([]);
  const [reviewLightboxIndex, setReviewLightboxIndex] = useState(0);
  const [showZoom, setShowZoom] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const zoomLensSize = 150;
  const zoomFactor = 2.5;
  const sliderRef = useRef(null);
  const zoomRef = useRef(null);
  const reviewSliderRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [reviewCanScrollLeft, setReviewCanScrollLeft] = useState(false);
  const [reviewCanScrollRight, setReviewCanScrollRight] = useState(true);
  const navigate = useNavigate();
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [reviewFilter, setReviewFilter] = useState("all");
  const [canReviewState, setCanReviewState] = useState(null); // null = unknown, true/false = from API
  const [descExpanded, setDescExpanded] = useState(false);
  const [shippingSettings, setShippingSettings] = useState({
    courierName: "Domex",
    standardName: "Standard",
    standardCost: 330,
    standardDaysMin: 5,
    standardDaysMax: 11,
    freeThreshold: 10000,
  });
  const [returnPolicy, setReturnPolicy] = useState({
    enabled: true,
    windowDays: 14,
    exchangesAllowed: false,
    refundDays: 5,
    shippingCostPaidBy: "customer",
    policyText: "",
  });
  const [appPromo, setAppPromo] = useState({
    enabled: true,
    title: "Scan with mobile",
    description: "Download app to enjoy discounts",
    badgeText: "App Exclusive",
  });
  const [sellerDefaults, setSellerDefaults] = useState({
    rating: 90,
    shipOnTime: 96,
    chatResponseLabel: "not enough data",
  });
  const [sellerStats, setSellerStats] = useState(null);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  const [ratingStats, setRatingStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [ratingDistribution, setRatingDistribution] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewSort, setReviewSort] = useState("newest");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [attributeRatings, setAttributeRatings] = useState({ shippingSpeed: 0, productQuality: 0, valueForMoney: 0 });
  const [deliveryDates, setDeliveryDates] = useState(() => {
    const deliveryStart = new Date(Date.now() + 5 * 86400000);
    const deliveryEnd = new Date(Date.now() + 11 * 86400000);
    return { start: deliveryStart, end: deliveryEnd };
  });

  // Delivery date calculation - updates when shipping settings load
  useEffect(() => {
    const deliveryStart = new Date(Date.now() + shippingSettings.standardDaysMin * 86400000);
    const deliveryEnd = new Date(Date.now() + shippingSettings.standardDaysMax * 86400000);
    setDeliveryDates({ start: deliveryStart, end: deliveryEnd });
  }, [shippingSettings.standardDaysMin, shippingSettings.standardDaysMax]);

  const [reviewImages, setReviewImages] = useState([]);
  const [reviewImagesPreviews, setReviewImagesPreviews] = useState([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const [editAttributeRatings, setEditAttributeRatings] = useState({ shippingSpeed: 0, productQuality: 0, valueForMoney: 0 });
  const [editImages, setEditImages] = useState([]);
  const [updatingReview, setUpdatingReview] = useState(false);

  // Q&A state
  const [questions, setQuestions] = useState([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaPage, setQaPage] = useState(1);
  const [qaTotalPages, setQaTotalPages] = useState(0);
  const [showQaModal, setShowQaModal] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [emptyQuestionError, setEmptyQuestionError] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [answeringQuestionId, setAnsweringQuestionId] = useState(null);
  const [answerText, setAnswerText] = useState("");

  const getUserIdFromToken = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(base64));
      return payload?.id || payload?._id || null;
    } catch (err) {
      console.error("Failed to decode token:", err);
      return null;
    }
  };

  const getCurrentUser = () => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = getUserIdFromToken();
    return { token, user, userId };
  };

  const loadQuestions = async (page = 1) => {
    if (!productId) return;
    setQaLoading(true);
    try {
      const { data } = await api.get(`/api/questions?productId=${productId}&page=${page}&limit=10`);
      if (data.success) {
        setQuestions(data.questions);
        setQaTotalPages(data.pages);
        setQaPage(data.page);
      }
    } catch (err) {
      console.error("Error loading questions:", err);
    } finally {
      setQaLoading(false);
    }
  };

  const askQuestion = async () => {
    const { user } = getCurrentUser();
    if (!user?.email) {
      Swal.fire({ icon: 'info', title: 'Login Required', text: 'Please login to ask a question' });
      return;
    }
    if (!questionText.trim()) {
      setEmptyQuestionError(true);
      return;
    }
    setSubmittingQuestion(true);
    try {
      const { data } = await api.post("/api/questions", { productId, question: questionText.trim() });
      if (data.success) {
        setQuestions(prev => [data.question, ...prev]);
        setQuestionText("");
        setShowQaModal(false);
        Swal.fire({ icon: 'success', title: 'Question Posted', text: 'Your question has been submitted', timer: 2000, showConfirmButton: false });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.error || 'Failed to post question' });
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const submitAnswer = async (questionId) => {
    if (!answerText.trim()) return;
    try {
      const { data } = await api.post(`/api/questions/${questionId}/answer`, { answer: answerText.trim() });
      if (data.success) {
        setQuestions(prev => prev.map(q => q._id === questionId ? data.question : q));
        setAnswerText("");
        setAnsweringQuestionId(null);
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.error || 'Failed to submit answer' });
    }
  };

  const updateCartQuantity = () => {
    try {
      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      const itemInCart = cart.find((item) => item.productId === productId);
      setCartQuantity(itemInCart ? itemInCart.qty : 0);
    } catch (err) {
      console.error("Error updating cart quantity:", err);
    }
  };

  const updateCartQuantityWithVariant = (prodId, variantList) => {
    try {
      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      const variantIds = variantList.map(v => v.sku);
      const itemsInCart = cart.filter((item) => 
        item.productId === prodId || (item.variantSku && variantIds.includes(item.variantSku))
      );
      const totalQty = itemsInCart.reduce((sum, item) => sum + item.qty, 0);
      setCartQuantity(totalQty);
    } catch (err) {
      console.error("Error updating cart quantity with variant:", err);
    }
  };

  const parseVariantSku = (vsku) => {
    if (!vsku || typeof vsku !== 'string') return {};
    const attrs = {};
    vsku.split('-').forEach(pair => {
      const eqIdx = pair.indexOf('_');
      if (eqIdx > 0) {
        const key = pair.slice(0, eqIdx);
        const value = pair.slice(eqIdx + 1);
        if (key && value) {
          attrs[key] = value;
        }
      }
    });
    return attrs;
  };

  const getVariantAttributes = (variant) => {
    if (!variant) return {};
    if (variant.attributes && typeof variant.attributes === 'object') {
      const attrs = variant.attributes;
      if (attrs instanceof Map) {
        return Object.fromEntries(attrs);
      }
      if (typeof attrs === 'object' && Object.keys(attrs).length > 0) {
        const firstVal = Object.values(attrs)[0];
        if (typeof firstVal === 'string') {
          return attrs;
        }
      }
    }
    if (variant.variantSku) return parseVariantSku(variant.variantSku);
    return {};
  };

  const getAvailableAttributes = () => {
    if (!variants || variants.length === 0) return {};
    const attrValues = {};
    variants.forEach(variant => {
      const attrs = getVariantAttributes(variant);
      if (attrs && typeof attrs === 'object') {
        Object.entries(attrs).forEach(([key, value]) => {
          if (!attrValues[key]) attrValues[key] = [];
          if (!attrValues[key].includes(value)) {
            attrValues[key].push(value);
          }
        });
      }
    });
    return attrValues;
  };

  const findMatchingVariant = (attrs) => {
    if (!variants || variants.length === 0) return null;
    return variants.find(variant => {
      const vAttrs = getVariantAttributes(variant);
      if (!vAttrs || typeof vAttrs !== 'object') return false;
      return Object.entries(attrs).every(([key, value]) => 
        vAttrs[key] === value
      );
    });
  };

  const handleAttributeChange = (attribute, value) => {
    if (!variants || variants.length === 0) return;
    
    const isAlreadySelected = selectedAttributes[attribute] === value;
    
    if (isAlreadySelected) {
      const newAttributes = { ...selectedAttributes };
      delete newAttributes[attribute];
      setSelectedAttributes(newAttributes);
      setSelectedVariant(null);
      if (data?.images?.length > 0) {
        setSelectedImage(0);
      }
    } else {
      const newAttributes = { ...selectedAttributes, [attribute]: value };
      setSelectedAttributes(newAttributes);
      
      const matchingVariant = findMatchingVariant(newAttributes);
      setSelectedVariant(matchingVariant || null);
      
      if (matchingVariant) {
        setSelectedImage(0);
      }
    }
  };

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setShowLightbox(true);
  };

  const nextImage = () => {
    setLightboxIndex((prev) => (prev + 1) % currentImages.length);
  };

  const prevImage = () => {
    setLightboxIndex((prev) => (prev - 1 + currentImages.length) % currentImages.length);
  };

  const openReviewLightbox = (images, index) => {
    setReviewLightboxImages(images);
    setReviewLightboxIndex(index);
    setReviewLightboxOpen(true);
  };

  const nextReviewImage = () => {
    setReviewLightboxIndex((prev) => (prev + 1) % reviewLightboxImages.length);
  };

  const prevReviewImage = () => {
    setReviewLightboxIndex((prev) => (prev - 1 + reviewLightboxImages.length) % reviewLightboxImages.length);
  };

  const handleZoomMove = (e) => {
    const rect = zoomRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    });
  };

  useEffect(() => {
    if (!reviewLightboxOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setReviewLightboxOpen(false);
      if (e.key === 'ArrowRight') nextReviewImage();
      if (e.key === 'ArrowLeft') prevReviewImage();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [reviewLightboxOpen, reviewLightboxImages.length]);

  const scrollSlider = (direction) => {
    if (sliderRef.current) {
      const amount = sliderRef.current.querySelector('.item-gallery__thumbnail')?.offsetWidth || 58;
      sliderRef.current.scrollBy({
        left: direction === 'next' ? amount + 8 : -(amount + 8),
        behavior: 'smooth',
      });
    }
  };

  const handleSliderScroll = () => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      setCanScrollLeft(scrollLeft > 4);
    }
  };

  const handleReviewSliderScroll = () => {
    if (reviewSliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = reviewSliderRef.current;
      setReviewCanScrollLeft(scrollLeft > 4);
      setReviewCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  const scrollReviewSlider = (direction) => {
    if (reviewSliderRef.current) {
      const amount = 240;
      reviewSliderRef.current.scrollBy({
        left: direction === 'next' ? amount : -amount,
        behavior: 'smooth',
      });
    }
  };

  const handleAddToCart = async () => {
    if (!data) return;

    if (showVariantSelector && !selectedVariant) {
      await Swal.fire({
        icon: "info",
        title: "Select Options",
        text: "Please select all options before adding to cart",
        confirmButtonColor: "#0f172a",
      });
      return;
    }

    const stockToCheck = showVariantSelector ? currentStock : data.stock;
    
    if (quantity > stockToCheck) {
      await Swal.fire({
        icon: "warning",
        title: "Insufficient Stock",
        text: `Only ${stockToCheck} items available.`,
        confirmButtonColor: "#0f172a",
      });
      return;
    }

    if (cartQuantity + quantity > stockToCheck) {
      await Swal.fire({
        icon: "warning",
        title: "Stock Limit Exceeded",
        text: `You already have ${cartQuantity} in cart. Total stock is ${stockToCheck}. You can add ${stockToCheck - cartQuantity} more.`,
        confirmButtonColor: "#0f172a",
      });
      return;
    }

    setAddingToCart(true);

    try {
      addToCart(
        data.productId,
        quantity,
        originalPrice,
        currentPrice,
        currentImages?.[0] || "",
        data.productName,
        stockToCheck,
        null,
        hasVariants ? {
          variantSku: currentSku,
          attributes: selectedAttributes,
        } : null
      );

      if (hasVariants) {
        updateCartQuantityWithVariant(data.productId, variants);
      } else {
        updateCartQuantity();
      }

      await Swal.fire({
        icon: "success",
        title: "Added to Cart!",
        html: `
          <div class="text-left">
            <p class="font-bold">${data.productName}</p>
            ${hasVariants ? `<p class="text-sm text-gray-600">${Object.entries(selectedAttributes).map(([k, v]) => `${k}: ${v}`).join(', ')}</p>` : ''}
            <p class="text-sm text-gray-600">Quantity: ${quantity}</p>
          </div>
        `,
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
        background: "#1e293b",
        color: "#fff",
      });

      setQuantity(1);
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Failed to add to cart. Please try again.",
        confirmButtonColor: "#0f172a",
      });
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    if (!data || isOutOfStock) return;

    if (showVariantSelector && !selectedVariant) {
      Swal.fire({
        icon: "info",
        title: "Select Options",
        text: "Please select all options before proceeding",
        confirmButtonColor: "#0f172a",
      });
      return;
    }

    const stockToCheck = showVariantSelector ? currentStock : data.stock;
    
    if (quantity > stockToCheck) {
      Swal.fire({
        icon: "warning",
        title: "Insufficient Stock",
        text: `Only ${stockToCheck} items available.`,
        confirmButtonColor: "#0f172a",
      });
      return;
    }

    navigate("/shipping", {
      state: {
        orderedItems: [
          {
            productId: data.productId,
            productName: data.productName,
            price: originalPrice,
            sellingPrice: currentPrice,
            images: currentImages,
            qty: quantity,
            stock: stockToCheck,
            ...(hasVariants ? {
              variantSku: currentSku,
              attributes: selectedAttributes,
            } : {})
          },
        ],
        total: currentPrice * quantity,
        labeledTotal: originalPrice * quantity,
        discount: (originalPrice - currentPrice) * quantity,
      },
    });
  };

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId || typeof productId !== "string" || productId === "[object Object]") {
        setError("Invalid product ID");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(
          `/api/products/${productId}/with-variants`
        );
        if (response.data && response.data.success) {
          const { product: productData, variants: variantsData } = response.data;
          setProduct(productData);
          setVariants(variantsData || []);

          // Check if in wishlist
          const wishlist = getWishlistLocal();
          const inWishlist = isInWishlistLocal(productData.productId);
          setIsWishlisted(inWishlist);

          if (variantsData && variantsData.length > 0) {
            const firstAvailable = variantsData.find(v => v.stock > 0);
            if (firstAvailable) {
              const attrs = getVariantAttributes(firstAvailable);
              setSelectedAttributes(attrs);
              setSelectedVariant(firstAvailable);
            }
            updateCartQuantityWithVariant(productData.productId, variantsData);
          } else {
            updateCartQuantity();
          }
        } else {
          setError("Product data not found");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load product.");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  // Fetch seller stats from real data (also refetched on live updates)
  const fetchSellerStats = React.useCallback(async (brand) => {
    try {
      const res = await api.get(`/api/products/seller-stats?brand=${encodeURIComponent(brand)}`);
      if (res.data?.success && res.data?.stats) {
        setSellerStats(res.data.stats);
      }
    } catch (err) { /* silent */ }
  }, []);

  useEffect(() => {
    if (!product?.brand) return;
    fetchSellerStats(product.brand);

    // Live updates: the backend pushes "seller-stats:changed" whenever a
    // review, order status change, or chat exchange alters the brand's stats
    const unsubscribe = onSocketEvent(["seller-stats:changed"], ({ brands }) => {
      if (brands && brands.includes(product.brand)) {
        fetchSellerStats(product.brand);
      }
    });
    return unsubscribe;
  }, [product?.brand, fetchSellerStats]);

  // "Chat Now": open the live buyer<->seller thread (login required)
  const openSellerChat = () => {
    const { userId } = getCurrentUser();
    if (!userId) {
      Swal.fire({ icon: "info", title: "Login Required", text: "Please login to chat with this seller", timer: 3200, timerProgressBar: true, showConfirmButton: false });
      return;
    }
    if (!product?.seller?._id) {
      // Marketplace product (no seller): open the support chat and escalate to a
      // REAL admin — "@admin" flag makes the backend alert admins for a manual
      // reply instead of answering with the AI bot.
      const productName = (data?.productName || product?.name || "").trim();
      const msg = productName
        ? `@admin Hi, I have a question about the product "${productName}".`
        : "@admin Hi, I have a question about a product.";
      window.dispatchEvent(new CustomEvent("trigger-chatbot-message", { detail: { message: msg } }));
      return;
    }
    // This is the seller's OWN product: a seller cannot chat with themselves.
    // Point them to where incoming buyer messages actually land.
    if (String(userId) === String(product.seller._id)) {
      Swal.fire({
        icon: "info",
        title: "Your product",
        text: "This is your own product, so there is no buyer to chat with here. Incoming buyer messages about this product will arrive in your Seller Dashboard → Messages.",
        timer: 4500,
        timerProgressBar: true,
        showConfirmButton: false,
      });
      return;
    }
    setSellerChatOpen(true);
  };

  // Fetch shipping settings & return policy
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const s = await getPublicSettings();
        if (s) {
          if (s.shipping) {
            setShippingSettings({
              courierName: s.shipping.courierName || "Domex",
              standardName: s.shipping.standardName || "Standard",
              standardCost: s.shipping.standardCost ?? 330,
              standardDaysMin: s.shipping.standardDaysMin ?? 5,
              standardDaysMax: s.shipping.standardDaysMax ?? 11,
              freeThreshold: s.shipping.freeThreshold ?? 10000,
            });
          }
          if (s.returnPolicy) {
            setReturnPolicy({
              enabled: s.returnPolicy.enabled !== false,
              windowDays: s.returnPolicy.windowDays ?? 14,
              exchangesAllowed: s.returnPolicy.exchangesAllowed ?? false,
              refundDays: s.returnPolicy.refundDays ?? 5,
              shippingCostPaidBy: s.returnPolicy.shippingCostPaidBy || "customer",
              policyText: s.returnPolicy.policyText || "",
            });
          }
          if (s.appPromo) {
            setAppPromo({
              enabled: s.appPromo.enabled !== false,
              title: s.appPromo.title || "Scan with mobile",
              description: s.appPromo.description || "Download app to enjoy discounts",
              badgeText: s.appPromo.badgeText || "App Exclusive",
            });
          }
          if (s.sellerDefaults) {
            setSellerDefaults({
              rating: s.sellerDefaults.rating ?? 90,
              shipOnTime: s.sellerDefaults.shipOnTime ?? 96,
              chatResponseLabel: s.sellerDefaults.chatResponseLabel || "not enough data",
            });
          }
        }
      } catch (err) { console.error("Failed to load settings:", err); }
    };
    fetchSettings();
  }, []);

  // Fetch breadcrumb
  useEffect(() => {
    if (!productId || productId === "[object Object]") return;
    const fetchBreadcrumb = async () => {
      try {
        const res = await api.get(`/api/products/${productId}/breadcrumb`);
        if (res.data?.success) setBreadcrumb(res.data.breadcrumb);
      } catch (err) { /* silent */ }
    };
    fetchBreadcrumb();
  }, [productId]);

  // Fetch rating stats
  const fetchRatingStats = async () => {
    try {
      const res = await api.get(`/api/feedback/product/${productId}/rating`);
      if (res.data?.success) setRatingStats({ averageRating: res.data.rating || 0, totalReviews: res.data.count || 0 });
    } catch (err) { console.error(err); }
  };

  const fetchRatingDistribution = async () => {
    try {
      const res = await api.get(`/api/feedback/product/${productId}/rating-distribution`);
      if (res.data?.success) setRatingDistribution(res.data.data);
    } catch (err) { console.error(err); }
  };

  // Fetch reviews
  const fetchReviews = async () => {
    try {
      const sortMap = { newest: { sortBy: "createdAt", sortOrder: "desc" }, helpful: { sortBy: "helpful", sortOrder: "desc" }};
      const { sortBy, sortOrder } = sortMap[reviewSort] || sortMap.newest;
      const res = await api.get(`/api/feedback?productId=${productId}&status=active&sortBy=${sortBy}&sortOrder=${sortOrder}&page=${reviewPage}&limit=10`);
      if (res.data?.success && res.data?.feedback) setReviews(res.data.feedback);
    } catch (err) { console.error(err); }
  };

  // Fetch user's own reviews for this product
  const fetchUserReviews = async () => {
    const { userId } = getCurrentUser();
    if (!userId || !productId) return;
    try {
      const res = await api.get(`/api/feedback?productId=${productId}&userId=${userId}`);
      if (res.data?.success && res.data?.feedback) {
        setUserReviews(res.data.feedback);
      }
    } catch (err) { console.error(err); }
  };

  // Check verified-purchase eligibility for the "Write a Review" gate.
  // Only logged-in buyers of a delivered product may review.
  const fetchReviewEligibility = async () => {
    const { token, userId } = getCurrentUser();
    setCanReviewState(null);
    if (!token || !userId || !productId) return;
    try {
      const res = await api.get(`/api/notifications/review-eligibility/${productId}`);
      if (res.data?.success) {
        setCanReviewState(Boolean(res.data.canReview));
      }
    } catch (err) {
      // Not eligible / failed check — treat as cannot review
      setCanReviewState(false);
    }
  };

  const isLoggedIn = Boolean(getCurrentUser().userId);

  useEffect(() => {
    if (productId) {
      fetchRatingStats();
      fetchRatingDistribution();
      fetchReviews();
      fetchUserReviews();
    }
  }, [productId, reviewPage, reviewSort]);

  useEffect(() => {
    loadQuestions(qaPage);
  }, [productId, qaPage]);

  useEffect(() => {
    fetchReviewEligibility();
  }, [productId, isLoggedIn, userReviews.length]);

  // Deep link from a review-reminder notification: auto-open the review form
  useEffect(() => {
    if (!searchParams.get("review")) return;
    const { userId } = getCurrentUser();
    if (userId) setShowReviewModal(true);
    else Swal.fire({ icon: 'info', title: 'Login Required', text: 'Please login to write a review' });
    setSearchParams({}, { replace: true });
  }, [searchParams]);

  // Submit review
  const submitReview = async () => {
    if (!reviewRating || !reviewComment.trim()) {
      await Swal.fire({ icon: 'warning', title: 'Missing Info', text: 'Please provide rating and comment' });
      return;
    }
    setSubmittingReview(true);
    try {
      const { token, user, userId } = getCurrentUser();

      let imageUrls = [];
      if (reviewImages.length > 0) {
        imageUrls = await Promise.all(
          reviewImages.map(file => uploadToMedia(file))
        );
      }

      const res = await api.post(`/api/feedback/submit`, {
        userName: user?.name || user?.fullName || 'Anonymous',
        userEmail: user?.email || '',
        userImage: user?.profileImage || user?.picture || null,
        rating: reviewRating,
        comment: reviewComment,
        productId: productId,
        productName: data?.productName,
        userId: userId,
        attributeRatings,
        images: imageUrls,
      });

      if (res.data.success) {
        await Swal.fire({ icon: 'success', title: 'Thank You!', text: 'Your review has been submitted for moderation' });
        setShowReviewModal(false);
        setReviewRating(0);
        setReviewComment("");
        setAttributeRatings({ shippingSpeed: 0, productQuality: 0, valueForMoney: 0 });
        setReviewImages([]);
        setReviewImagesPreviews([]);
        fetchRatingStats();
        fetchRatingDistribution();
        fetchReviews();
      }
    } catch (err) {
      console.error('Submit review error:', err.response?.data, err);
      await Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Failed to submit review' });
    } finally {
      setSubmittingReview(false);
    }
  };

  // Mark helpful
  const markHelpful = async (reviewId) => {
    try {
      await api.patch(`/api/feedback/${reviewId}/helpful`, {});
      fetchReviews();
    } catch (err) { console.error(err); }
  };

  // Edit review functions
  const openEditModal = (review) => {
    const { userId } = getCurrentUser();
    if (!userId || review.userId?.toString() !== userId?.toString()) {
      Swal.fire({ icon: 'warning', title: 'Cannot Edit', text: 'You can only edit your own reviews' });
      return;
    }
    if (review.status === 'flagged' || review.status === 'removed') {
      Swal.fire({ icon: 'warning', title: 'Cannot Edit', text: 'This review cannot be edited' });
      return;
    }
    setEditingReview(review);
    setEditRating(review.rating);
    setEditComment(review.comment);
    setEditAttributeRatings(review.attributeRatings || { shippingSpeed: 0, productQuality: 0, valueForMoney: 0 });
    setEditImages(review.images || []);
    setShowEditModal(true);
  };

  const updateReview = async () => {
    if (!editRating || !editComment.trim()) {
      await Swal.fire({ icon: 'warning', title: 'Missing Info', text: 'Please provide rating and comment' });
      return;
    }
    setUpdatingReview(true);
    try {
      let finalImages = editingReview.images || [];
      if (editImages.length > 0) {
        const isFile = editImages[0] instanceof File;
        if (isFile) {
          const newUrls = await Promise.all(
            editImages.map(file => uploadToMedia(file))
          );
          finalImages = [...(editingReview.images || []), ...newUrls];
        } else {
          finalImages = editImages;
        }
      }

      const res = await api.put(
        `/api/feedback/${editingReview._id}/edit`,
        {
          rating: editRating,
          comment: editComment,
          attributeRatings: editAttributeRatings,
          images: finalImages,
        }
      );
      if (res.data.success) {
        await Swal.fire({ 
          icon: 'success', 
          title: 'Updated!', 
          text: res.data.message || 'Your review has been submitted for re-approval' 
        });
        setShowEditModal(false);
        setEditingReview(null);
        fetchReviews();
        fetchUserReviews();
        fetchRatingStats();
        fetchRatingDistribution();
      }
    } catch (err) {
      await Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Failed to update review' });
    } finally {
      setUpdatingReview(false);
    }
  };

  const deleteReview = async (reviewId) => {
    const confirm = await Swal.fire({
      title: 'Delete Review?',
      text: 'Are you sure you want to delete this review?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
    });
    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/api/feedback/${reviewId}`);
      await Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Your review has been deleted' });
      fetchReviews();
      fetchUserReviews();
      fetchRatingStats();
      fetchRatingDistribution();
    } catch (err) {
      await Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Failed to delete review' });
    }
  };

  // Handle review image upload
  const handleReviewImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setReviewImagesPreviews([...reviewImagesPreviews, ...newPreviews]);
    setReviewImages([...reviewImages, ...files]);
  };

  // Render stars
  const renderStars = (rating, size = "text-sm") => {
    return (
      <div className="flex items-center gap-0.5">
        {[1,2,3,4,5].map((star) => (
          <FaStar key={star} className={`${size} ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`} />
        ))}
      </div>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(price)
      .replace("LKR", "Rs.");
  };

  const data = product;
  const hasVariants = variants && variants.length > 0;
  const showVariantSelector = hasVariants;
  
  const originalPrice = selectedVariant?.price ?? data?.price ?? 0;
  const currentPrice = selectedVariant?.sellingPrice ?? data?.sellingPrice ?? originalPrice;
  const currentStock = selectedVariant?.stock ?? data?.stock ?? 0;
  const currentSku = selectedVariant?.sku;

  const minVariantPrice = hasVariants && variants.length > 0
    ? Math.min(...variants.map(v => v.sellingPrice || v.price || Infinity))
    : 0;
  
  // Collect all images
  const productImages = data?.images?.filter(img => img?.startsWith('http')) || [];
  
  // When a variant is selected, show ONLY that variant's images + product images
  // When no variant selected, show product images + all variant images for browsing
  const currentImages = selectedVariant?.images?.length > 0
    ? [...new Set([...selectedVariant.images.filter(i => i?.startsWith('http')), ...productImages])]
    : [...new Set([...productImages, ...(hasVariants ? variants.flatMap(v => (v.images || []).filter(i => i?.startsWith('http'))) : [])])];
  
  const isOutOfStock = showVariantSelector && !selectedVariant ? false : currentStock <= 0;
  const hasDiscount = originalPrice > currentPrice;
  const discountPercentage = hasDiscount
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;

  if (loading) {
    return (
      <SkeletonLoader count={5} />
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 shadow-md text-center">
          <FiAlertCircle className="text-5xl text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Product Not Found</h2>
          <p className="text-gray-600 mb-4">{error || "This product doesn't exist"}</p>
          <button
            onClick={() => navigate("/shop")}
            className="bg-brand-600 text-white px-6 py-2 rounded hover:bg-brand-700 transition"
          >
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Main Content */}
      <div className="container mx-auto px-4 max-w-7xl py-4">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 mb-4 flex items-center gap-1 flex-wrap" aria-label="Breadcrumb">
          <a href="/" className="hover:text-brand-600 transition">Home</a>
          {breadcrumb.slice(1).map((crumb, i) => (
            <React.Fragment key={i}>
              <span className="text-gray-300 mx-0.5 select-none">›</span>
              {i < breadcrumb.slice(1).length - 1 && crumb.slug ? (
                <a href={crumb.slug === '/' ? '/' : `/category/${crumb.slug}`} className="hover:text-brand-600 transition">{crumb.name}</a>
              ) : (
                <span className={i < breadcrumb.slice(1).length - 1 ? "hover:text-brand-600 transition" : "text-gray-800 font-medium"}>{crumb.name}</span>
              )}
            </React.Fragment>
          ))}
        </nav>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Left - Image Gallery (Daraz exact layout) */}
            <div className="item-gallery w-full md:w-[500px] lg:w-[540px] p-4" data-spm="gallery">
              {/* Main Image */}
              <div className="gallery-preview-panel relative">
                <div
                  ref={zoomRef}
                  className="gallery-preview-panel__content relative bg-gray-50 rounded-lg overflow-hidden cursor-pointer group"
                  onClick={() => openLightbox(selectedImage)}
                  onMouseEnter={() => !isOutOfStock && setShowZoom(true)}
                  onMouseMove={handleZoomMove}
                  onMouseLeave={() => setShowZoom(false)}
                >
                  {hasDiscount && !isOutOfStock && (
                    <div className="absolute top-3 left-3 z-10 bg-orange-500 text-white px-2.5 py-1 rounded text-sm font-bold">
                      -{discountPercentage}%
                    </div>
                  )}
                  {isOutOfStock && (!showVariantSelector || selectedVariant) && (
                    <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center">
                      <span className="bg-gray-800 text-white px-4 py-2 rounded font-bold text-sm">SOLD OUT</span>
                    </div>
                  )}
                  <div className="group-hover:bg-black/5 transition-all absolute inset-0 z-[1]" />
                  <img
                    src={currentImages[selectedImage] || currentImages[0] || ""}
                    alt={data?.productName || 'Product'}
                    className="pdp-mod-common-image gallery-preview-panel__image w-full h-80 md:h-[450px] object-contain select-none"
                    loading="eager"
                    onError={(e) => { e.target.src = "https://placehold.co/400x400?text=No+Image"; }}
                  />
                  {/* Zoom Lens */}
                  {showZoom && (
                    <div
                      className="absolute inset-0 z-[2] pointer-events-none"
                      style={{
                        background: `radial-gradient(circle ${zoomLensSize/2}px at ${zoomPos.x}% ${zoomPos.y}%, transparent 0px, transparent ${zoomLensSize/2-2}px, rgba(0,0,0,0.1) ${zoomLensSize/2}px)`,
                      }}
                    />
                  )}
                </div>
                {/* Zoom Preview Panel */}
                {showZoom && currentImages[selectedImage || 0] && (
                  <div
                    className="absolute top-0 left-[calc(100%+8px)] w-[320px] h-[320px] border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20 bg-white hidden xl:block"
                    style={{
                      backgroundImage: `url(${currentImages[selectedImage] || currentImages[0]})`,
                      backgroundSize: `${zoomFactor * 100}%`,
                      backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                      backgroundRepeat: 'no-repeat',
                    }}
                  />
                )}
              </div>

              {/* Horizontal Thumbnail Carousel (Daraz-style slider) */}
              {currentImages && currentImages.length > 1 && (
                <div className="next-slick next-slick-outer next-slick-horizontal item-gallery-slider mt-3">
                  <div className="next-slick-inner next-slick-initialized relative" draggable="true">
                    <div className="next-slick-list overflow-hidden mx-[30px]">
                      <div
                        ref={sliderRef}
                        onScroll={handleSliderScroll}
                        className="next-slick-track flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
                      >
                        {currentImages.map((img, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedImage(idx)}
                            className={`next-slick-slide next-slick-active item-gallery__thumbnail flex-shrink-0 w-[52px] h-[52px] rounded overflow-hidden border-2 cursor-pointer transition-all ${
                              idx === selectedImage
                                ? "item-gallery__thumbnail_state_active border-brand-600"
                                : "border-gray-200 hover:border-gray-400"
                            }`}
                          >
                            <div className="item-gallery__image-wrapper w-full h-full">
                              <img
                                src={img}
                                alt=""
                                className="pdp-mod-common-image item-gallery__thumbnail-image w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Prev Arrow */}
                    <div
                      data-role="none"
                      onClick={() => scrollSlider('prev')}
                      className={`next-slick-arrow next-slick-prev outer medium horizontal absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 flex items-center justify-center cursor-pointer rounded-full hover:bg-gray-100 transition ${
                        !canScrollLeft ? 'opacity-30 cursor-default' : ''
                      }`}
                      style={{ display: 'block' }}
                    >
                      <i className="next-icon next-icon-arrow-left next-icon-medium text-gray-500 text-xs">‹</i>
                    </div>
                    {/* Next Arrow */}
                    <div
                      data-role="none"
                      onClick={() => scrollSlider('next')}
                      className="next-slick-arrow next-slick-next outer medium horizontal absolute right-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 flex items-center justify-center cursor-pointer rounded-full hover:bg-gray-100 transition"
                      style={{ display: 'block' }}
                    >
                      <i className="next-icon next-icon-arrow-right next-icon-medium text-gray-500 text-xs">›</i>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Middle - Product Data */}
            <div className="flex-1 min-w-0 p-4 md:p-6 border-l border-gray-100">
              {/* Title + Ghost Share/Wishlist */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <h1 className="text-sm md:text-base font-medium text-gray-900 leading-relaxed flex-1">
                  {data.productName}
                </h1>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => {
                      const productToWishlist = {
                        productId: product.productId,
                        productName: product.productName,
                        price: product.price,
                        sellingPrice: product.sellingPrice,
                        images: product.images,
                        stock: product.stock,
                      };
                      if (isWishlisted) {
                        removeFromWishlistLocal(product.productId);
                      } else {
                        addToWishlistLocal(productToWishlist);
                      }
                      setIsWishlisted(!isWishlisted);
                      window.dispatchEvent(new Event("wishlistUpdate"));
                    }}
                    className={`p-1.5 rounded-full transition hover:bg-gray-100 ${isWishlisted ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'}`}
                    title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    <FiHeart className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isWishlisted ? "fill-current" : ""}`} />
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      Swal.fire({ icon: 'success', title: 'Link Copied!', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
                    }}
                    className="p-1.5 rounded-full transition hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                    title="Share"
                  >
                    <FiShare2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                </div>
              </div>

              {/* Rating + Brand Link */}
              <div className="flex items-center gap-2 mb-1.5">
                {renderStars(Math.round(ratingStats.averageRating || 0), "text-sm")}
                <span className="text-xs text-gray-500">
                  {ratingStats.averageRating.toFixed(1)} ({ratingStats.totalReviews || 0} {ratingStats.totalReviews === 1 ? 'review' : 'reviews'})
                </span>
              </div>
              {data.brand && (
                <div className="mb-2">
                  <a href="#" className="text-[11px] text-gray-500 hover:text-brand-600 transition">
                    Brand: <span className="text-brand-600 font-medium">{data.brand}</span>
                    <span className="text-gray-400 ml-1">| More Shoes & Clothing from {data.brand}</span>
                  </a>
                </div>
              )}

              {/* Price */}
              <div className="mb-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl md:text-2xl font-bold text-gray-900">
                    {showVariantSelector && !selectedVariant
                      ? `From ${formatPrice(minVariantPrice)}`
                      : formatPrice(currentPrice)}
                  </span>
                  {hasDiscount && (
                    <>
                      <span className="text-sm md:text-base text-gray-400 line-through">
                        {formatPrice(originalPrice)}
                      </span>
                      <span className="text-xs font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                        -{discountPercentage}%
                      </span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">Inclusive of all taxes</p>
              </div>

              {/* Installment Info */}
              <p className="text-[11px] text-gray-500 mb-3">
                Installment: Up to 3 months, as low as Rs. {Math.round(currentPrice / 3).toLocaleString('en-LK')}/month
              </p>

              {/* Promotion Badges */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {hasDiscount && (
                  <span className="bg-orange-50 text-orange-600 text-[11px] font-medium px-2 py-0.5 rounded border border-orange-200">
                    🔥 {discountPercentage}% OFF
                  </span>
                )}
                {currentPrice >= shippingSettings.freeThreshold && (
                  <span className="bg-green-50 text-green-600 text-[11px] font-medium px-2 py-0.5 rounded border border-green-200">
                    Free Delivery
                  </span>
                )}
                <span className="bg-blue-50 text-blue-600 text-[11px] font-medium px-2 py-0.5 rounded border border-blue-200">
                  Cash on Delivery
                </span>
              </div>

              {/* Variant Selection */}
              {showVariantSelector && (
                <div className="mb-4 pb-4 border-b border-gray-100">
                  {(() => {
                    const allAttrs = getAvailableAttributes();
                    const attrKeys = Object.keys(allAttrs);
                    
                    return attrKeys.map(attr => (
                      <div key={attr} className="mb-3 last:mb-0">
                        <div className="flex items-center justify-between mb-2">
                          <h6 className="text-xs font-medium text-gray-700 uppercase tracking-wide">{attr}</h6>
                          {attr.toLowerCase() === 'size' && (
                            <span className="text-[11px] text-gray-400">Int</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(allAttrs[attr] || []).map(value => {
                            const isSelected = selectedAttributes[attr] === value;
                            const hasThisVariant = findMatchingVariant({ ...selectedAttributes, [attr]: value });
                            const isAvailable = hasThisVariant && hasThisVariant.stock > 0;
                            
                            return (
                              <button
                                key={value}
                                onClick={() => handleAttributeChange(attr, value)}
                                disabled={!isAvailable}
                                className={`px-3 py-1.5 text-xs border rounded-md transition-all ${
                                  isSelected
                                    ? "border-brand-600 bg-brand-50 text-gray-900 font-semibold"
                                    : isAvailable
                                      ? "border-gray-200 hover:border-gray-400 text-gray-700 bg-white"
                                      : "border-gray-100 text-gray-300 cursor-not-allowed line-through bg-gray-50"
                                }`}
                              >
                                {value}
                                {isSelected && (
                                  <svg className="ml-1 w-3 h-3 inline-block align-middle" viewBox="0 0 1024 1024" fill="#F57224">
                                    <use xlinkHref="#lazadaicon_optionChecked" />
                                  </svg>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}

                  {selectedVariant && (
                    <div className="mt-2.5 p-2.5 bg-gray-50 rounded text-xs border border-gray-100 flex items-center justify-between gap-3">
                      <span className="text-gray-600 font-medium">
                        Selected: {Object.entries(selectedVariant.attributes || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}
                      </span>
                      <span className={`whitespace-nowrap font-semibold ${selectedVariant.stock > 0 ? "text-green-600" : "text-red-500"}`}>
                        Stock Available: {selectedVariant.stock}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Stock Status */}
              {!showVariantSelector && (
                <div className="mb-3">
                  {isOutOfStock ? (
                    <span className="text-red-500 font-medium flex items-center gap-1 text-xs">
                      <FiAlertCircle /> Out of Stock
                    </span>
                  ) : (
                    <span className="text-green-600 font-medium flex items-center gap-1 text-xs">
                      <FiCheckCircle /> In Stock ({currentStock} items)
                    </span>
                  )}
                </div>
              )}

              {/* Quantity + Action Buttons */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-xs font-medium text-gray-700">Quantity:</label>
                  <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 transition text-xs"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-12 text-center border-x border-gray-300 focus:outline-none py-1.5 text-xs"
                    />
                    <button
                      onClick={() => setQuantity(Math.min(
                        showVariantSelector && !selectedVariant ? 1 : currentStock,
                        quantity + 1
                      ))}
                      className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 transition text-xs"
                    >
                      +
                    </button>
                  </div>
                  {showVariantSelector && !selectedVariant && (
                    <span className="text-[11px] text-orange-500 bg-orange-50 px-2 py-0.5 rounded">
                      Select options
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleBuyNow}
                    disabled={isOutOfStock || (showVariantSelector && !selectedVariant)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2.5 px-4 rounded-lg transition text-xs"
                  >
                    Buy Now
                  </button>
                  <button
                    onClick={handleAddToCart}
                    disabled={isOutOfStock || addingToCart || (showVariantSelector && !selectedVariant)}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-medium py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-1.5 text-xs"
                  >
                    <FiShoppingCart className="w-4 h-4" /> Add to Cart
                  </button>
                </div>
              </div>
            </div>

            {/* Right - Contextual Column */}
            <div className="w-full md:w-[300px] lg:w-[320px] border-t md:border-t-0 md:border-l border-gray-100 p-4 space-y-3">
              {/* Delivery Options */}
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-3">
                  <h6 className="text-xs font-medium text-gray-700">Delivery Options</h6>
                  <FiInfo className="w-3 h-3 text-gray-400 cursor-help" title={`Shipping by ${shippingSettings.courierName}`} />
                </div>
                <div className="flex items-center justify-between bg-gray-50 rounded px-2.5 py-2 mb-3 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <FiMapPin className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-500">Delivery to</span>
                    <span className="text-gray-700 font-medium">Western, Colombo 1-15</span>
                  </div>
                  <button className="text-brand-600 font-medium hover:text-brand-700 underline">CHANGE</button>
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-start gap-2.5 p-2 bg-gray-50 rounded cursor-pointer">
                    <input type="radio" name="delivery" defaultChecked className="mt-0.5 accent-brand-600 flex-shrink-0" />
                    <div className="flex items-start gap-2 flex-1">
                      <FiTruck className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-700">{shippingSettings.standardName}</p>
                        <p className="text-[11px] text-gray-500">Guaranteed by {deliveryDates.start.toLocaleDateString('en-LK', { day: 'numeric', month: 'short' })} - {deliveryDates.end.toLocaleDateString('en-LK', { day: 'numeric', month: 'short' })}</p>
                        <p className="text-[11px] font-medium text-gray-700">Rs. {shippingSettings.standardCost}</p>
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-2.5 p-2 rounded cursor-pointer hover:bg-gray-50">
                    <input type="radio" name="delivery" className="mt-0.5 accent-brand-600 flex-shrink-0" />
                    <div className="flex items-start gap-2 flex-1">
                      <FiPackage className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-700">{shippingSettings.standardName} Collection Point</p>
                        <p className="text-[11px] text-gray-500">
                          {deliveryDates.start.toLocaleDateString('en-LK', { day: 'numeric', month: 'short' })} - {deliveryDates.end.toLocaleDateString('en-LK', { day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-[11px] font-medium text-gray-700">Rs. {Math.round(shippingSettings.standardCost * 0.5)}</p>
                      </div>
                    </div>
                  </label>
                  <div className="flex items-center gap-2.5 px-2 py-1.5 text-[11px] text-green-700">
                    <FiCheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Cash on Delivery Available</span>
                  </div>
                </div>
              </div>

              {/* Return & Warranty */}
              {returnPolicy.enabled && (
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <h6 className="text-xs font-medium text-gray-700">Return & Warranty</h6>
                    <FiInfo className="w-3 h-3 text-gray-400 cursor-help" title={returnPolicy.policyText || "Return policy information"} />
                  </div>
                  <div className="space-y-2 text-[11px] text-gray-600">
                    <div className="flex items-start gap-2">
                      <FiRefreshCw className="w-3.5 h-3.5 mt-0.5 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-700">Change of Mind</p>
                        <p className="text-gray-500">{returnPolicy.windowDays} days easy return</p>
                      </div>
                    </div>
                    {returnPolicy.exchangesAllowed && (
                      <div className="flex items-start gap-2">
                        <FiRefreshCw className="w-3.5 h-3.5 mt-0.5 text-gray-500 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-700">Exchange</p>
                          <p className="text-gray-500">Exchange available within {returnPolicy.windowDays} days</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <FiShield className="w-3.5 h-3.5 mt-0.5 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-700">Warranty</p>
                        <p className="text-gray-500">Warranty not available</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* QR Code + App Promo */}
              {appPromo.enabled && (
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="border border-dashed border-gray-300 rounded p-1.5 flex-shrink-0">
                      <QRCodeCanvas value={typeof window !== 'undefined' ? window.location.href : ''} size={65} />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-gray-700">{appPromo.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{appPromo.description}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                          🔥 {appPromo.badgeText}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Seller Block */}
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {data.sellerShopLogo ? (
                      <img src={data.sellerShopLogo} alt={data.sellerShopName || "Seller"} className="w-7 h-7 bg-gray-100 rounded-full object-cover" />
                    ) : data.sellerShopName ? (
                      <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                        <FiUser className="text-gray-500 w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 bg-brand-50 rounded-full flex items-center justify-center">
                        <FiShoppingBag className="text-brand-600 w-3.5 h-3.5" />
                      </div>
                    )}
                    <span className="text-xs text-gray-700">
                      Sold by <span className="text-brand-600 font-medium">{data.sellerShopName || (data.brand && data.brand !== "Unbranded" ? data.brand : "Our Marketplace")}</span>
                    </span>
                  </div>
                  <button
                    onClick={openSellerChat}
                    className="text-[11px] text-brand-600 font-medium hover:text-brand-700 transition-colors flex items-center gap-1"
                  >
                    <FiMessageSquare className="w-3 h-3" />
                    Chat Now
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  <div className="text-center p-1.5 bg-gray-50 rounded">
                    <p className="text-base font-bold text-gray-900">{sellerStats ? sellerStats.rating : Math.round((ratingStats.averageRating / 5) * 100) || sellerDefaults.rating}%</p>
                    <p className="text-[10px] text-gray-500 leading-tight">Seller Ratings</p>
                  </div>
                  <div className="text-center p-1.5 bg-gray-50 rounded">
                    <p className="text-base font-bold text-gray-900">{sellerStats?.shipOnTime ?? sellerDefaults.shipOnTime}%</p>
                    <p className="text-[10px] text-gray-500 leading-tight">Ship on Time</p>
                  </div>
                  <div className="text-center p-1.5 bg-gray-50 rounded">
                    {typeof sellerStats?.chatResponseRate === "number" ? (
                      <p className="text-base font-bold text-gray-900">{sellerStats.chatResponseRate}%</p>
                    ) : (
                      <p className="text-base font-bold text-gray-400">—</p>
                    )}
                    <p className="text-[10px] text-gray-500 leading-tight">Chat Response Rate</p>
                  </div>
                </div>
                {sellerStats?.totalOrders > 0 && (
                  <p className="text-[10px] text-gray-400 text-center mb-1.5">{sellerStats.totalOrders} orders</p>
                )}
                {data.sellerShopName ? (
                  <button
                    onClick={() => navigate(`/store/${encodeURIComponent(data.sellerShopName)}`)}
                    className="w-full text-[11px] border border-brand-600 text-brand-600 font-medium py-1.5 rounded hover:bg-brand-50 transition"
                  >
                    Go To Store
                  </button>
                ) : (
                  <button className="w-full text-[11px] border border-gray-300 text-gray-400 font-medium py-1.5 rounded cursor-not-allowed">
                    Go To Store
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Section */}
        <div className="bg-white rounded-lg shadow-sm mt-4 overflow-hidden p-4 md:p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Product Details</h2>
          <div className="product-description text-sm text-gray-600">
            <div className={`ql-editor-content ${!descExpanded ? 'max-h-80 overflow-hidden relative' : ''}`}>
              <div
                className="ql-editor-content"
                dangerouslySetInnerHTML={{ __html: data.description || '<p>No description available.</p>' }}
              />
              {!descExpanded && (
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
              )}
            </div>
            {data.description && data.description.length > 300 && (
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="text-brand-600 text-xs font-medium mt-2 hover:text-brand-700 transition"
              >
                {descExpanded ? 'View Less' : 'View More'}
              </button>
            )}
            {data.whatsInTheBox && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-start gap-2">
                  <FiPackage className="text-brand-500 mt-0.5 flex-shrink-0 w-4 h-4" />
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">What's in the Box</span>
                    <span className="text-gray-700">{data.whatsInTheBox}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Specifications Section */}
        <div className="bg-white rounded-lg shadow-sm mt-4 overflow-hidden p-4 md:p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Specifications</h2>
          <table className="w-full text-sm">
            <tbody>
              {data.brand && (
                <tr className="border-b">
                  <td className="py-2 font-medium text-gray-700 w-40">Brand</td>
                  <td className="py-2 text-gray-600">{data.brand}</td>
                </tr>
              )}
              <tr className="border-b">
                <td className="py-2 font-medium text-gray-700 w-40">Category</td>
                <td className="py-2 text-gray-600">{data.category}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-medium text-gray-700 w-40">SKU</td>
                <td className="py-2 text-gray-600">{currentSku || data.productId}</td>
              </tr>
              <tr>
                <td className="py-2 font-medium text-gray-700 w-40">Stock</td>
                <td className="py-2 text-gray-600">{currentStock} items</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Ratings & Reviews Section */}
        <div className="bg-white rounded-lg shadow-sm mt-4 overflow-hidden p-4 md:p-6">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span>⭐</span>Customer Reviews
            </h3>
          </div>

          {/* Rating Summary */}
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            <div className="md:w-1/3 text-center md:text-left">
              <div className="text-4xl font-bold text-gray-900">{ratingStats.averageRating.toFixed(1)}</div>
              {renderStars(Math.round(ratingStats.averageRating), "text-lg")}
              <div className="text-sm text-gray-500 mt-1">{ratingStats.totalReviews} Reviews</div>
            </div>
            <div className="md:w-2/3">
              {[5,4,3,2,1].map(star => {
                const count = ratingDistribution[star] || 0;
                const percent = ratingStats.totalReviews > 0 ? Math.round((count / ratingStats.totalReviews) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-gray-600 w-8">{star} ★</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${percent}%` }}></div>
                    </div>
                    <span className="text-xs text-gray-500 w-10">{percent}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* My Reviews Section - Show user's own reviews with status */}
          {userReviews.length > 0 && (
            <div className="mb-6 p-4 bg-brand-50 rounded-lg border border-brand-100">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <span>📝</span> My Reviews for this Product ({userReviews.length})
              </h3>
              <div className="space-y-3">
                {userReviews.map((review) => (
                  <div key={review._id} className={`bg-white p-3 rounded-lg border ${
                    review.status === 'pending' ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          review.status === 'pending' ? 'bg-yellow-400 text-yellow-900 font-semibold' :
                          review.status === 'active' ? 'bg-green-100 text-green-700' :
                          review.status === 'flagged' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {review.status === 'pending' ? '⏳ Pending Review' : review.status?.charAt(0).toUpperCase() + review.status?.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {(review.status === 'pending' || review.status === 'active') && (
                          <>
                            <button
                              onClick={() => openEditModal(review)}
                              className="text-xs flex items-center gap-1 px-2 py-1 bg-brand-100 text-brand-600 rounded hover:bg-brand-200 transition"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => deleteReview(review._id)}
                              className="text-xs flex items-center gap-1 px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
                            >
                              🗑️ Delete
                            </button>
                          </>
                        )}
                        <span className="text-xs text-gray-400">{formatDate(review.createdAt)}</span>
                      </div>
                    </div>
                    <div
                      className="text-sm text-gray-700 mb-2"
                      dangerouslySetInnerHTML={{ __html: review.comment }}
                    />
                    {review.editCount > 0 && (
                      <p className="text-xs text-purple-600 mb-2">📝 Edited {review.editCount} time(s)</p>
                    )}
                    {review.status === 'pending' && (
                      <p className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded inline-block">
                        ⏳ Your review is pending moderation and will be visible after approval.
                      </p>
                    )}
                    {(review.status === 'flagged' || review.status === 'rejected') && (
                      <p className="text-xs text-red-600">This review cannot be edited.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Tabs + Write Review */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-1 flex-wrap">
              {['all', 'withPhotos', '5', '4', '3', '2', '1'].map(filter => (
                <button
                  key={filter}
                  onClick={() => { setReviewFilter(filter); setReviewPage(1); }}
                  className={`px-3 py-1 text-xs rounded-full transition ${
                    reviewFilter === filter
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter === 'withPhotos' ? 'With Photos' : `${filter} Star${filter !== '1' ? 's' : ''}`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={reviewSort}
                onChange={(e) => { setReviewSort(e.target.value); setReviewPage(1); }}
                className="border border-gray-300 rounded px-3 py-1.5 text-xs"
              >
                <option value="newest">Most Recent</option>
                <option value="helpful">Most Helpful</option>
              </select>
              {userReviews.length === 0 && (
                <button
                  onClick={() => {
                    const { userId } = getCurrentUser();
                    if (!userId) {
                      Swal.fire({ icon: 'info', title: 'Login Required', text: 'Please login to write a review' });
                      return;
                    }
                    // Eligible = bought + delivered, and haven't reviewed yet.
                    // Fallback to true while unknown so we never block a valid buyer.
                    if (canReviewState === false) {
                      Swal.fire({
                        icon: 'info',
                        title: 'Purchase Required',
                        text: 'You can only review products you have purchased and received.',
                      });
                      return;
                    }
                    setShowReviewModal(true);
                  }}
                  title={canReviewState === false ? "You must purchase and receive this item to review it" : undefined}
                  className={`px-4 py-1.5 rounded text-xs font-medium transition ${
                    canReviewState === false
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-brand-500 hover:bg-brand-600 text-white"
                  }`}
                >
                  Write a Review
                </button>
              )}
            </div>
          </div>

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FiMessageSquare className="text-4xl mx-auto mb-2 opacity-50" />
              <p>No reviews yet. Be the first to review!</p>
            </div>
          ) : (
            <div className="relative">
              <div className="overflow-hidden">
                <div
                  ref={reviewSliderRef}
                  className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth"
                  onScroll={handleReviewSliderScroll}
                >
                  {reviews.map((review) => (
                    <div
                      key={review._id}
                      className="flex-shrink-0 w-[220px] bg-white p-2 rounded-lg border border-slate-100 hover:shadow-md transition-all duration-200 cursor-pointer relative group"
                      onClick={() => navigate(`/productoverview/${review.product?._id || review.productId}`)}
                    >
                      {(() => {
                        const { userId } = getCurrentUser();
                        const isOwner = userId && review.userId?.toString() === userId?.toString();
                        const canEdit = isOwner && (review.status === 'pending' || review.status === 'active');
                        if (!canEdit) return null;
                        return (
                          <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditModal(review); }}
                              className="w-5 h-5 bg-white/80 rounded flex items-center justify-center text-[10px] hover:bg-white shadow"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteReview(review._id); }}
                              className="w-5 h-5 bg-white/80 rounded flex items-center justify-center text-[10px] hover:bg-white shadow"
                            >
                              🗑️
                            </button>
                          </div>
                        );
                      })()}

                      <img
                        src={review.product?.images?.[0] || ''}
                        alt=""
                        className="w-full h-12 object-cover rounded mb-1 border border-slate-100"
                        loading="lazy"
                      />

                      <div className="flex items-center gap-1 mb-0.5">
                        <div className="flex gap-px">
                          {[1,2,3,4,5].map(s => (
                            <span key={s} className={`text-[10px] ${s <= review.rating ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-500 truncate">{review.user?.name || review.userName}</span>
                      </div>

                      <div
                        className="text-[10px] text-slate-600 line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: review.comment }}
                      />

                      <div className="flex items-center justify-between mt-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); markHelpful(review._id); }}
                          className="flex items-center gap-0.5 text-[9px] text-gray-400 hover:text-brand-600 transition"
                        >
                          <FiThumbsUp className="w-2.5 h-2.5" /> {review.helpful || 0}
                        </button>
                        {review.isVerifiedPurchase && (
                          <span className="text-[8px] text-green-600 font-medium bg-green-50 px-1 py-0.5 rounded">✓ Verified Purchase</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {reviews.length > 2 && reviewCanScrollLeft && (
                <button
                  onClick={() => scrollReviewSlider('prev')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition"
                >
                  <span className="text-sm font-bold text-gray-600">‹</span>
                </button>
              )}
              {reviews.length > 2 && reviewCanScrollRight && (
                <button
                  onClick={() => scrollReviewSlider('next')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition"
                >
                  <span className="text-sm font-bold text-gray-600">›</span>
                </button>
              )}
            </div>
          )}

          {/* Pagination */}
          {ratingStats.totalReviews > 10 && (
            <div className="flex justify-center items-center gap-1 mt-6">
              <button
                onClick={() => setReviewPage(p => Math.max(1, p - 1))}
                disabled={reviewPage === 1}
                className="px-2.5 py-1 border rounded text-xs disabled:opacity-50 hover:bg-gray-100 transition"
              >
                ‹
              </button>
              {Array.from({ length: Math.min(5, Math.ceil(ratingStats.totalReviews / 10)) }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setReviewPage(page)}
                  className={`px-2.5 py-1 border rounded text-xs transition ${
                    reviewPage === page ? 'bg-brand-600 text-white border-brand-600' : 'hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}
              {Math.ceil(ratingStats.totalReviews / 10) > 5 && (
                <>
                  <span className="text-xs text-gray-400">...</span>
                  <button
                    onClick={() => setReviewPage(Math.ceil(ratingStats.totalReviews / 10))}
                    className="px-2.5 py-1 border rounded text-xs hover:bg-gray-100 transition"
                  >
                    {Math.ceil(ratingStats.totalReviews / 10)}
                  </button>
                </>
              )}
              <button
                onClick={() => setReviewPage(p => p + 1)}
                disabled={reviewPage >= Math.ceil(ratingStats.totalReviews / 10)}
                className="px-2.5 py-1 border rounded text-xs disabled:opacity-50 hover:bg-gray-100 transition"
              >
                ›
              </button>
            </div>
          )}
        </div>

        {/* Q&A Section */}
        <div className="bg-white rounded-lg shadow-sm mt-4 overflow-hidden p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">Questions & Answers</h2>
            <button
              onClick={() => {
                const { user } = getCurrentUser();
                if (!user?.email) {
                  Swal.fire({ icon: 'info', title: 'Login Required', text: 'Please login to ask a question' });
                  return;
                }
                setShowQaModal(true);
              }}
              className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition"
            >
              Ask a Question
            </button>
          </div>

          {qaLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8">
              <FiMessageSquare className="text-4xl text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-4">No questions yet. Be the first to ask!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q) => {
                const { user } = getCurrentUser();
                const isSellerOrAdmin = user?.role === "seller" || user?.role === "admin";
                return (
                  <div key={q._id} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      {q.user?.profileImage ? (
                        <img src={q.user.profileImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold">
                          {(q.user?.name || "U")[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">{q.user?.name || "Anonymous"}</span>
                          <span className="text-xs text-gray-400">{new Date(q.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-700">{q.question}</p>
                      </div>
                    </div>

                    {/* Answers */}
                    {q.answers?.length > 0 && (
                      <div className="ml-11 mt-3 space-y-2">
                        {q.answers.map((a, idx) => (
                          <div key={idx} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              {a.user?.profileImage ? (
                                <img src={a.user.profileImage} alt="" className="w-5 h-5 rounded-full object-cover" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-[10px] font-bold">
                                  {(a.user?.name || "A")[0]}
                                </div>
                              )}
                              <span className="text-xs font-medium text-gray-700">
                                {a.user?.name || "Staff"}
                                {a.user?.role === "admin" && <span className="text-brand-500 ml-1">(Admin)</span>}
                                {a.user?.role === "seller" && <span className="text-blue-500 ml-1">(Seller)</span>}
                              </span>
                              <span className="text-[10px] text-gray-400">{new Date(a.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-gray-600">{a.answer}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline Answer Form */}
                    {isSellerOrAdmin && (
                      <div className="ml-11 mt-2">
                        {answeringQuestionId === q._id ? (
                          <div className="mt-2">
                            <textarea
                              value={answerText}
                              onChange={(e) => setAnswerText(e.target.value)}
                              placeholder="Write your answer..."
                              className="w-full text-sm border border-gray-200 rounded-lg p-2 focus:outline-none focus:border-brand-500 resize-none"
                              rows={2}
                            />
                            <div className="flex gap-2 mt-1">
                              <button
                                onClick={() => submitAnswer(q._id)}
                                disabled={!answerText.trim()}
                                className="bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white px-3 py-1 rounded text-xs font-medium transition"
                              >
                                Submit
                              </button>
                              <button
                                onClick={() => { setAnsweringQuestionId(null); setAnswerText(""); }}
                                className="text-gray-500 hover:text-gray-700 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAnsweringQuestionId(q._id)}
                            className="text-brand-500 hover:text-brand-600 text-xs font-medium mt-1"
                          >
                            Answer
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {qaTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setQaPage(p => Math.max(1, p - 1))}
                disabled={qaPage === 1}
                className="px-2 py-1 text-xs border rounded disabled:opacity-50 hover:bg-gray-100"
              >
                ‹
              </button>
              <span className="text-xs text-gray-500">Page {qaPage} of {qaTotalPages}</span>
              <button
                onClick={() => setQaPage(p => p + 1)}
                disabled={qaPage >= qaTotalPages}
                className="px-2 py-1 text-xs border rounded disabled:opacity-50 hover:bg-gray-100"
              >
                ›
              </button>
            </div>
          )}
        </div>

        {/* Ask Question Modal */}
        {showQaModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowQaModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-lg max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Ask a Question</h3>
                  <button onClick={() => setShowQaModal(false)} className="text-gray-400 hover:text-gray-600">
                    <FiX className="text-2xl" />
                  </button>
                </div>
                <textarea
                  value={questionText}
                  onChange={(e) => { setQuestionText(e.target.value); setEmptyQuestionError(false); }}
                  placeholder="Type your question about this product..."
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-brand-500 resize-none"
                  rows={4}
                />
                {emptyQuestionError && <p className="mt-2 text-xs text-red-600">Please type your question first.</p>}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowQaModal(false)}
                    className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={askQuestion}
                    disabled={submittingQuestion}
                    className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white py-2 rounded-lg text-sm font-medium transition"
                  >
                    {submittingQuestion ? 'Submitting...' : 'Submit Question'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Recommendations */}
        <ProductRecommendations currentProductId={productId} limit={6} />
      </div>

      {/* Lightbox Modal */}
      {showLightbox && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full"
          >
            <FiX className="text-2xl" />
          </button>

          {currentImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                className="absolute left-4 text-white p-3 hover:bg-white/20 rounded-full"
              >
                <FiArrowLeft className="text-2xl" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                className="absolute right-4 text-white p-3 hover:bg-white/20 rounded-full"
              >
                <FiArrowLeft className="text-2xl rotate-180" />
              </button>
            </>
          )}

          <motion.img
            key={lightboxIndex}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src={currentImages[lightboxIndex]}
            alt={`${data.productName} - ${lightboxIndex + 1}`}
            className="max-w-full max-h-[80vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
            {lightboxIndex + 1} / {currentImages.length}
          </div>
        </motion.div>
      )}

      {/* Review Image Lightbox */}
      {reviewLightboxOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setReviewLightboxOpen(false)}
        >
          <button
            onClick={() => setReviewLightboxOpen(false)}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full z-10"
          >
            <FiX className="text-2xl" />
          </button>

          {reviewLightboxImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevReviewImage(); }}
                className="absolute left-4 text-white p-3 hover:bg-white/20 rounded-full z-10"
              >
                <FiArrowLeft className="text-2xl" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextReviewImage(); }}
                className="absolute right-4 text-white p-3 hover:bg-white/20 rounded-full z-10"
              >
                <FiArrowLeft className="text-2xl rotate-180" />
              </button>
            </>
          )}

          <motion.img
            key={reviewLightboxIndex}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src={reviewLightboxImages[reviewLightboxIndex]}
            alt={`Review image ${reviewLightboxIndex + 1}`}
            className="max-w-full max-h-[80vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
            {reviewLightboxIndex + 1} / {reviewLightboxImages.length}
          </div>
        </motion.div>
      )}

      {/* Write Review Modal */}
      {showReviewModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowReviewModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900">Write a Review</h3>
                <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600">
                  <FiX className="text-2xl" />
                </button>
              </div>

              {/* Rating */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Rating *</label>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="text-2xl transition"
                    >
                      <FaStar className={star <= reviewRating ? 'text-yellow-400' : 'text-gray-300'} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">What do you like most? *</label>
                <div style={{ marginBottom: 0 }}>
                  <QuillEditor
                    value={reviewComment}
                    onChange={setReviewComment}
                    placeholder="Write your review here..."
                  />
                </div>
              </div>

              {/* Attribute Ratings */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">Rate these (optional)</label>
                <div className="space-y-2">
                  {[
                    { key: 'shippingSpeed', label: '🚚 Shipping Speed' },
                    { key: 'productQuality', label: '⭐ Product Quality' },
                    { key: 'valueForMoney', label: '💰 Value for Money' }
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{label}</span>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setAttributeRatings(prev => ({ ...prev, [key]: star }))}
                          >
                            <FaStar className={`text-sm ${star <= (attributeRatings[key] || 0) ? 'text-yellow-400' : 'text-gray-300'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Image Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Photos (optional)</label>
                <div className="flex flex-wrap gap-2">
                  {reviewImagesPreviews.map((preview, idx) => (
                    <div key={idx} className="relative">
                      <img src={preview} alt="" className="w-16 h-16 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => {
                          const newPreviews = reviewImagesPreviews.filter((_, i) => i !== idx);
                          const newImages = reviewImages.filter((_, i) => i !== idx);
                          setReviewImagesPreviews(newPreviews);
                          setReviewImages(newImages);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <label className="w-16 h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-blue-500">
                    <input type="file" multiple accept="image/*" onChange={handleReviewImageUpload} className="hidden" />
                    <FiPlus className="text-gray-400" />
                  </label>
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReview}
                  disabled={submittingReview || !reviewRating || !reviewComment.trim()}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white py-2 rounded-lg font-medium transition"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Edit Review Modal */}
      {showEditModal && editingReview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowEditModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900">Edit Your Review</h3>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                  <FiX className="text-2xl" />
                </button>
              </div>

              {/* Status Badge */}
              {editingReview.status && (
                <div className="mb-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    editingReview.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    editingReview.status === 'active' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    Status: {editingReview.status.charAt(0).toUpperCase() + editingReview.status.slice(1)}
                  </span>
                </div>
              )}

              {/* Rating */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Rating *</label>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditRating(star)}
                      className="text-2xl transition"
                    >
                      <FaStar className={star <= editRating ? 'text-yellow-400' : 'text-gray-300'} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Review *</label>
                <div style={{ marginBottom: 0 }}>
                  <QuillEditor
                    value={editComment}
                    onChange={setEditComment}
                    placeholder="Write your review here..."
                  />
                </div>
              </div>

              {/* Attribute Ratings */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">Rate these (optional)</label>
                <div className="space-y-2">
                  {[
                    { key: 'shippingSpeed', label: '🚚 Shipping Speed' },
                    { key: 'productQuality', label: '⭐ Product Quality' },
                    { key: 'valueForMoney', label: '💰 Value for Money' }
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{label}</span>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setEditAttributeRatings(prev => ({ ...prev, [key]: star }))}
                          >
                            <FaStar className={`text-sm ${star <= (editAttributeRatings[key] || 0) ? 'text-yellow-400' : 'text-gray-300'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={updateReview}
                  disabled={updatingReview || !editRating || !editComment.trim()}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white py-2 rounded-lg font-medium transition"
                >
                  {updatingReview ? 'Updating...' : 'Update Review'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Live buyer<->seller chat drawer ("Chat Now") */}
      {sellerChatOpen && product?.seller?._id && (
        <SellerChatPanel
          key={String(product.seller._id)}
          sellerUserId={product.seller._id}
          shopName={data.sellerShopName || data.brand || "Store"}
          shopLogo={data.sellerShopLogo || null}
          productName={data.productName || data.slug}
          onClose={() => setSellerChatOpen(false)}
        />
      )}
    </div>
  );
}




