import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/utils/api";
import {
  Loader2,
  ArrowLeft,
  LayoutGrid,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Filter,
  X,
} from "lucide-react";
import Card from "@/components/product/Card";
import ProductRecommendations from "@/components/home/ProductRecommendations";

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

  // Filter states
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState("newest");
  const [isPriceFilterActive, setIsPriceFilterActive] = useState(false);
  const [appliedPriceRange, setAppliedPriceRange] = useState({
    min: 0,
    max: 0,
  });

  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

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

  // Filter and Sort Function
  const filterAndSortProducts = (products, priceMin, priceMax, sortType) => {
    let filtered = [...products];

    // Apply price filter only if max price is greater than 0
    if (priceMax > 0) {
      filtered = filtered.filter(
        (product) => product.price >= priceMin && product.price <= priceMax,
      );
    }

    // Sort
    switch (sortType) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "newest":
      default:
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    return filtered;
  };

  // Apply filters when dependencies change
  useEffect(() => {
    if (products.length > 0) {
      const filtered = filterAndSortProducts(
        products,
        appliedPriceRange.min,
        appliedPriceRange.max,
        sortBy,
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [products, appliedPriceRange, sortBy]);

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

  // Apply price filter
  const applyPriceFilter = () => {
    const min =
      priceRange.min === "" ? 0 : Math.max(0, parseInt(priceRange.min) || 0);
    const max =
      priceRange.max === "" ? 0 : Math.max(0, parseInt(priceRange.max) || 0);

    const validMin = Math.min(min, max);
    const validMax = Math.max(min, max);

    setAppliedPriceRange({ min: validMin, max: validMax });
    setIsPriceFilterActive(validMax > 0);
  };

  // Clear price filter
  const clearPriceFilter = () => {
    setPriceRange({ min: "", max: "" });
    setAppliedPriceRange({ min: 0, max: 0 });
    setIsPriceFilterActive(false);
  };

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
    setPriceRange({ min: "", max: "" });
    setSortBy("newest");
    setAppliedPriceRange({ min: 0, max: 0 });
    setIsPriceFilterActive(false);
    setRecommendationProductId(null); // ✅ Reset recommendation too
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

      {/* Sort Header - Sort and Mobile Filter */}
      <div className="sticky top-[0px] z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 py-4">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          {/* Mobile Filter Button */}
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-full"
          >
            <Filter size={14} />
            Filters
          </button>

          {/* Spacer for mobile */}
          <div className="lg:hidden flex-1" />

          {/* Sort Dropdown */}
          <div className="relative group">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-white pl-4 pr-10 py-2 text-[10px] font-black uppercase tracking-widest border border-slate-200 rounded-full focus:outline-none focus:border-slate-900 cursor-pointer transition-all"
            >
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
            <ChevronDown
              size={12}
              className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Main Content with Left Sidebar Filter */}
      <div className="w-full">
        <div className="flex flex-col lg:flex-row">
          {/* Left Sidebar Filter Section */}
          <div className="hidden lg:block lg:w-80 flex-shrink-0 border-r border-slate-100 min-h-screen sticky top-[73px] self-start bg-white">
            <div className="p-6">
              {/* Filter Header */}
              <div className="flex items-center gap-2 mb-6">
                <Filter size={16} className="text-slate-700" />
                <h3 className="text-lg font-black uppercase tracking-wider text-slate-900">
                  Filters
                </h3>
              </div>

              {/* Price Range Section */}
              <div className="mb-6 border-b border-slate-100 pb-6">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3">
                  Price Range (LKR)
                </h4>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="number"
                        placeholder="Min"
                        value={priceRange.min}
                        onChange={(e) =>
                          setPriceRange({ ...priceRange, min: e.target.value })
                        }
                        className="w-full p-2 border border-slate-200 text-sm rounded-lg outline-none focus:border-slate-900 transition-all"
                        min="0"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        placeholder="Max"
                        value={priceRange.max}
                        onChange={(e) =>
                          setPriceRange({ ...priceRange, max: e.target.value })
                        }
                        className="w-full p-2 border border-slate-200 text-sm rounded-lg outline-none focus:border-slate-900 transition-all"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={applyPriceFilter}
                      className="flex-1 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase rounded-lg hover:bg-slate-800 active:scale-[0.95] transition-all"
                    >
                      Apply
                    </button>
                    {isPriceFilterActive && (
                      <button
                        onClick={clearPriceFilter}
                        className="px-4 border border-slate-200 text-xs font-bold rounded-lg hover:bg-slate-50 transition-all"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Status Indicator */}
                  {!isPriceFilterActive && (
                    <p className="text-[10px] text-brand-600 font-bold text-center bg-brand-50 py-2 rounded-md border border-brand-100">
                      Showing All Prices
                    </p>
                  )}
                </div>
              </div>

              {/* Results Count in Sidebar */}
              <div className="pt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Results
                </p>
                <p className="text-2xl font-black text-slate-900">
                  {filteredProducts.length}
                </p>
                <p className="text-xs text-slate-500">
                  {filteredProducts.length === 1 ? "Item" : "Items"} available
                </p>
              </div>

              {/* Active Filters Summary */}
              {isPriceFilterActive && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Active Filters
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-xs rounded-md">
                      <span className="font-bold">Price:</span>
                      {appliedPriceRange.min} - {appliedPriceRange.max}
                      <button
                        onClick={clearPriceFilter}
                        className="ml-1 hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Filter Overlay */}
          {isMobileFilterOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setIsMobileFilterOpen(false)}
              />
              <div className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white z-50 shadow-2xl lg:hidden overflow-y-auto">
                <div className="p-6">
                  {/* Mobile Filter Header */}
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                      <Filter size={16} className="text-slate-700" />
                      <h3 className="text-lg font-black uppercase tracking-wider text-slate-900">
                        Filters
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsMobileFilterOpen(false)}
                      className="p-2 hover:bg-slate-100 rounded-full"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Price Range Section - Mobile */}
                  <div className="mb-6 border-b border-slate-100 pb-6">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3">
                      Price Range (LKR)
                    </h4>

                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <input
                            type="number"
                            placeholder="Min"
                            value={priceRange.min}
                            onChange={(e) =>
                              setPriceRange({ ...priceRange, min: e.target.value })
                            }
                            className="w-full p-2.5 border border-slate-200 text-sm rounded-lg outline-none focus:border-slate-900 transition-all"
                            min="0"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="number"
                            placeholder="Max"
                            value={priceRange.max}
                            onChange={(e) =>
                              setPriceRange({ ...priceRange, max: e.target.value })
                            }
                            className="w-full p-2.5 border border-slate-200 text-sm rounded-lg outline-none focus:border-slate-900 transition-all"
                            min="0"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            applyPriceFilter();
                            setIsMobileFilterOpen(false);
                          }}
                          className="flex-1 py-3 bg-brand-500 text-white text-xs font-bold uppercase rounded-lg hover:bg-brand-600 active:scale-[0.98] transition-all"
                        >
                          Apply
                        </button>
                        {isPriceFilterActive && (
                          <button
                            onClick={clearPriceFilter}
                            className="px-4 border border-slate-200 text-xs font-bold rounded-lg hover:bg-slate-50 transition-all"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Results Count - Mobile */}
                  <div className="pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Results
                    </p>
                    <p className="text-2xl font-black text-slate-900">
                      {filteredProducts.length}
                    </p>
                    <p className="text-xs text-slate-500">
                      {filteredProducts.length === 1 ? "Item" : "Items"} available
                    </p>
                  </div>

                  {/* Close Button - Mobile */}
                  <button
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="w-full mt-6 py-3 bg-slate-900 text-white text-xs font-bold uppercase rounded-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Product Grid Section */}
          <main className="flex-1 max-w-7xl mx-auto px-4 py-16">
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
                  No products match your price range in this category.
                </p>
                <button
                  onClick={clearPriceFilter}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-colors rounded-lg"
                >
                  <RefreshCw size={14} /> Clear Price Filter
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
        </div>
      </div>

      <div className="h-32" />
    </div>
  );
}
