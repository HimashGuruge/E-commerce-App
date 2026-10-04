import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { FiStar, FiTruck, FiPackage, FiChevronLeft, FiChevronRight, FiSearch } from "react-icons/fi";
import { MdStore } from "react-icons/md";
import api from "@/utils/api";

export default function StorePage() {
  const { shopName } = useParams();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const fetchStore = async (p) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/sellers/store/${encodeURIComponent(shopName)}?page=${p}&limit=12`);
      if (res.data?.success) {
        setStore(res.data.store);
        setProducts(res.data.products || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalProducts(res.data.totalProducts || 0);
        setPage(res.data.page || 1);
      }
    } catch (err) {
      console.error("Failed to load store:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStore(page); }, [shopName, page]);

  // Helper to get the best price
  const getPrice = (p) => p.sellingPrice || p.price || 0;
  const getOriginal = (p) => p.price || getPrice(p);
  const hasDiscount = (p) => getOriginal(p) > getPrice(p);
  const discountPercent = (p) => hasDiscount(p) ? Math.round((1 - getPrice(p) / getOriginal(p)) * 100) : 0;

  // Client-side search + sort
  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((p) => p.productName?.toLowerCase().includes(q));
    }
    if (sortBy === "price-low") list.sort((a, b) => getPrice(a) - getPrice(b));
    else if (sortBy === "price-high") list.sort((a, b) => getPrice(b) - getPrice(a));
    else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [products, searchTerm, sortBy]);

  if (loading && !store) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Loading store...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiPackage className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Store Not Found</h2>
          <p className="text-sm text-slate-500 mb-6">This store doesn't exist or is not yet active.</p>
          <Link to="/" className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-medium transition-colors text-sm">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white min-h-screen">
      {/* Store Banner */}
      <div className="relative overflow-hidden">
        {store.shopBanner ? (
          <div className="h-48 sm:h-56 lg:h-72 w-full">
            <img src={store.shopBanner} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          </div>
        ) : (
          <div className="h-32 sm:h-44 lg:h-56 w-full bg-gradient-to-r from-brand-700 via-brand-600 to-orange-500">
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}

        {/* Store Profile Overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6">
          <div className="flex items-end gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full bg-white shadow-lg flex items-center justify-center flex-shrink-0 border-2 border-white overflow-hidden">
              {store.shopLogo ? (
                <img src={store.shopLogo} alt={store.shopName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-brand-700 font-bold text-xl sm:text-2xl lg:text-3xl">
                  {store.shopName?.charAt(0).toUpperCase() || "S"}
                </span>
              )}
            </div>
            <div className="pb-1 text-white">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold drop-shadow-sm">{store.shopName}</h1>
              {store.owner && (
                <p className="text-xs sm:text-sm text-white/80 drop-shadow-sm">by {store.owner}</p>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-white/80">
                <span className="flex items-center gap-1">
                  <FiStar className="w-3 h-3" /> {store.rating || "—"}%
                </span>
                <span className="flex items-center gap-1">
                  <FiTruck className="w-3 h-3" /> {store.shipOnTime || "—"}% Ship
                </span>
                <span>Member since {new Date(store.memberSince).toLocaleDateString("en-LK", { month: "short", year: "numeric" })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Store Info Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-5 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">{store.rating || "—"}%</p>
                <p className="text-[11px] text-slate-500">Seller Ratings</p>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">{store.shipOnTime || "—"}%</p>
                <p className="text-[11px] text-slate-500">Ship on Time</p>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">{store.chatResponseRate || "—"}%</p>
                <p className="text-[11px] text-slate-500">Chat Response</p>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">{totalProducts}</p>
                <p className="text-[11px] text-slate-500">Products</p>
              </div>
            </div>
            <div className="sm:ml-auto">
              <Link
                to={`/`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
              >
                <MdStore className="w-4 h-4" />
                Visit Homepage
              </Link>
            </div>
          </div>
          {store.shopDescription && (
            <p className="text-sm text-slate-600 mt-4 pt-4 border-t border-slate-100">{store.shopDescription}</p>
          )}
        </div>

        {/* Search & Sort Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <h2 className="text-lg font-bold text-slate-900">
            All Products <span className="text-sm font-normal text-slate-400">({filteredProducts.length})</span>
          </h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-52">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search in this store..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none bg-white"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            >
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Products */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {[1,2,3,4,5,6,7,8,9,10].map((i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 animate-pulse">
                <div className="aspect-square bg-slate-100" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <FiPackage className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-600 font-medium">
              {searchTerm ? `No products matching "${searchTerm}"` : "No products yet"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {searchTerm ? "Try a different search term" : "This seller hasn't added any products yet"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {filteredProducts.map((product) => (
                <Link
                  key={product._id}
                  to={`/shop/productoverview/${product.productId}`}
                  className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md hover:border-brand-200 transition-all group"
                >
                  <div className="aspect-square bg-slate-50 overflow-hidden relative">
                    <img
                      src={product.images?.[0] || "https://img.lazcdn.com/static/lk/p/default-product.jpg"}
                      alt={product.productName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {hasDiscount(product) && (
                      <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        -{discountPercent(product)}%
                      </span>
                    )}
                    {product.stock === 0 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-white text-slate-800 text-xs font-bold px-3 py-1 rounded">Sold Out</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 sm:p-3">
                    <p className="text-xs text-slate-700 line-clamp-2 mb-2 min-h-[2rem] leading-relaxed">
                      {product.productName}
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold text-brand-600">
                        Rs. {getPrice(product).toLocaleString()}
                      </span>
                      {hasDiscount(product) && (
                        <span className="text-[10px] text-slate-400 line-through">
                          Rs. {getOriginal(product).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {product.stock > 0 && product.stock < 10 && (
                      <p className="text-[10px] text-red-500 mt-1">Only {product.stock} left</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 7) pageNum = i + 1;
                  else if (page <= 4) pageNum = i + 1;
                  else if (page >= totalPages - 3) pageNum = totalPages - 6 + i;
                  else pageNum = page - 3 + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                        pageNum === page
                          ? "bg-brand-500 text-white"
                          : "text-slate-600 hover:bg-slate-50 border border-slate-200"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
