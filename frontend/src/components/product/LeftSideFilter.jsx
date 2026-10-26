import React, { useState, useEffect } from "react";
import { Filter, Search, X, ChevronDown, ChevronUp, Star, Package, Truck } from "lucide-react";
import usePublicSettings from "@/hooks/usePublicSettings";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];

const RATINGS = [5, 4, 3, 2, 1];

const LeftSideFilter = ({
  filters,
  setFilters,
  categories,
  onClose,
  currentCategoryId = null,
  ratingCounts,
}) => {
  const { settings } = usePublicSettings();
  const panel = settings?.filterPanel;
  const sortBox = panel?.sortBox;
  const isSectionEnabled = (key) => panel?.[key] ?? true;
  const [expandedSections, setExpandedSections] = useState({
    sort: true,
    price: true,
    categories: true,
    rating: true,
    stock: true,
    readyToShip: true,
  });

  const [localPrice, setLocalPrice] = useState({ min: "", max: "" });
  const [categorySearch, setCategorySearch] = useState("");

  useEffect(() => {
    setLocalPrice({
      min: filters.priceRange[0] === 0 ? "" : filters.priceRange[0].toString(),
      max: filters.priceRange[1] === 0 ? "" : filters.priceRange[1].toString(),
    });
  }, [filters.priceRange]);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCategoryChange = (categoryId) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((id) => id !== categoryId)
        : [...prev.categories, categoryId],
    }));
  };

  const applyPriceFilter = () => {
    const min = localPrice.min === "" ? 0 : Math.max(0, parseInt(localPrice.min) || 0);
    const max = localPrice.max === "" ? 0 : Math.max(0, parseInt(localPrice.max) || 0);
    setFilters((prev) => ({
      ...prev,
      priceRange: [Math.min(min, max), Math.max(min, max)],
    }));
  };

  const clearPriceFilter = () => {
    setFilters((prev) => ({ ...prev, priceRange: [0, 0] }));
    setLocalPrice({ min: "", max: "" });
  };

  const clearAllFilters = () => {
    setFilters({
      priceRange: [0, 0],
      categories: [],
      sortBy: "newest",
      minRating: 0,
      readyToShip: false,
      inStock: false,
    });
    setLocalPrice({ min: "", max: "" });
    setCategorySearch("");
  };

  const isPriceActive = filters.priceRange[1] > 0;
  const hasActiveFilters = filters.categories.length > 0 || isPriceActive || filters.minRating > 0 || filters.inStock || filters.readyToShip || filters.sortBy !== "newest";

  // Admin-customizable Sort By box styles (empty = keep the default look).
  const sortBoxStyle = sortBox?.borderColor ? { borderColor: sortBox.borderColor } : {};
  const headingStyle = sortBox?.headingColor ? { color: sortBox.headingColor } : {};
  const optionFontStyle = sortBox?.fontSize ? { fontSize: `${sortBox.fontSize}px` } : {};
  const activeOptionStyle = {
    ...(sortBox?.activeBgColor ? { backgroundColor: sortBox.activeBgColor } : {}),
    ...(sortBox?.activeColor ? { color: sortBox.activeColor } : {}),
    ...optionFontStyle,
  };
  const idleOptionStyle = {
    ...(sortBox?.optionColor ? { color: sortBox.optionColor } : {}),
    ...optionFontStyle,
  };

  const filteredCategories = categories.filter((cat) => {
    const matchesSearch = cat.name.toLowerCase().includes(categorySearch.toLowerCase());
    const isNotCurrentCategory = currentCategoryId ? cat._id !== currentCategoryId : true;
    return matchesSearch && isNotCurrentCategory;
  });

  return (
    <div className="w-full h-full overflow-y-auto bg-white dark:bg-slate-900">
      {/* Mobile header with close button */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 lg:hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-700 dark:text-slate-300" />
            <h3 className="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white">Filters</h3>
          </div>
          {onClose && (
            <button onClick={() => { onClose(); }} className="p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Desktop header */}
        <div className="hidden lg:flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-700 dark:text-slate-300" />
            <h3 className="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white">Filters</h3>
          </div>
        </div>

        {hasActiveFilters && (
          <button onClick={clearAllFilters} className="w-full mb-6 py-3 text-xs font-bold uppercase tracking-wider border border-red-100 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/70 rounded-lg transition-colors">
            Clear All Filters
          </button>
        )}

        {/* Sort By */}
        {isSectionEnabled("sort") && (
        <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-6" style={sortBoxStyle}>
          <button onClick={() => toggleSection("sort")} className="w-full flex justify-between items-center mb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white" style={{ ...headingStyle, ...optionFontStyle }}>Sort By</h4>
            {expandedSections.sort ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {expandedSections.sort && (
            <div className="space-y-1">
              {SORT_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => setFilters((prev) => ({ ...prev, sortBy: opt.value }))}
                    style={filters.sortBy === opt.value ? activeOptionStyle : idleOptionStyle}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      filters.sortBy === opt.value
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>)}

        {/* Price Range */}
        {isSectionEnabled("price") && (
        <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
          <button onClick={() => toggleSection("price")} className="w-full flex justify-between items-center mb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Price Range (LKR)</h4>
            {expandedSections.price ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {expandedSections.price && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <input type="number" placeholder="Min" value={localPrice.min}
                  onChange={(e) => setLocalPrice({ ...localPrice, min: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 text-sm rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900 transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500" min="0"
                />
                <input type="number" placeholder="Max" value={localPrice.max}
                  onChange={(e) => setLocalPrice({ ...localPrice, max: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 text-sm rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900 transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500" min="0"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={applyPriceFilter} className="flex-1 py-2.5 bg-brand-500 text-white text-xs font-bold uppercase rounded-lg hover:bg-brand-600 active:scale-[0.98] transition-all shadow-sm hover:shadow-md">
                  Apply
                </button>
                {isPriceActive && <button onClick={clearPriceFilter} className="px-4 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Reset</button>}
              </div>
              {!isPriceActive && (
                <p className="text-[10px] text-brand-600 dark:text-brand-300 font-bold text-center bg-brand-50 dark:bg-brand-900/20 py-2 rounded-md border border-brand-100 dark:border-brand-900/60">Showing All Prices</p>
              )}
            </div>
          )}
        </div>)}

        {/* Rating */}
        {isSectionEnabled("rating") && (
        <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
          <button onClick={() => toggleSection("rating")} className="w-full flex justify-between items-center mb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Minimum Rating</h4>
            {expandedSections.rating ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {expandedSections.rating && (
            <div className="space-y-1">
              {RATINGS.map((stars) => {
                const selected = filters.minRating === stars;
                const count = ratingCounts?.[stars] || 0;
                const label = stars === 5 ? "5 stars" : stars === 1 ? "1 star & up" : `${stars} stars & up`;
                return (
                  <button key={stars} onClick={() => setFilters((prev) => ({ ...prev, minRating: selected ? 0 : stars }))}
                    aria-pressed={selected}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      selected
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                        : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {selected ? (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-blue-600">
                        <span className="h-2 w-2 rounded-full bg-blue-600" />
                      </span>
                    ) : (
                      <span className="h-4 w-4 shrink-0 rounded-full border border-slate-300 dark:border-slate-600" />
                    )}
                    <span className="flex items-center gap-0.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} size={14} fill="currentColor"
                          className={star <= stars ? "text-amber-400" : "text-slate-300 dark:text-slate-600"} />
                      ))}
                    </span>
                    <span>{label}</span>
                    {count > 0 && (
                      <span className="ml-auto text-xs font-medium tabular-nums text-slate-400 dark:text-slate-500">{count}</span>
                    )}
                  </button>
                );
              })}
              {filters.minRating > 0 && (
                <button onClick={() => setFilters((prev) => ({ ...prev, minRating: 0 }))}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  Clear rating
                </button>
              )}
            </div>
          )}
        </div>)}

        {/* In Stock Toggle */}
        {isSectionEnabled("availability") && (
        <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
          <button onClick={() => toggleSection("stock")} className="w-full flex justify-between items-center mb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Availability</h4>
            {expandedSections.stock ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {expandedSections.stock && (
              <label className="flex items-center gap-3 cursor-pointer group px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="relative">
                <input type="checkbox" checked={filters.inStock} onChange={(e) => setFilters((prev) => ({ ...prev, inStock: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-500 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </div>
              <Package size={15} className="text-slate-400 dark:text-slate-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">In Stock Only</span>
            </label>
          )}
        </div>)}

        {/* Ready to Ship */}
        {isSectionEnabled("readyToShip") && (
          <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
            <button onClick={() => toggleSection("readyToShip")} className="w-full flex justify-between items-center mb-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Ready to Ship</h4>
              {expandedSections.readyToShip ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedSections.readyToShip && (
              <label className="flex items-center gap-3 cursor-pointer group px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="relative">
                  <input type="checkbox" checked={filters.readyToShip} onChange={(e) => setFilters((prev) => ({ ...prev, readyToShip: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-500 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </div>
                <Truck size={15} className="text-slate-400 dark:text-slate-500" />
                <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Ready to Ship</span>
              </label>
            )}
          </div>
        )}

        {/* Categories */}
        {isSectionEnabled("categories") && (
        <div className="mb-6">
          <button onClick={() => toggleSection("categories")} className="w-full flex justify-between items-center mb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Categories</h4>
            {expandedSections.categories ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {expandedSections.categories && (
            <div className="space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input type="text" placeholder="Search categories..." value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-slate-400 dark:focus:border-slate-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((category) => (
                    <label key={category._id} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={filters.categories.includes(category._id)}
                        onChange={() => handleCategoryChange(category._id)}
                        className="w-4 h-4 accent-slate-900 dark:accent-white rounded border-slate-300 dark:border-slate-600"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{category.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-2">
                    {categorySearch ? "No categories found" : "No categories available"}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>)}

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Active Filters</p>
            <div className="flex flex-wrap gap-2">
              {isPriceActive && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 rounded-md">
                  Price: {filters.priceRange[0]} - {filters.priceRange[1]}
                  <button onClick={clearPriceFilter} className="ml-1 text-slate-400 dark:text-slate-500 hover:text-red-500"><X size={12} /></button>
                </span>
              )}
              {filters.minRating > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 rounded-md">
                  ★ {filters.minRating}+
                  <button onClick={() => setFilters((prev) => ({ ...prev, minRating: 0 }))} className="ml-1 text-slate-400 dark:text-slate-500 hover:text-red-500"><X size={12} /></button>
                </span>
              )}
              {filters.inStock && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 rounded-md">
                  In Stock
                  <button onClick={() => setFilters((prev) => ({ ...prev, inStock: false }))} className="ml-1 text-slate-400 dark:text-slate-500 hover:text-red-500"><X size={12} /></button>
                </span>
              )}
              {filters.readyToShip && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 rounded-md">
                  Ready to Ship
                  <button onClick={() => setFilters((prev) => ({ ...prev, readyToShip: false }))} className="ml-1 text-slate-400 dark:text-slate-500 hover:text-red-500"><X size={12} /></button>
                </span>
              )}
              {filters.sortBy !== "newest" && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 rounded-md">
                  {SORT_OPTIONS.find(o => o.value === filters.sortBy)?.label || filters.sortBy}
                  <button onClick={() => setFilters((prev) => ({ ...prev, sortBy: "newest" }))} className="ml-1 text-slate-400 dark:text-slate-500 hover:text-red-500"><X size={12} /></button>
                </span>
              )}
              {filters.categories.map((catId) => {
                const category = categories.find((c) => c._id === catId);
                return category ? (
                  <span key={catId} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 rounded-md">
                    {category.name}
                    <button onClick={() => handleCategoryChange(catId)} className="ml-1 text-slate-400 dark:text-slate-500 hover:text-red-500"><X size={12} /></button>
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftSideFilter;
