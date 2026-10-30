import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/utils/api";
import {
  Loader2,
  ArrowLeft,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Filter,
} from "lucide-react";
import Card from "@/components/product/Card";
import ProductRecommendations from "@/components/home/ProductRecommendations";
import LeftSideFilter from "@/components/product/LeftSideFilter";
import RightSideAds from "@/components/home/RightSideAds.jsx";

export default function CategoryPage() {
  const { slug } = useParams();

  // Debug: Check if component mounts and slug is available
  console.log("[CategoryPage] Component mounted with slug:", slug);
  console.log("[CategoryPage] Current URL:", window.location.href);

  // State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [currentCategoryName, setCurrentCategoryName] = useState("");

  // Homepage-style filter state
  const [filters, setFilters] = useState({
    priceRange: [0, 0],
    categories: [],
    sortBy: "newest",
    minRating: 0,
    inStock: false,
    readyToShip: false,
  });
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState(null);

  // 2. New state for currentProductId
  const [recommendationProductId, setRecommendationProductId] = useState(null);

  // Dynamic category ads state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [adsData, setAdsData] = useState([]);

  const nextSlide = () =>
    setCurrentSlide((prev) => (prev === adsData.length - 1 ? 0 : prev + 1));

  const prevSlide = () =>
    setCurrentSlide((prev) => (prev === 0 ? adsData.length - 1 : prev - 1));

  // Auto-slide logic
  useEffect(() => {
    if (adsData && adsData.length > 1) {
      const timer = setInterval(nextSlide, 6000);
      return () => clearInterval(timer);
    }
  }, [adsData.length]);

  // Filter and sort (homepage logic)
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Price
    if (filters.priceRange[1] > 0) {
      filtered = filtered.filter(
        (product) =>
          product.price >= filters.priceRange[0] &&
          product.price <= filters.priceRange[1],
      );
    }

    // Min rating
    if (filters.minRating > 0) {
      filtered = filtered.filter(
        (product) =>
          (product.rating ?? product.averageRating ?? 0) >= filters.minRating,
      );
    }

    // In stock
    if (filters.inStock) {
      filtered = filtered.filter(
        (product) => (product.stock ?? product.quantity ?? 0) > 0,
      );
    }

    // Ready to ship
    if (filters.readyToShip) {
      filtered = filtered.filter((product) => product.status === "ready");
    }

    // Sort
    switch (filters.sortBy) {
      case "price-low":
        return [...filtered].sort((a, b) => a.price - b.price);
      case "price-high":
        return [...filtered].sort((a, b) => b.price - a.price);
      case "rating":
        return [...filtered].sort(
          (a, b) =>
            (b.rating ?? b.averageRating ?? 0) -
            (a.rating ?? a.averageRating ?? 0),
        );
      case "newest":
      default:
        return [...filtered].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
    }
  }, [products, filters]);

  const ratingCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    filteredProducts.forEach((p) => {
      const r = p.rating ?? p.averageRating ?? 0;
      for (let i = 1; i <= 5; i++) {
        if (r >= i) counts[i]++;
      }
    });
    return counts;
  }, [filteredProducts]);

  const hasActiveFilters =
    filters.priceRange[1] > 0 ||
    filters.minRating > 0 ||
    filters.inStock ||
    filters.readyToShip ||
    filters.sortBy !== "newest";

  const resetFilters = () =>
    setFilters({
      priceRange: [0, 0],
      categories: [],
      sortBy: "newest",
      minRating: 0,
      inStock: false,
      readyToShip: false,
    });

  // Set recommendation for first product
  useEffect(() => {
    if (filteredProducts.length > 0) {
      // Get first product ID
      const firstProduct = filteredProducts[0];
      setRecommendationProductId(firstProduct.productId || firstProduct._id);
    } else {
      setRecommendationProductId(null);
    }
  }, [filteredProducts]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!slug) {
        console.log("[CategoryPage] No slug provided");
        return;
      }

      try {
        setFetchError(null);
        setLoading(true);
        console.log("[CategoryPage] Fetching data for slug:", slug);

        const [res1, res2, res3] = await Promise.all([
          api.get(`/api/products/category/${slug}`),
          api.get(`/api/ads?category=${slug}`),
          api.get(`/api/categories`),
        ]);

        console.log("[CategoryPage] API Responses:", {
          products: res1.data,
          ads: res2.data,
          categories: res3.data,
        });

        // Normalize Products
        let fetchedProducts = [];
        if (res1.data?.success && res1.data.products) {
          fetchedProducts = res1.data.products;
        } else if (res1.data?.data && Array.isArray(res1.data.data)) {
          fetchedProducts = res1.data.data;
        } else if (Array.isArray(res1.data)) {
          fetchedProducts = res1.data;
        }

        // Normalize Ads
        let fetchedAds = [];
        if (res2.data?.success && res2.data.ads) {
          fetchedAds = res2.data.ads;
        } else if (res2.data?.data && Array.isArray(res2.data.data)) {
          fetchedAds = res2.data.data;
        } else if (Array.isArray(res2.data)) {
          fetchedAds = res2.data;
        }

        // Normalize Categories
        let fetchedCategories = [];
        if (res3.data?.success && res3.data.categories) {
          fetchedCategories = res3.data.categories;
        } else if (res3.data?.data && Array.isArray(res3.data.data)) {
          fetchedCategories = res3.data.data;
        } else if (Array.isArray(res3.data)) {
          fetchedCategories = res3.data;
        }

        setProducts(fetchedProducts);
        setAdsData(fetchedAds);
        setCategories(fetchedCategories);

        // Find current category name
        const currentCategory = fetchedCategories.find((cat) => {
          if (cat.slug) {
            return cat.slug === slug;
          }
          const categorySlug = cat.name.toLowerCase().replace(/\s+/g, "-");
          return categorySlug === slug;
        });

        if (currentCategory) {
          setCurrentCategoryName(currentCategory.name);
          setCurrentCategoryId(currentCategory._id || null);
        } else {
          setCurrentCategoryId(null);
        }
      } catch (error) {
        console.error("[CategoryPage] Error fetching data:", error);
        setFetchError("Unable to load products. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  // Reset filters when slug changes
  useEffect(() => {
    resetFilters();
    setCurrentCategoryId(null);
    setRecommendationProductId(null);
  }, [slug]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-slate-900 animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
          Loading Collection
        </p>
      </div>
    );
  }

  // Error State
  if (fetchError) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
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
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-colors rounded-lg"
        >
          <RefreshCw size={14} /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Dynamic Banner Section */}
      <section className="relative h-[400px] md:h-[550px] overflow-hidden bg-slate-900">
        {adsData && adsData.length > 0 ? (
          adsData.map((ad, index) => (
            <div
              key={ad._id || index}
              className={`absolute inset-0 transition-all duration-1000 ease-in-out transform ${
                index === currentSlide
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-110"
              }`}
            >
              {ad.mediaType === "video" ? (
                <video
                  src={ad.videoUrl}
                  className="w-full h-full object-cover opacity-60"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={ad.imageUrl}
                  className="w-full h-full object-cover opacity-60"
                  alt={ad.title}
                />
              )}
            </div>
          ))
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center" />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-white" />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/80 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft size={14} /> Back to Home
          </Link>

          <span className="text-brand-400 text-[10px] font-black uppercase tracking-[0.5em] mb-4">
            {adsData[currentSlide]?.title ||
              currentCategoryName ||
              "Premium Selection"}
          </span>

          <h1 className="text-6xl md:text-9xl font-black text-white tracking-tighter uppercase leading-[0.8]">
            {currentCategoryName ||
              (slug ? slug.replace(/-/g, " ") : "Collection")}
          </h1>
        </div>

        {adsData && adsData.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all z-20"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all z-20"
            >
              <ChevronRight size={24} />
            </button>

            <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-2 z-20">
              {adsData.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 transition-all duration-300 rounded-full ${
                    i === currentSlide ? "w-8 bg-brand-500" : "w-2 bg-white/30"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Mobile Filter Bar */}
      <div className="lg:hidden w-full border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-30">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-wider hover:bg-slate-800 active:scale-[0.98] transition-all rounded-full"
            >
              <Filter size={16} />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-brand-500 rounded-full" />
              )}
            </button>
            <p className="text-sm text-slate-500">
              {filteredProducts.length} products
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Homepage-style 3 columns */}
      <div className="w-full">
        <div className="flex flex-col lg:flex-row">
          {/* Left Sidebar Filter */}
          <div className="hidden lg:block lg:w-80 flex-shrink-0 border-r border-slate-100 sticky top-20 self-start">
            <LeftSideFilter
              filters={filters}
              setFilters={setFilters}
              categories={categories}
              ratingCounts={ratingCounts}
              currentCategoryId={currentCategoryId}
            />
          </div>

          {/* Mobile Filter Overlay */}
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
                  currentCategoryId={currentCategoryId}
                  onClose={() => setIsMobileFilterOpen(false)}
                />
              </div>
            </>
          )}

          {/* Product Grid Section */}
          <main className="flex-1 w-full min-w-0 bg-white px-4 py-16">
            {/* Results Count for Mobile */}
            <div className="lg:hidden mb-6">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Showing {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "Item" : "Items"}
              </p>
            </div>

            {/* Products Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
                {filteredProducts.map((product) => (
                  <Card key={product._id} {...product} />
                ))}
              </div>
            ) : (
              <div className="py-32 text-center border-2 border-dashed border-slate-100 rounded-[3rem]">
                <LayoutGrid className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <h3 className="text-slate-900 font-black uppercase tracking-widest mb-2">
                  No Items Found
                </h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">
                  No products match your filters.
                </p>
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-colors rounded-lg"
                >
                  <RefreshCw size={14} /> Reset Filters
                </button>
              </div>
            )}

            {/* Product Recommendations Section */}
            {recommendationProductId && (
              <div className="mt-16 pt-16 border-t border-slate-100">
                <ProductRecommendations
                  currentProductId={recommendationProductId}
                  limit={8}
                />
              </div>
            )}
          </main>

          {/* Right Sidebar - Ads */}
          <div className="hidden lg:block w-80 flex-shrink-0 border-l border-slate-100 bg-white sticky top-20 self-start">
            <RightSideAds limit={3} />
          </div>
        </div>
      </div>

      <div className="h-32" />
    </div>
  );
}
