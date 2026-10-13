import React, { useState, useEffect } from "react";
import api from "@/utils/api";
import { useNavigate } from "react-router-dom";

const CATEGORY_COLORS = ["blue", "pink", "green", "purple", "amber", "red", "indigo", "teal"];

const getCategoryIcon = (name) => {
  const n = name.toLowerCase();
  if (n.includes("elect")) return "📱";
  if (n.includes("cloth") || n.includes("fashion")) return "👕";
  if (n.includes("beauty") || n.includes("cosmetic")) return "💄";
  if (n.includes("sport")) return "⚽";
  if (n.includes("book")) return "📚";
  if (n.includes("toy")) return "🧸";
  if (n.includes("furniture")) return "🪑";
  if (n.includes("home")) return "🏠";
  return "📦";
};

const getTrendIcon = (name) => {
  const n = name.toLowerCase();
  if (n.includes("iphone") || n.includes("phone") || n.includes("mobile")) return "📱";
  if (n.includes("airpod") || n.includes("head") || n.includes("ear")) return "🎧";
  if (n.includes("watch") || n.includes("smart")) return "⌚";
  if (n.includes("laptop") || n.includes("mac") || n.includes("computer")) return "💻";
  if (n.includes("speaker") || n.includes("audio") || n.includes("sound")) return "🔊";
  if (n.includes("cam") || n.includes("photo") || n.includes("camera")) return "📷";
  if (n.includes("tab") || n.includes("ipad")) return "🖥️";
  if (n.includes("shoe") || n.includes("sneaker")) return "👟";
  if (n.includes("bag") || n.includes("purse")) return "👜";
  if (n.includes("skin") || n.includes("serum")) return "✨";
  return "🔥";
};

const SectionHeader = ({ title, icon }) => (
  <div className="mb-2">
    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
      {icon && <span>{icon}</span>}
      {title}
    </h3>
  </div>
);

const ReviewCard = ({ review, onProductClick }) => {
  const userName = review.user?.name || review.userName || "Anonymous";
  const rating = Number(review.rating || 0);
  const comment = review.comment || "";
  const productName = review.product?.productName || review.product?.name || review.productName || "Product";
  const productId = review.product?._id || review.product?.productId || review.productId || null;
  const productImage = review.product?.images?.[0] || review.productImage || null;

  return (
    <div className="flex items-start gap-2 px-2 py-2 border-b border-slate-50 last:border-b-0 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => productId && onProductClick(productId)}>
      <div className="w-8 h-8 shrink-0 rounded border border-slate-100 overflow-hidden bg-slate-100 flex items-center justify-center text-xs text-slate-400">
        {productImage ? (
          <img src={productImage} alt={productName} className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.target.style.display = "none"; }} />
        ) : "📦"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-medium text-slate-800 truncate">{productName}</div>
        <div className="flex items-center gap-1">
          <div className="flex gap-px">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className={`text-[9px] ${star <= rating ? "text-yellow-400" : "text-gray-200"}`}>★</span>
            ))}
          </div>
          <span className="text-[9px] text-slate-400 whitespace-nowrap">by {userName}</span>
        </div>
        <div className="text-[10px] text-slate-600 leading-tight line-clamp-1" dangerouslySetInnerHTML={{ __html: comment }} />
      </div>
    </div>
  );
};

