import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/utils/api";
import {
  Loader2,
  AlertCircle,
  Filter,
  X,
  Search,
  SortAsc,
} from "lucide-react";
import Card from "@/components/product/Card";
import LeftSideFilter from "@/components/product/LeftSideFilter";

export default function ShopPage() {
  const [searchParams] = useSearchParams();

  const searchQuery = searchParams.get("search") || "";
  const categorySlug = searchParams.get("category") || "";
  const mode = searchQuery ? "search" : "category";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [pageTitle, setPageTitle] = useState("");

  const [filters, setFilters] = useState({
    priceRange: [0, 0],
    categories: [],
    sortBy: "newest",
    minRating: 0,
    inStock: false,
    readyToShip: false,
  });

  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const clearAllFilters = () => {
    setFilters({
      priceRange: [0, 0],
      categories: [],
      sortBy: "newest",
      minRating: 0,
      inStock: false,
      readyToShip: false,
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchError(null);
        setLoading(true);

        let endpoint, queryParams = "";

        if (mode === "search" && searchQuery) {
          endpoint = "/api/products";
          queryParams = `?sort=${filters.sortBy === 'price-asc' ? 'sellingPrice:asc' : filters.sortBy === 'price-desc' ? 'sellingPrice:desc' : filters.sortBy === 'name' ? 'name' : 'createdAt:desc'}`;
          queryParams += `&search=${encodeURIComponent(searchQuery)}`;
          setPageTitle(`Search: "${searchQuery}"`);
        } else if (categorySlug) {
          endpoint = `/api/products/category/${categorySlug}`;
          queryParams = `?sort=${filters.sortBy === 'price-asc' ? 'sellingPrice:asc' : filters.sortBy === 'price-desc' ? 'sellingPrice:desc' : filters.sortBy === 'name' ? 'name' : 'createdAt:desc'}`;
          setPageTitle("Shop");
        } else {
          endpoint = "/api/products";
          queryParams = `?sort=${filters.sortBy === 'price-asc' ? 'sellingPrice:asc' : filters.sortBy === 'price-desc' ? 'sellingPrice:desc' : filters.sortBy === 'name' ? 'name' : 'createdAt:desc'}`;
          setPageTitle("Shop");
        }

        const [productRes, categoryRes] = await Promise.all([
          api.get(`${endpoint}${queryParams}`),
          api.get(`/api/categories`),
        ]);

        let fetchedProducts = [];
        if (productRes.data?.success && productRes.data.data) {
          fetchedProducts = productRes.data.data;
        } else if (productRes.data?.products) {
          fetchedProducts = productRes.data.products;
        } else if (Array.isArray(productRes.data)) {
          fetchedProducts = productRes.data;
        }

        try {
          const ids = fetchedProducts.map((p) => p._id).filter(Boolean).join(",");
          if (ids) {
            const ratingRes = await api.get(`/api/products/ratings-overview?productIds=${ids}`);
            if (ratingRes.data?.success) {
              const ratingData = ratingRes.data.data;
              fetchedProducts = fetchedProducts.map((p) => ({
                ...p,
                rating: ratingData[p._id]?.avg || 0,
                numReviews: ratingData[p._id]?.total || 0,
              }));
            }
          }
        } catch (_e) {}

        let fetchedCategories = [];
        if (categoryRes.data?.categories) {
          fetchedCategories = categoryRes.data.categories;
        } else if (Array.isArray(categoryRes.data)) {
          fetchedCategories = categoryRes.data;
        }

        setProducts(fetchedProducts);
        setCategories(fetchedCategories);
        setFilteredProducts(fetchedProducts);

      } catch (error) {
        console.error("Error fetching data:", error);
        const errorMsg = error.response?.data?.message || error.message || "Failed to load products";
        setFetchError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchQuery, categorySlug, filters.sortBy, mode]);

  useEffect(() => {
    if (products.length === 0) return;

    let filtered = [...products];

    if (filters.priceRange[1] > 0) {
      filtered = filtered.filter((product) => {
        const price = product.sellingPrice || product.price || 0;
        const minOk = filters.priceRange[0] <= 0 || price >= filters.priceRange[0];
        const maxOk = filters.priceRange[1] <= 0 || price <= filters.priceRange[1];
        return minOk && maxOk;
      });
    }

    if (filters.categories.length > 0) {
      filtered = filtered.filter((product) =>
        filters.categories.includes(product.category?._id || product.category)
      );
    }

    if (filters.minRating > 0) {
      filtered = filtered.filter(
        (product) => (product.rating ?? 0) >= filters.minRating
      );
    }

    if (filters.inStock) {
      filtered = filtered.filter(
        (product) => (product.stock ?? 0) > 0
      );
    }

    if (filters.readyToShip) {
      filtered = filtered.filter((product) => product.status === "ready");
    }

    setFilteredProducts(filtered);
  }, [products, filters.priceRange, filters.categories, filters.minRating, filters.inStock, filters.readyToShip]);

  const sortOptions = [
    { value: "newest", label: "Newest Arrivals" },
    { value: "price-asc", label: "Price: Low to High" },
    { value: "price-desc", label: "Price: High to Low" },
    { value: "name", label: "Name: A-Z" },
  ];

  const getSortLabel = () => {
    const option = sortOptions.find(opt => opt.value === filters.sortBy);
    return option?.label || "Sort by";
  };

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

  if (fetchError) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md mx-auto px-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-slate-500">{fetchError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-brand-500 mx-auto mb-4" />
          <p className="text-sm text-slate-500">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-slate-100">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{pageTitle}</h1>
              <p className="text-sm text-slate-500 mt-1">
                {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
              </p>
            </div>

            {/* Mobile Filter & Sort Controls */}
            <div className="flex items-center gap-3">
              {/* Mobile Filter Button */}
              <button
                onClick={() => setShowMobileFilter(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Filter size={18} />
                <span>Filters</span>
                {filters.categories.length > 0 || filters.priceRange[1] > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-brand-500 text-white text-xs rounded-full">
                    {filters.categories.length + (filters.priceRange[1] > 0 ? 1 : 0)}
                  </span>
                )}
              </button>

              {/* Sort Dropdown - Desktop */}
              <div className="hidden lg:block relative">
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <SortAsc size={18} />
                  <span>{getSortLabel()}</span>
                </button>

                {showSortDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 overflow-hidden">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setFilters({ ...filters, sortBy: option.value });
                          setShowSortDropdown(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors ${
                          filters.sortBy === option.value
                            ? 'bg-brand-50 text-brand-700 font-medium'
                            : 'text-slate-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full">
        <div className="flex">
          {/* Left Sidebar - Desktop */}
          <aside className="hidden lg:block w-72 xl:w-80 flex-shrink-0 border-r border-slate-100 sticky top-0 self-start h-[calc(100vh-88px)] overflow-y-auto bg-white">
            <LeftSideFilter
              filters={filters}
              setFilters={setFilters}
              categories={categories}
              ratingCounts={ratingCounts}
            />
          </aside>

          {/* Products Grid */}
          <main className="flex-1 min-w-0">
            {/* Mobile Sort - Visible only on mobile/tablet */}
            <div className="lg:hidden border-b border-slate-100 px-4 sm:px-6 py-4">
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

      {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center min-h-[40vh] px-4 py-12">
                <div className="text-center max-w-sm mx-auto">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                    <Search className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No products found</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    Try adjusting your filters or search terms
                  </p>
                  <button
                    onClick={clearAllFilters}
                    className="px-6 py-2.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
                  {filteredProducts.map((product) => (
                    <Card
                      key={product._id || product.productId}
                      productId={product.productId || product._id}
                      productName={product.productName}
                      images={product.images || []}
                      price={product.price}
                      sellingPrice={product.sellingPrice}
                      stock={product.stock}
                      rating={product.averageRating || product.rating}
                      totalReviews={product.reviewCount || product.totalReviews}
                    />
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter Overlay */}
      {showMobileFilter && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowMobileFilter(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center">
                  <Filter className="w-5 h-5 text-brand-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
              </div>
              <button
                onClick={() => setShowMobileFilter(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Filter Content */}
            <div className="flex-1 overflow-y-auto">
              <LeftSideFilter
                filters={filters}
                setFilters={setFilters}
                categories={categories}
                ratingCounts={ratingCounts}
                onClose={() => setShowMobileFilter(false)}
              />
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setShowMobileFilter(false)}
                className="w-full py-3 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors"
              >
                Show {filteredProducts.length} Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
