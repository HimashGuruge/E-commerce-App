import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { motion } from "framer-motion";
import api from "@/utils/api";
import { Link } from "react-router-dom";

import {
  Loader2,
  Sparkles,
  Shield,
  Truck,
  Star,
  Zap,
  Gift,
  Award,
  Clock,
  SlidersHorizontal,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";
import Card from "@/components/product/Card.jsx";

import HomeContainCards from "@/components/home/HomeInfomationsCard.jsx";
import LeftSideFilter from "@/components/product/LeftSideFilter";
import RightSideAds from "@/components/home/RightSideAds.jsx";
import HomeBannerSlider from "@/components/home/HomeBannerSlider.jsx";
import FlashSale from "@/components/home/FlashSale.jsx";
// 1. Remove this import
// import ProductRecommendations from "@/components/ProductRecommendations";

// ==================== CATEGORIES - LAZADA STYLE ====================
const CategoryGrid = ({ categories }) => {
  if (!categories || categories.length === 0) return null;

  return (
    <section className="bg-white py-6 md:py-8 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 mb-4 md:mb-6">
          <Sparkles className="text-brand-500" size={18} />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Shop by Category
          </h2>
        </div>
        <div className="flex flex-row flex-nowrap gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
          {categories.map((cat) => (
            <Link
              key={cat._id || cat.id}
              to={`/shop/category/${cat.slug || cat.name?.toLowerCase().replace(/\s+/g, "-")}`}
              className="flex-shrink-0 snap-start group w-24 md:w-28"
            >
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-slate-50 flex items-center justify-center p-1 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300 border border-slate-100 group-hover:border-brand-200">
                <picture className="w-full h-full">
                  <source
                    srcSet={cat.image?.replace(/\.(jpg|jpeg|png)$/i, '.avif')}
                    type="image/avif"
                  />
                  <source
                    srcSet={cat.image || "https://img.lazcdn.com/static/lk/p/default-category.jpg"}
                    type="image/webp"
                  />
                  <img
                    src={cat.image || "https://img.lazcdn.com/static/lk/p/default-category.jpg"}
                    alt={cat.name}
                    className="w-full h-full object-cover rounded-xl"
                    loading="lazy"
                  />
                </picture>
              </div>
              <div className="text-center mt-2 px-1">
                <span className="text-sm md:text-base font-semibold text-slate-700 group-hover:text-brand-600 transition-colors truncate block w-full">
                  {cat.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

// ==================== PREMIUM FEATURES ====================
const ICON_MAP = {
  Shield, Truck, Zap, Gift, Award, Clock,
};

const COLOR_MAP = {
  blue: { bg: "bg-blue-50", icon: "bg-blue-600", hover: "hover:bg-blue-100 hover:border-blue-100", text: "group-hover:text-blue-700" },
  green: { bg: "bg-emerald-50", icon: "bg-emerald-600", hover: "hover:bg-emerald-100 hover:border-emerald-100", text: "group-hover:text-emerald-700" },
  amber: { bg: "bg-amber-50", icon: "bg-amber-600", hover: "hover:bg-amber-100 hover:border-amber-100", text: "group-hover:text-amber-700" },
  pink: { bg: "bg-pink-50", icon: "bg-pink-600", hover: "hover:bg-pink-100 hover:border-pink-100", text: "group-hover:text-pink-700" },
  purple: { bg: "bg-purple-50", icon: "bg-purple-600", hover: "hover:bg-purple-100 hover:border-purple-100", text: "group-hover:text-purple-700" },
  slate: { bg: "bg-slate-50", icon: "bg-slate-600", hover: "hover:bg-slate-100 hover:border-slate-100", text: "group-hover:text-slate-700" },
};

const PremiumFeatures = ({ features = [] }) => {
  if (!features || features.length === 0) return null;

  return (
    <div className="py-12 bg-white border-b border-slate-100 w-full">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {features.map((feature, index) => {
            const colors = COLOR_MAP[feature.color] || COLOR_MAP.blue;
            const IconComp = ICON_MAP[feature.iconName] || Shield;
            return (
              <div
                key={feature._id || index}
                className={`flex flex-col items-center p-5 rounded-2xl ${colors.bg} hover:shadow-lg transition-all duration-300 border border-transparent ${colors.hover} group`}
              >
                <div className={`w-14 h-14 rounded-xl ${colors.icon} flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <IconComp className="w-6 h-6 text-white" />
                </div>
                <h3 className={`font-bold text-slate-900 text-xs uppercase tracking-wide ${colors.text}`}>
                  {feature.title}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-1 text-center">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ==================== PRODUCT CARD ====================
const ProductCard = ({ product, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
    >
      <Card
        productId={product.productId}
        productName={product.productName}
        price={product.price}
        sellingPrice={product.sellingPrice || product.price}
        images={product.images}
        stock={product.stock}
        rating={product.rating || 0}
        reviewCount={product.numReviews || product.totalReviews || 0}
        isVariantParent={product.isVariantParent}
        variants={product.variants}
      />
    </motion.div>
  );
};

const ANNOUNCEMENT_ICONS = { Sparkles, Star, Zap, Gift, Award, Clock, Shield, Truck };

const IconByName = ({ name, size, className }) => {
  const IconComp = ANNOUNCEMENT_ICONS[name];
  if (!IconComp) return <Sparkles size={size} className={className} />;
  return <IconComp size={size} className={className} />;
};

// ==================== MAIN CONTAINER ====================
export default function HomeContainer() {
  const [allProducts, setAllProducts] = useState([]);
  const [adsData, setAdsData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [features, setFeatures] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementSettings, setAnnouncementSettings] = useState({
    speed: 12,
    bgColor: "#F85606",
    textColor: "#ffffff",
  });
  const [visibleCount, setVisibleCount] = useState(12);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [partialError, setPartialError] = useState(null);
  const observerTarget = useRef(null);

  const [filters, setFilters] = useState({
    priceRange: [0, 0],
    categories: [],
    sortBy: "newest",
    minRating: 0,
    inStock: false,
  });
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Category ID to Name Map
  const categoryIdToNameMap = useMemo(() => {
    const map = new Map();
    categories.forEach((cat) => {
      map.set(cat._id, cat.name);
      if (cat.id) map.set(cat.id, cat.name);
    });
    return map;
  }, [categories]);

  // Filter and Sort Products
  const filterAndSortProducts = useCallback(
    (products, currentFilters) => {
      let filtered = [...products];

      const hasPriceFilter = currentFilters.priceRange[1] > 0;
      if (hasPriceFilter) {
        filtered = filtered.filter(
          (product) =>
            product.sellingPrice >= currentFilters.priceRange[0] &&
            product.sellingPrice <= currentFilters.priceRange[1],
        );
      }

      if (currentFilters.categories.length > 0) {
        const selectedCategoryIds = currentFilters.categories;

        if (selectedCategoryIds.length > 0) {
          filtered = filtered.filter((product) => {
            if (!product.category) return false;
            const catId = typeof product.category === "object"
              ? product.category._id || product.category
              : product.category;
            return selectedCategoryIds.includes(catId);
          });
        }
      }

      if (currentFilters.minRating > 0) {
        filtered = filtered.filter(
          (product) => (product.rating ?? product.averageRating ?? 0) >= currentFilters.minRating,
        );
      }

      if (currentFilters.inStock) {
        filtered = filtered.filter(
          (product) => (product.stock ?? product.quantity ?? 0) > 0,
        );
      }

      const priceField = "sellingPrice";
      switch (currentFilters.sortBy) {
        case "price-low":
          return [...filtered].sort((a, b) => a[priceField] - b[priceField]);
        case "price-high":
          return [...filtered].sort((a, b) => b[priceField] - a[priceField]);
        case "rating":
          return [...filtered].sort((a, b) => (b.rating ?? b.averageRating ?? 0) - (a.rating ?? a.averageRating ?? 0));
        case "newest":
        default:
          return [...filtered].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
          );
      }
    },
    [categoryIdToNameMap],
  );

  const filteredProducts = useMemo(() => {
    if (allProducts.length === 0) return [];
    return filterAndSortProducts(allProducts, filters);
  }, [allProducts, filters, filterAndSortProducts]);

  useEffect(() => {
    setVisibleCount(12);
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    let count = filters.categories.length;
    if (filters.priceRange[1] > 0) count++;
    if (filters.minRating > 0) count++;
    if (filters.inStock) count++;
    if (filters.sortBy !== "newest") count++;
    return count;
  }, [filters.priceRange[1], filters.categories.length, filters.minRating, filters.inStock, filters.sortBy]);

  const ratingCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    filteredProducts.forEach((p) => {
      const r = p.rating ?? 0;
      for (let i = 1; i <= 5; i++) {
        if (r >= i) counts[i]++;
      }
    });
    return counts;
  }, [filteredProducts]);

  const fetchData = async () => {
    setLoading(true);
    setFetchError(null);
    setPartialError(null);

    try {
      const results = await Promise.allSettled([
        api.get(`/api/products?includeAll=true`),
        api.get(`/api/ads?category=home`),
        api.get(`/api/categories`),
        api.get(`/api/features`),
        api.get(`/api/announcements?active=true`),
      ]);

      if (results[0].status === "fulfilled") {
        let products = results[0].value.data?.products || results[0].value.data?.data || [];

        try {
          const ids = products.map((p) => p._id).filter(Boolean).join(",");
          if (ids) {
            const ratingRes = await api.get(`/api/products/ratings-overview?productIds=${ids}`);
            if (ratingRes.data?.success) {
              const ratingData = ratingRes.data.data;
              products = products.map((p) => ({
                ...p,
                rating: ratingData[p._id]?.avg || 0,
                numReviews: ratingData[p._id]?.total || 0,
              }));
            }
          }
        } catch (_e) {}

        setAllProducts(products);
      } else {
        setFetchError("Failed to load products. Please refresh the page.");
      }

      if (results[1].status === "fulfilled") {
        const ads = results[1].value.data?.ads || results[1].value.data?.data || [];
        setAdsData(ads);
      } else {
        setPartialError("Ads failed to load");
      }

      if (results[2].status === "fulfilled") {
        const categoriesData = results[2].value.data?.categories || results[2].value.data?.data || [];
        setCategories(categoriesData);
      } else {
        setPartialError((prev) =>
          prev ? `${prev}, categories failed` : "Categories failed to load",
        );
      }

      if (results[3].status === "fulfilled") {
        const featuresData = results[3].value.data?.features || [];
        setFeatures(featuresData);
      } else {
        setPartialError((prev) =>
          prev ? `${prev}, features failed` : "Features failed to load",
        );
      }

      if (results[4].status === "fulfilled") {
        const announcementsData = results[4].value.data?.announcements || [];
        setAnnouncements(announcementsData);
      }
    } catch (_err) {
      setFetchError("Unable to load data. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      const s = e.detail;
      if (s?.announcement) {
        setAnnouncementSettings({
          speed: s.announcement.speed ?? 12,
          bgColor: s.announcement.bgColor || "#F85606",
          textColor: s.announcement.textColor || "#ffffff",
        });
      }
    };
    window.addEventListener("settingsUpdated", handler);
    return () => window.removeEventListener("settingsUpdated", handler);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          filteredProducts.length > visibleCount &&
          !isLoadingMore
        ) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setVisibleCount((prev) =>
              Math.min(prev + 8, filteredProducts.length),
            );
            setIsLoadingMore(false);
          }, 300);
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
      observer.disconnect();
    };
  }, [filteredProducts.length, visibleCount, isLoadingMore]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-slate-900 animate-spin mb-4" />
          <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-brand-500 animate-pulse" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
          Initializing Storefront
        </span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7 text-red-500" />
        </div>
        <h3 className="text-base font-black uppercase tracking-wider text-slate-900 mb-2">
          Error Loading
        </h3>
        <p className="text-slate-500 text-center mb-6 text-sm max-w-xs">
          {fetchError}
        </p>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-colors rounded-lg"
        >
          <RefreshCw size={14} /> Try Again
        </button>
      </div>
    );
  }

  return (
      <div className="w-full bg-white leading-none">
      {partialError && (
        <div className="bg-yellow-50 border-b border-yellow-200 py-2 px-4 text-center leading-normal">
          <p className="text-xs text-yellow-700">
            ⚠️ {partialError} - Some features may be limited
          </p>
        </div>
      )}

      <div className="w-full leading-[0] text-[0]">
        <HomeBannerSlider ads={adsData} />
      </div>

      {announcements.length > 0 && (
        <div
          className="overflow-hidden leading-normal relative"
          style={{ backgroundColor: announcementSettings.bgColor }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.08)_50%,transparent_100%)]"></div>
          <style>{`
            @keyframes announce-scroll {
              0% { transform: translateX(100vw); }
              100% { transform: translateX(-100%); }
            }
            .announce-track {
              animation: announce-scroll ${announcementSettings.speed}s linear infinite;
            }
            .announce-track:hover {
              animation-play-state: paused;
            }
          `}</style>
          <div className="relative w-full overflow-hidden py-2">
            <div className="announce-track flex w-max whitespace-nowrap">
              <div className="flex shrink-0 items-center gap-12 px-8">
                {announcements
                  .filter((a) => a.status === "active")
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  .map((item) => (
                    <span key={item._id} className="flex items-center gap-2.5 shrink-0 text-lg font-semibold" style={{ color: announcementSettings.textColor }}>
                      <IconByName name={item.icon} size={15} className="shrink-0" style={{ color: announcementSettings.textColor, opacity: 0.7 }} />
                      {item.text}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <PremiumFeatures features={features} />

      <CategoryGrid categories={categories} />

      <FlashSale limit={8} title="On Sale Now" />

      <div className="w-full bg-white">
          <div className="lg:hidden w-full border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-30">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-wider hover:bg-slate-800 active:scale-[0.98] transition-all rounded-full"
              >
                <SlidersHorizontal size={16} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 bg-brand-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
                    <p className="text-sm text-slate-500">
                {filteredProducts.length} products
              </p>
            </div>
          </div>
        </div>

        <div className="w-full">
          <div className="flex flex-col lg:flex-row">
            <div className="hidden lg:block lg:w-80 flex-shrink-0 border-r border-slate-100 sticky top-20 self-start">
              <LeftSideFilter
                filters={filters}
                setFilters={setFilters}
                categories={categories}
                ratingCounts={ratingCounts}
              />
            </div>

            {isMobileFilterOpen && (
              <>
                <div
                  className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                  onClick={() => setIsMobileFilterOpen(false)}
                />
                <div className="fixed top-0 left-0 h-full w-80 bg-white z-50 shadow-2xl transform transition-transform duration-300 lg:hidden overflow-y-auto">
                  <LeftSideFilter
                    filters={filters}
                    setFilters={setFilters}
                    categories={categories}
                    ratingCounts={ratingCounts}
                    onClose={() => setIsMobileFilterOpen(false)}
                  />
                </div>
              </>
            )}

            <div className="flex-1 w-full min-w-0 bg-white">
              <div className="px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                <main>
                  <header className="text-center mb-6 lg:mb-8">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-slate-50 text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mb-3 border border-slate-100">
                      Handpicked Styles
                    </div>
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
                      All Products
                    </h2>
              <p className="text-sm text-slate-500">
                      {filteredProducts.length} products found
                    </p>
                  </header>

                  {/* Products Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
                    {filteredProducts
                      .slice(0, visibleCount)
                      .map((product, index) => (
                        <ProductCard
                          key={product.productId || product._id || index}
                          product={product}
                          index={index}
                        />
                      ))}
                  </div>

                  {/* No Products Found */}
                  {filteredProducts.length === 0 && !loading && (
                    <div className="text-center py-12 lg:py-20">
                      <p className="text-slate-400 text-sm uppercase tracking-wider">
                        No products match your filters
                      </p>
                      <button
                        onClick={() =>
                          setFilters({
                            priceRange: [0, 0],
                            categories: [],
                            sortBy: "newest",
                            minRating: 0,
                            inStock: false,
                          })
                        }
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <RefreshCw size={14} /> Reset Filters
                      </button>
                    </div>
                  )}

                  {/* Infinite Scroll Loader */}
                  <div
                    ref={observerTarget}
                    className="h-16 lg:h-20 w-full flex flex-col items-center justify-center mt-8 lg:mt-12"
                  >
                    {isLoadingMore && (
                      <Loader2 className="w-5 h-5 lg:w-6 lg:h-6 text-slate-300 animate-spin" />
                    )}
                    {filteredProducts.length > 0 &&
                      filteredProducts.length <= visibleCount && (
                        <p className="text-xs text-slate-400 uppercase tracking-wider">
                          End of Results
                        </p>
                      )}
                  </div>
                </main>
              </div>
            </div>

             {/* Right Sidebar - 3rd column */}
            <div className="hidden lg:block w-80 flex-shrink-0 border-l border-slate-100 bg-white sticky top-20 self-start">
              <RightSideAds limit={3} />
            </div>
          </div>
        </div>
      </div>

      <HomeContainCards />
    </div>
  );
}