const RightSideAds = () => {
  const [categories, setCategories] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [trending, setTrending] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/api/categories");
        const cats = res.data?.categories || res.data || [];
        setCategories(cats.slice(0, 8).map((c, i) => ({
          name: c.name,
          slug: c.slug || c.name.toLowerCase().replace(/\s+/g, "-"),
          icon: getCategoryIcon(c.name),
          color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
        })));
      } catch (err) {
        console.error("Failed to fetch categories:", err);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchReviews = async () => {
      try {
        const res = await api.get("/api/feedback?status=approved&limit=6");
        const data = res.data?.feedback || res.data?.data || [];
        setReviews(data);
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    };

    const fetchTrending = async () => {
      try {
        const res = await api.get("/api/trending");
        const items = res.data?.trending || [];
        setTrending(items);
      } catch (err) {
        console.error("Failed to fetch trending:", err);
        setTrending([]);
      } finally {
        setTrendingLoading(false);
      }
    };

    fetchData();
    fetchReviews();
    fetchTrending();
  }, []);

  const handleProductClick = (productId) => {
    if (productId) {
      navigate(`/shop/productoverview/${productId}`);
    }
  };

  if (loading) {
    return (
      <div className="p-3 space-y-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-32 mb-3"></div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-16 bg-slate-100 rounded-lg"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-3 space-y-5">
      {/* Customer Reviews */}
      {reviewsLoading ? (
        <div>
          <SectionHeader title="Customer Reviews" icon="⭐" />
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-2 rounded-lg border border-slate-100 animate-pulse">
                <div className="h-12 bg-slate-100 rounded mb-1"></div>
                <div className="h-3 bg-slate-200 rounded w-full mb-1"></div>
                <div className="h-3 bg-slate-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      ) : reviews.length > 0 ? (
        <div>
          <SectionHeader title="Customer Reviews" icon="⭐" />
          <div className="overflow-hidden rounded-lg border border-slate-100 group">
            <div className="flex items-center px-2 py-1.5 bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
              <div className="w-8 shrink-0" />
              <span className="flex-1">Item</span>
              <span className="flex-1">Review</span>
            </div>
            <div className="h-[168px] overflow-hidden">
              <div className="scroll-feed">
                {[...reviews, ...reviews].map((review, i) => (
                  <ReviewCard
                    key={`${review._id}-${i}`}
                    review={review}
                    onProductClick={handleProductClick}
                  />
                ))}
              </div>
            </div>
          </div>
          <style>{`
            .scroll-feed {
              animation: scroll-down ${reviews.length * 6}s linear infinite;
            }
            .group:hover .scroll-feed {
              animation-play-state: paused;
            }
            @keyframes scroll-down {
              0% { transform: translateY(-50%); }
              100% { transform: translateY(0); }
            }
          `}</style>
        </div>
      ) : null}

      {/* Shop by Category */}
      <div>
        <SectionHeader title="Shop by Category" icon="📦" />
        <div className="grid grid-cols-4 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => navigate(`/shop/category/${cat.slug}`)}
              className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-100 transition-all duration-200 group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{cat.icon}</span>
              <span className="text-[10px] text-slate-600 text-center font-medium leading-tight group-hover:text-brand-600 transition-colors">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Trending Now */}
      <div>
        <SectionHeader title="Trending Now" icon="🔥" />
        {trendingLoading ? (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-7 w-20 bg-slate-100 rounded-full animate-pulse"></div>
            ))}
          </div>
        ) : trending.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {trending.map((item) => (
              <button
                key={item._id}
                onClick={() => navigate(`/shop?search=${encodeURIComponent(item.name)}`)}
                className="text-xs px-3 py-1.5 bg-white hover:bg-brand-500 text-slate-600 hover:text-white rounded-full transition-all duration-200 font-medium shadow-sm border border-slate-100 flex items-center gap-1"
              >
                <span>{item.icon || getTrendIcon(item.name)}</span>
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {["iPhone", "AirPods", "Smart Watch", "Laptop", "Headphones", "Speaker"].map((term) => (
              <button
                key={term}
                onClick={() => navigate(`/shop?search=${encodeURIComponent(term)}`)}
                className="text-xs px-3 py-1.5 bg-white hover:bg-brand-500 text-slate-600 hover:text-white rounded-full transition-all duration-200 font-medium shadow-sm border border-slate-100 flex items-center gap-1"
              >
                <span>{getTrendIcon(term)}</span>
                <span>{term}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RightSideAds;