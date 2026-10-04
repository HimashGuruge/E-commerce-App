import api from "@/utils/api";
import { AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  ImageOff,
  Loader2,
  MessageCircle,
  RefreshCw,
  ThumbsUp,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const RightSideReviews = ({ onClose, refreshTrigger = 0 }) => {
  const [userFeedback, setUserFeedback] = useState({});
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const [error, setError] = useState(null);
  const [expandedReviews, setExpandedReviews] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  // Track which feedbacks the current user has liked
  const [likedFeedbacks, setLikedFeedbacks] = useState(() => {
    const saved = localStorage.getItem("likedFeedbacks");
    return saved ? JSON.parse(saved) : [];
  });

  // Save liked feedbacks to localStorage when updated
  useEffect(() => {
    localStorage.setItem("likedFeedbacks", JSON.stringify(likedFeedbacks));
  }, [likedFeedbacks]);

  // ⭐ Memoized star rendering
  const renderStars = useCallback((rating) => {
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-2.5 h-2.5 ${
              i < rating ? "text-yellow-400 fill-yellow-400" : "text-slate-300"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  }, []);

  // 📅 Format date
  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }, []);

  // 🔗 Handle product click navigation
  const handleProductClick = (productId) => {
    if (productId && productId !== "unknown") {
      navigate(`/shop/productoverview/${productId}`);
      if (onClose) onClose();
    }
  };

  // 🗂️ Group feedbacks by product
  const groupFeedbacksByProduct = useCallback((feedbackList) => {
    const unique = feedbackList.filter(
      (fb, index, self) => index === self.findIndex((f) => f._id === fb._id),
    );
    unique.sort((a, b) => new Date(b.date) - new Date(a.date));

    return unique.reduce((acc, fb) => {
      const productId = fb.productId || "unknown";
      if (!acc[productId]) {
        acc[productId] = {
          productId,
          productName: fb.productName,
          productImage: fb.productImage,
          productPrice: fb.productPrice,
          reviews: [],
        };
      }
      acc[productId].reviews.push({
        _id: fb._id,
        userName: fb.userName,
        userImage: fb.userImage,
        rating: fb.rating,
        comment: fb.comment,
        date: fb.date,
        helpful: fb.helpful,
        verified: fb.verified,
      });
      return acc;
    }, {});
  }, []);

  // 🔄 Fetch feedback - Only show 'active' reviews
  const fetchUserFeedback = useCallback(() => {
    setLoadingFeedback(true);
    setError(null);

    // ✅ Only fetch 'active' reviews (pending ones won't show)
    const apiUrl = `/api/feedback?status=active&limit=20&sort=-createdAt`;

    api
      .get(apiUrl)
      .then((feedbackResponse) => {
        const feedbackData = Array.isArray(feedbackResponse.data)
          ? feedbackResponse.data
          : feedbackResponse.data.feedback || feedbackResponse.data.data || [];

        if (feedbackData.length === 0) {
          setUserFeedback({});
          setLoadingFeedback(false);
          setRefreshing(false);
          return;
        }

        // ✅ STEP 1: Process data with HIGH PRIORITY on direct fields
        const formattedFeedback = feedbackData.map((fb) => {
          const userDetails = fb.user || {};
          const productDetails = fb.product || {};

          return {
            _id: fb._id,
            productId: fb.productId,
            userId: fb.userId,
            userName: fb.userName || userDetails.name || "Anonymous",
            userImage:
              fb.userImage ||
              userDetails.image ||
              userDetails.profileImage ||
              null,
            productImage:
              fb.productImage ||
              productDetails.images?.[0] ||
              null,
            productName:
              fb.productName ||
              productDetails.productName ||
              productDetails.name ||
              "Unknown Product",
            productPrice: fb.productPrice || productDetails.price || null,
            rating: fb.rating || 5,
            comment: fb.comment || fb.review || "",
            date: fb.createdAt || new Date().toISOString(),
            helpful: fb.helpful || 0,
            verified: fb.verified || false,
          };
        });

        // ✅ STEP 2: Check for missing product images and fetch them separately
        const missingProductIds = formattedFeedback
          .filter(
            (fb) =>
              !fb.productImage && fb.productId && fb.productId !== "unknown",
          )
          .map((fb) => fb.productId);

        if (missingProductIds.length > 0) {
          const productsUrl = `/api/products/by-ids?ids=${[...new Set(missingProductIds)].join(",")}`;

          api
            .get(productsUrl)
            .then((productsResponse) => {
              let products = [];
              if (
                productsResponse.data?.products &&
                Array.isArray(productsResponse.data.products)
              ) {
                products = productsResponse.data.products;
              } else if (
                productsResponse.data?.data &&
                Array.isArray(productsResponse.data.data)
              ) {
                products = productsResponse.data.data;
              } else if (Array.isArray(productsResponse.data)) {
                products = productsResponse.data;
              }

              const productsMap = new Map();
              products.forEach((product) => {
                const pid = product.productId || product._id;
                productsMap.set(pid, {
                  image: product.images?.[0] || product.image || null,
                  name: product.productName || product.name,
                  price: product.price,
                });
              });

              const updatedFeedback = formattedFeedback.map((fb) => {
                const extra = productsMap.get(fb.productId);
                if (extra) {
                  return {
                    ...fb,
                    productImage: fb.productImage || extra.image,
                    productName: fb.productName || extra.name,
                    productPrice: fb.productPrice || extra.price,
                  };
                }
                return fb;
              });

              const grouped = groupFeedbacksByProduct(updatedFeedback);
              setUserFeedback(grouped);
            })
            .catch((err) => {
              console.warn(
                "Could not fetch extra product details, using existing data",
                err,
              );
              const grouped = groupFeedbacksByProduct(formattedFeedback);
              setUserFeedback(grouped);
            })
            .finally(() => {
              setLoadingFeedback(false);
              setRefreshing(false);
            });
        } else {
          const grouped = groupFeedbacksByProduct(formattedFeedback);
          setUserFeedback(grouped);
          setLoadingFeedback(false);
          setRefreshing(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching feedback:", err);
        setError("Unable to load reviews. Please try again later.");
        setUserFeedback({});
        setLoadingFeedback(false);
        setRefreshing(false);
      });
  }, [groupFeedbacksByProduct]);

  useEffect(() => {
    fetchUserFeedback();
  }, [fetchUserFeedback, refreshTrigger]);

  // ❤️ Handle like/unlike toggle
  const handleHelpfulToggle = useCallback(
    async (feedbackId) => {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in to respond to reviews.");
        return;
      }

      const isCurrentlyLiked = likedFeedbacks.includes(feedbackId);

      if (isCurrentlyLiked) {
        // Optimistic UI Update (Decrease count immediately)
        setUserFeedback((prev) => {
          const updated = { ...prev };
          Object.keys(updated).forEach((pid) => {
            updated[pid].reviews = updated[pid].reviews.map((r) =>
              r._id === feedbackId
                ? { ...r, helpful: Math.max(0, (r.helpful || 0) - 1) }
                : r,
            );
          });
          return updated;
        });
        setLikedFeedbacks((prev) => prev.filter((id) => id !== feedbackId));

        try {
          await api.delete(
            `/api/feedback/${feedbackId}/helpful`
          );
        } catch (error) {
          // Revert on error
          setUserFeedback((prev) => {
            const updated = { ...prev };
            Object.keys(updated).forEach((pid) => {
              updated[pid].reviews = updated[pid].reviews.map((r) =>
                r._id === feedbackId
                  ? { ...r, helpful: (r.helpful || 0) + 1 }
                  : r,
              );
            });
            return updated;
          });
          setLikedFeedbacks((prev) => [...prev, feedbackId]);
        }
      } else {
        // Optimistic UI Update (Increase count immediately)
        setUserFeedback((prev) => {
          const updated = { ...prev };
          Object.keys(updated).forEach((pid) => {
            updated[pid].reviews = updated[pid].reviews.map((r) =>
              r._id === feedbackId
                ? { ...r, helpful: (r.helpful || 0) + 1 }
                : r,
            );
          });
          return updated;
        });
        setLikedFeedbacks((prev) => [...prev, feedbackId]);

        try {
          await api.patch(
            `/api/feedback/${feedbackId}/helpful`,
            {}
          );
        } catch (error) {
          // Revert on error
          setUserFeedback((prev) => {
            const updated = { ...prev };
            Object.keys(updated).forEach((pid) => {
              updated[pid].reviews = updated[pid].reviews.map((r) =>
                r._id === feedbackId
                  ? { ...r, helpful: Math.max(0, (r.helpful || 0) - 1) }
                  : r,
              );
            });
            return updated;
          });
          setLikedFeedbacks((prev) => prev.filter((id) => id !== feedbackId));
        }
      }
    },
    [likedFeedbacks],
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUserFeedback();
  };

  const toggleReviewExpand = (reviewId) => {
    setExpandedReviews((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  };

  // 📊 Calculate statistics
  const stats = useMemo(() => {
    const allReviews = Object.values(userFeedback).flatMap((g) => g.reviews);
    if (allReviews.length === 0) return null;

    const totalRatings = allReviews.reduce((sum, fb) => sum + fb.rating, 0);
    const averageRating = (totalRatings / allReviews.length).toFixed(1);
    const ratingDistribution = {
      5: allReviews.filter((fb) => fb.rating === 5).length,
      4: allReviews.filter((fb) => fb.rating === 4).length,
      3: allReviews.filter((fb) => fb.rating === 3).length,
      2: allReviews.filter((fb) => fb.rating === 2).length,
      1: allReviews.filter((fb) => fb.rating === 1).length,
    };

    return {
      total: allReviews.length,
      averageRating,
      ratingDistribution,
      verifiedCount: allReviews.filter((fb) => fb.verified).length,
    };
  }, [userFeedback]);

  // ⏳ Loading State
  if (loadingFeedback) {
    return (
      <div className="w-96 bg-white border-l border-slate-100 h-full flex flex-col">
        <div className="p-6 flex flex-col items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-green-500 animate-spin mb-3" />
          <p className="text-xs text-slate-400">Loading reviews...</p>
        </div>
      </div>
    );
  }

  // ❌ Error State
  if (error) {
    return (
      <div className="w-96 bg-white border-l border-slate-100 h-full flex flex-col">
        <div className="p-6 flex flex-col items-center justify-center h-full">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
            <MessageCircle size={20} className="text-red-400" />
          </div>
          <p className="text-xs text-red-500 text-center">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-3 px-3 py-1 bg-slate-100 text-xs rounded-lg hover:bg-slate-200 transition flex items-center gap-1"
          >
            <RefreshCw size={12} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  // ✅ Main UI - Grouped Reviews
  return (
    <div className="w-96 bg-white border-l border-slate-100 h-full flex flex-col overflow-hidden">
      <div className="p-6 flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-10 pb-2">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-green-500" />
            <h3 className="text-lg font-black uppercase tracking-wider text-slate-900">
              Customer Reviews
            </h3>
            {stats && (
              <span className="text-[10px] font-bold text-white bg-green-500 px-2 py-0.5 rounded-full">
                {stats.averageRating} ★
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`p-1.5 rounded-lg transition-colors ${
                refreshing
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
              title="Refresh Reviews"
            >
              <RefreshCw
                size={14}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Stats Summary */}
        {stats && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {stats.averageRating}
                </div>
                <div className="text-[10px] text-slate-500">out of 5</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-slate-900">
                  {stats.total}
                </div>
                <div className="text-[10px] text-slate-500">reviews</div>
              </div>
            </div>
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.ratingDistribution[star];
                const percentage =
                  stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-600 w-6">
                      {star}★
                    </span>
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 w-8">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Reviews State */}
        {Object.keys(userFeedback).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <MessageCircle size={24} className="text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 font-medium">No reviews yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Be the first to share your experience
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 custom-scrollbar">
            {Object.values(userFeedback).map((productGroup, idx) => (
              <motion.div
                key={productGroup.productId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="mb-2 last:mb-0"
              >
                {/* 📦 Product Header */}
                <div
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-100 mb-2 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleProductClick(productGroup.productId)}
                >
                  <div className="flex-shrink-0">
                    {productGroup.productImage ? (
                      <img
                        src={productGroup.productImage}
                        alt={productGroup.productName}
                        className="w-14 h-14 rounded-lg object-cover border border-slate-200"
                        onError={(e) => {
                          e.target.src =
                            "https://placehold.co/56?text=No+Image";
                        }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center">
                        <ImageOff size={20} className="text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {productGroup.productName}
                    </h4>
                    {productGroup.productPrice && (
                      <p className="text-xs font-black text-green-600">
                        LKR {productGroup.productPrice.toLocaleString()}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400">
                      {productGroup.reviews.length} review
                      {productGroup.reviews.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-0.5">
                      {renderStars(
                        productGroup.reviews.reduce(
                          (sum, r) => sum + r.rating,
                          0,
                        ) / productGroup.reviews.length,
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {(
                        productGroup.reviews.reduce(
                          (sum, r) => sum + r.rating,
                          0,
                        ) / productGroup.reviews.length
                      ).toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* ⭐ Reviews List */}
                <div className="space-y-2 pl-2 border-l-2 border-slate-100 ml-7">
                  <AnimatePresence>
                    {productGroup.reviews.map((review) => {
                      const isLiked = likedFeedbacks.includes(review._id);
                      return (
                        <motion.div
                          key={review._id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          className="bg-white rounded-lg p-3 border border-slate-100 hover:shadow-sm transition-all duration-300"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {review.userImage ? (
                              <img
                                src={review.userImage}
                                alt={review.userName}
                                className="w-6 h-6 rounded-full object-cover"
                                onError={(e) => {
                                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(review.userName)}&size=24&background=random`;
                                }}
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                                <User size={12} className="text-slate-500" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-1">
                                <p className="text-[10px] font-bold text-slate-800">
                                  {review.userName}
                                </p>
                                {review.verified && (
                                  <span className="text-[8px] bg-green-100 text-green-600 px-1 rounded-full">
                                    ✓
                                  </span>
                                )}
                                {new Date(review.date) >
                                  new Date(
                                    Date.now() - 24 * 60 * 60 * 1000,
                                  ) && (
                                  <span className="text-[8px] bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded-full font-black">
                                    NEW
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {renderStars(review.rating)}
                              </div>
                            </div>
                          </div>
                          {review.comment && (
                            <div className="mb-2">
                              <div
                                className={`text-[10px] text-slate-600 leading-relaxed ${
                                  !expandedReviews[review._id]
                                    ? "line-clamp-2"
                                    : ""
                                }`}
                                dangerouslySetInnerHTML={{ __html: review.comment }}
                              />
                              {review.comment.length > 100 && (
                                <button
                                  onClick={() => toggleReviewExpand(review._id)}
                                  className="text-[8px] text-brand-500 hover:text-brand-600 mt-1 flex items-center gap-0.5"
                                >
                                  {expandedReviews[review._id] ? (
                                    <>
                                      Show less <ChevronUp size={10} />
                                    </>
                                  ) : (
                                    <>
                                      Read more <ChevronDown size={10} />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleHelpfulToggle(review._id);
                              }}
                              className={`flex items-center gap-1 transition-all duration-200 ${
                                isLiked
                                  ? "text-green-600 hover:text-red-500"
                                  : "text-slate-400 hover:text-green-600"
                              }`}
                            >
                              <ThumbsUp
                                size={10}
                                className={`transition-all duration-200 ${isLiked ? "fill-green-600" : ""}`}
                              />
                              <span className="text-[8px] font-bold">
                                {review.helpful}
                              </span>
                            </button>
                            <div className="flex items-center gap-1">
                              <Calendar size={8} className="text-slate-400" />
                              <p className="text-[7px] text-slate-400">
                                {formatDate(review.date)}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default RightSideReviews;
