import api from "@/utils/api";
import { useEffect, useState, useCallback, useRef, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { HiMenuAlt3, HiX } from "react-icons/hi";
import { RxExit } from "react-icons/rx";
import {
  ShoppingCart,
  Search,
  Package,
  LogOut,
  ChevronRight,
  User,
  Home,
  Info,
  Briefcase,
  Mail,
  Wifi,
  Sun,
  Moon,
} from "lucide-react";
import NotificationWidget from "@/components/utils/NotificationWidget.jsx";
import { getCartWithTotals } from "@/components/utils/Cart.jsx";
import { getPublicSettings } from "@/utils/siteSettings";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasUpdates, setHasUpdates] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [settings, setSettings] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const DEFAULT_IMAGE =
    "https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg";

  const minSwipeDistance = 50;

  // Preload profile image for faster display
  const preloadImage = useCallback((src) => {
    if (!src || src === DEFAULT_IMAGE) return;
    const img = new Image();
    img.src = src;
  }, []);

  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      setLoadingSuggestions(true);
      const res = await api.get(
        `/api/products?search=${encodeURIComponent(query)}&limit=5`
      );
      const products = res.data?.products || res.data?.data || res.data || [];
      setSuggestions(products.slice(0, 5));
    } catch (err) {
      console.error("Suggestion fetch error:", err);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        fetchSuggestions(searchQuery);
      } else {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchSuggestions]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSuggestionClick = (productName) => {
    setSearchQuery(productName);
    setShowSuggestions(false);
    navigate(`/shop?search=${encodeURIComponent(productName)}`);
  };

  // Function to update cart count from localStorage
  const updateCartCount = useCallback(() => {
    const { itemCount } = getCartWithTotals();
    setCartItemCount(itemCount);
  }, []);

  // Load cart count on mount and listen for cart updates
  useEffect(() => {
    updateCartCount();

    // Site settings come from the shared cache (one network fetch per session)
    getPublicSettings().then((s) => {
      if (s) setSettings(s);
    }).catch(() => {});

    // Listen for cart updates
    window.addEventListener("cartUpdated", updateCartCount);

    return () => {
      window.removeEventListener("cartUpdated", updateCartCount);
    };
  }, [updateCartCount]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSuggestions && !event.target.closest('.search-suggestions-container')) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSuggestions]);

  // Hide suggestions on navigation
  useEffect(() => {
    setShowSuggestions(false);
    setSearchQuery("");
  }, [location.pathname]);

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && menuOpen) {
      setMenuOpen(false);
    } else if (isRightSwipe && !menuOpen) {
      setMenuOpen(true);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [menuOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const handleMarkAsSeen = async () => {
    if (!hasUpdates) return;
    try {
      await api.put("/api/orders/mark-seen");

      setHasUpdates(false);
      window.dispatchEvent(new Event("orderUpdate"));
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    setIsAdmin(false);
    setHasUpdates(false);
    window.dispatchEvent(new Event("authChange"));
    navigate("/login");
  };

  const checkOrderUpdates = useCallback(
    async (token) => {
      try {
        const response = await api.get("/api/orders/my-orders");
        const unread = response.data.orders?.some(
          (order) => order.isViewedByUser === false,
        );
        setHasUpdates(unread);
      } catch (error) {
        console.error("Check Updates Error:", error);
      }
    },
    [],
  );

  const fetchUserData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setIsAdmin(false);
      setIsSeller(false);
      setHasUpdates(false);
      return;
    }
    try {
      const response = await api.get("/api/users/me");
      const userData = response.data.user;
      setUser(userData);
      setIsAdmin(userData.role === "admin");
      setIsSeller(userData.role === "seller");
      // Preload profile image for faster display
      if (userData.profileImage && userData.profileImage !== DEFAULT_IMAGE) {
        preloadImage(userData.profileImage);
      }
      checkOrderUpdates(token);
    } catch (error) {
      console.error("Navbar Auth Error:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        handleLogout();
      }
    }
  }, [checkOrderUpdates]);

  useEffect(() => {
    fetchUserData();
    window.addEventListener("authChange", fetchUserData);
    window.addEventListener("profileUpdate", fetchUserData);
    window.addEventListener("orderUpdate", fetchUserData);
    window.addEventListener("settingsUpdated", fetchUserData);

    return () => {
      window.removeEventListener("authChange", fetchUserData);
      window.removeEventListener("profileUpdate", fetchUserData);
      window.removeEventListener("orderUpdate", fetchUserData);
      window.removeEventListener("settingsUpdated", fetchUserData);
    };
  }, [fetchUserData]);

  // settingsUpdated events already carry the fresh settings in detail — no refetch needed
  useEffect(() => {
    const applySettings = (e) => {
      if (e.detail) setSettings(e.detail);
    };
    window.addEventListener("settingsUpdated", applySettings);
    return () => window.removeEventListener("settingsUpdated", applySettings);
  }, []);

  const userId = user?._id || user?.id || "";
  const profileImgSrc = user?.profileImage || user?.picture || DEFAULT_IMAGE;

  // Check if user has custom profile image
  const hasCustomImage =
    user?.profileImage && user?.profileImage !== DEFAULT_IMAGE;

  // Navigation links configuration
  const navLinks = [
    { path: "/", label: "Home", icon: Home },
    { path: "/about", label: "About", icon: Info },
    { path: "/service", label: "Services", icon: Briefcase },
    { path: "/contact", label: "Contact", icon: Mail },
  ];

  return (
    <>
      {/* Top Bar - Daraz Style - Hidden on mobile, visible desktop */}
      <div className="fixed top-0 left-0 w-full z-[60] text-xs h-[40px] hidden lg:block" style={{ backgroundColor: 'var(--topbar-bg)', color: 'var(--topbar-text)' }}>
        <div className="max-w-[1400px] mx-auto px-6 flex justify-end items-center h-full gap-4">
          {isSeller ? (
            <Link to="/seller/dashboard" className="px-4 py-2 navbar-text-base hover:text-brand-600 transition-colors font-semibold">
               🏪 Seller Center
            </Link>
          ) : (
            <Link to="/become-seller" className="px-4 py-2 text-slate-600 hover:text-brand-600 transition-colors">
               Become a Seller
             </Link>
          )}
          <div
            className="relative px-4 py-2 hover:text-brand-600 cursor-pointer"
            onMouseEnter={() => setShowHelpMenu(true)}
            onMouseLeave={() => setShowHelpMenu(false)}
          >
            <span>Help & Support</span>
            {showHelpMenu && (
              <div className="absolute top-full right-0 w-64 bg-white shadow-xl rounded-b-lg border border-slate-100 py-2 z-50">
                <Link to="/help" className="block px-5 py-2 text-slate-600 hover:bg-slate-50 text-sm">
                  Help Center
                </Link>
                <Link to="/contact" className="block px-5 py-2 text-slate-600 hover:bg-slate-50 text-sm">
                  Contact Customer Care
                </Link>
                <Link to="/shipping" className="block px-5 py-2 text-slate-600 hover:bg-slate-50 text-sm">
                  Shipping & Delivery
                </Link>
                <Link to="/returns" className="block px-5 py-2 text-slate-600 hover:bg-slate-50 text-sm">
                  Returns & Refunds
                </Link>
              </div>
            )}
          </div>
          {!user ? (
            <>
              <Link to="/login" className="px-4 py-2 navbar-text-base hover:text-brand-600 transition-colors">
                 Login
                </Link>
                <Link to="/signup" className="px-4 py-2 navbar-text-base hover:text-brand-600 transition-colors">
                 Sign Up
               </Link>
            </>
          ) : (
            <div
              className="relative px-4 py-2 hover:text-brand-600 cursor-pointer"
              onMouseEnter={() => setShowAccountMenu(true)}
              onMouseLeave={() => setShowAccountMenu(false)}
            >
              <span>My Account</span>
              {showAccountMenu && (
                <div className="absolute top-full right-0 w-64 bg-white shadow-xl rounded-b-lg border border-slate-100 py-2 z-50">
                  {isAdmin && (
                    <Link to="/admin/dashboard" className="block px-5 py-2 text-brand-600 hover:bg-slate-50 text-sm font-semibold">
                      Dashboard
                    </Link>
                  )}
                  <Link to={`/profile?userId=${userId}`} className="block px-5 py-2 text-slate-600 hover:bg-slate-50 text-sm">
                    Manage My Account
                  </Link>
                  <Link to="/orders" className="block px-5 py-2 text-slate-600 hover:bg-slate-50 text-sm">
                    My Orders
                  </Link>
                  <Link to="/wishlist" className="block px-5 py-2 text-slate-600 hover:bg-slate-50 text-sm">
                    My Wishlist
                  </Link>
                  <button onClick={handleLogout} className="block w-full text-left px-5 py-2 text-slate-600 hover:bg-slate-50 text-sm">
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
          <div
            className="relative px-4 py-2 hover:text-brand-600 cursor-pointer"
            onMouseEnter={() => setShowLangMenu(true)}
            onMouseLeave={() => setShowLangMenu(false)}
          >
            <span>EN</span>
            {showLangMenu && (
              <div className="absolute top-full right-0 w-40 bg-white shadow-xl rounded-b-lg border border-slate-100 py-2 z-50">
                <button className="block w-full text-left px-5 py-2 text-slate-600 hover:bg-slate-50 text-sm">
                  EN / English
                </button>
                <button className="block w-full text-left px-5 py-2 text-slate-600 hover:bg-slate-50 text-sm">
                  SI / Sinhala
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Navbar with Search */}
      <nav
        className="fixed top-0 lg:top-[40px] left-0 w-full z-50 backdrop-blur-md py-2 lg:py-[10px] border-b h-14 lg:h-[60px]"
        style={{ backgroundColor: 'var(--navbar-bg)', borderBottomColor: 'var(--navbar-border)' }}
      >
        <div className="max-w-[1400px] mx-auto px-2 lg:px-6 flex justify-between items-center gap-2 lg:gap-6">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 group flex-shrink-0"
            onClick={scrollToTop}
            aria-label="Go to homepage"
          >
            <div className={`w-8 h-8 lg:w-9 lg:h-9 rounded-[12px] flex items-center justify-center font-bold text-lg lg:text-xl shadow-md overflow-hidden ${settings?.logo ? "bg-white border border-slate-200" : "bg-brand-500 shadow-brand-300 group-hover:rotate-6 transition-transform text-white"}`}>
              {settings?.logo ? (
                <img src={settings.logo} alt={settings.brandName || "Logo"} className="w-full h-full object-cover" />
              ) : (
                (settings?.iconLetter && settings.iconLetter !== "M") ? settings.iconLetter : ((settings?.brandName || "M").trim().charAt(0) || "M").toUpperCase()
              )}
            </div>
            <span className="text-lg lg:text-xl font-black tracking-[-0.5px] navbar-text-base hidden lg:block">
              <span className="text-brand-500">{settings?.brandName || "MYBRAND"}</span>
            </span>
          </Link>

          {/* Search Bar - Daraz Style with Autocomplete */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl lg:max-w-2xl">
            <div className="relative">
              <div className="flex">
                <div className="flex-1 relative">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                    placeholder="Search"
                    className="w-full text-xs lg:text-sm px-2 lg:px-5 py-1 lg:py-3 border border-slate-200 rounded-l-lg focus:outline-none focus:border-brand-500 bg-white text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                  <button
                    type="submit"
                    className="px-3 lg:px-6 py-1 lg:py-3 bg-brand-500 text-white font-semibold text-xs lg:text-sm rounded-r-lg hover:bg-brand-600 transition-colors"
                  >
                    <span className="hidden lg:inline">SEARCH</span>
                    <span className="lg:hidden"><Search size={15} style={{ fill: "white" }} /></span>
                  </button>
              </div>
              
              {/* Suggestions Dropdown */}
              {showSuggestions && (suggestions.length > 0 || loadingSuggestions) && (
                  <div className="search-suggestions-container absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-b-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  {loadingSuggestions ? (
                    <div className="px-4 py-3 text-slate-500 text-sm">Loading...</div>
                  ) : (
                    suggestions.map((product) => (
                      <button
                        key={product._id || product.productId}
                        type="button"
                        onClick={() => handleSuggestionClick(product.productName)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 last:border-0"
                      >
                        {product.images?.[0] && (
                          <img
                            src={product.images[0]}
                            alt={product.productName}
                            className="w-10 h-10 object-cover rounded"
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-800 truncate">{product.productName}</p>
                          {product.sellingPrice && (
                            <p className="text-sm text-brand-500 font-medium">Rs. {product.sellingPrice.toLocaleString()}</p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
{suggestions.length > 0 && (
                       <button
                        type="button"
                        onClick={() => handleSuggestionClick(searchQuery)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 last:border-0"
                      >
                      View all results for "{searchQuery}"
                    </button>
                  )}
                </div>
              )}
            </div>
          </form>

          {/* Cart Icon */}
          <Link
            to="/viewcart"
            className="relative p-1 lg:p-2 navbar-text-base hover:text-brand-500 transition-colors"
            aria-label="Shopping cart"
          >
            <ShoppingCart size={22} />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] lg:min-w-[20px] lg:h-5 px-1 rounded-full bg-brand-500 text-white text-[9px] lg:text-[10px] font-bold">
                {cartItemCount > 99 ? "99+" : cartItemCount}
              </span>
            )}
          </Link>

          {/* Notifications - Desktop only */}
          <div className="hidden lg:block">
            {user && <NotificationWidget />}
          </div>

          {/* Profile Section - Desktop only */}
          {user && (
            <div className="hidden lg:flex items-center gap-2">
              <Link
                to={`/profile?userId=${userId}`}
                className="flex items-center gap-2 p-1 pr-3 rounded-full border border-slate-100 hover:border-blue-400 transition-all bg-slate-50/50 group"
                aria-label="View profile"
              >
                <div className="relative">
                  <img
                    src={profileImgSrc}
                    className="w-8 h-8 rounded-full object-cover border border-white shadow-sm"
                    alt={user.name || "Profile"}
                    decoding="async"
                    fetchPriority={hasCustomImage ? "high" : "low"}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = DEFAULT_IMAGE;
                    }}
                  />
                  {hasCustomImage && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
                  )}
                </div>
                <span className="text-sm font-semibold navbar-text-base">
                  {user.name?.split(" ")[0]}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                title="Logout"
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-all duration-200 active:scale-95"
                aria-label="Logout"
              >
                <RxExit size={18} className="text-red-500" />
                <span className="hidden xl:inline text-sm font-medium">Logout</span>
              </button>
            </div>
          )}

          {!user && (
            <div className="hidden lg:flex items-center gap-2">
              <Link
                to="/login"
                className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 transition-colors"
                aria-label="Login"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-700 transition-all shadow-md active:scale-95"
                aria-label="Sign up"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Toggle Button */}
          <button
            className="lg:hidden p-2 navbar-text-base hover:bg-slate-50 rounded-lg transition-all active:scale-95"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <HiX size={24} /> : <HiMenuAlt3 size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu with Touch Swipe Support */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Menu Panel - Swipeable */}
            <motion.div
              ref={menuRef}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-[85%] max-w-sm bg-white z-50 shadow-2xl lg:hidden overflow-y-auto"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              role="dialog"
              aria-label="Mobile navigation menu"
            >
              {/* Header with close button and user info */}
              <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex justify-between items-center">
                {user && (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-brand-100 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                    {profileImgSrc !== DEFAULT_IMAGE ? (
                      <img
                        src={profileImgSrc}
                        className="w-full h-full object-cover"
                        alt={user?.name || "Profile"}
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = DEFAULT_IMAGE;
                        }}
                      />
                    ) : (
                      <User className="w-6 h-6 text-brand-600" />
                    )}
                  </div>
                <div>
                  <p className="font-bold text-slate-800">
                    {user?.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {user?.email}
                  </p>
                </div>
                </div>
                )}
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-all active:scale-95"
                  aria-label="Close menu"
                >
                  <HiX size={22} />
                </button>
              </div>

              <div className="p-4 flex flex-col gap-2">
                {/* Public Links with Icons */}
                {navLinks.map(({ path, label, icon: Icon }) => (
                  <MobileNavLink
                    key={path}
                    to={path}
                    label={
                      <div className="flex items-center gap-3">
                        <Icon size={18} className="text-slate-500" />
                        <span className="text-slate-800">{label}</span>
                      </div>
                    }
                    active={location.pathname === path}
                    onClick={() => setMenuOpen(false)}
                  />
                ))}

                {/* Login/Signup Section for non-authenticated users */}
                {!user && (
                  <>
                    <div className="h-[1px] bg-slate-100bg-slate-700 my-3" />
                    <div className="flex flex-col gap-3 p-2">
                      <Link
                        to="/login"
                        onClick={() => setMenuOpen(false)}
                        className="w-full py-3 px-4 bg-brand-600 text-white text-center rounded-xl font-bold hover:bg-brand-700 transition-all active:scale-98"
                        aria-label="Login"
                      >
                        Login
                      </Link>
                      <Link
                        to="/signup"
                        onClick={() => setMenuOpen(false)}
                         className="w-full py-3 px-4 bg-white text-brand-600 text-center rounded-xl font-bold border-2 border-brand-600 hover:bg-brand-50 transition-all active:scale-98"
                        aria-label="Sign up"
                      >
                        Create Account
                      </Link>
                      <p className="text-xs text-center text-slate-500 mt-2">
                        Join us to get exclusive offers!
                      </p>
                    </div>
                  </>
                )}

                {/* User-specific links for authenticated users */}
                {user && (
                  <>
                    <div className="h-[1px] bg-slate-100bg-slate-700 my-3" />

                    {/* Cart with item count */}
                    <MobileNavLink
                      to="/viewcart"
                      label={
                        <div className="flex items-center gap-3">
                          <ShoppingCart size={18} className="text-slate-500" />
                          <span>Shopping Cart</span>
                          {cartItemCount > 0 && (
                            <span className="ml-auto bg-brand-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                              {cartItemCount > 99 ? "99+" : cartItemCount}
                            </span>
                          )}
                        </div>
                      }
                      active={location.pathname === "/viewcart"}
                      onClick={() => setMenuOpen(false)}
                    />

                    {/* Orders with badge */}
                    <MobileNavLink
                      to="/orders"
                      label={
                        <div className="flex items-center gap-3">
                          <Package size={18} className="text-slate-500" />
                          <span>My Orders</span>
                          {hasUpdates && (
                            <span className="ml-auto w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                          )}
                        </div>
                      }
                      active={location.pathname === "/orders"}
                      onClick={() => {
                        handleMarkAsSeen();
                        setMenuOpen(false);
                      }}
                    />

                    {/* Admin Dashboard */}
                    {/* Profile Section - Enhanced */}
                    <Link
                      to={`/profile?userId=${userId}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl transition-all hover:bg-slate-50 group"
                      aria-label="View profile"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                          {profileImgSrc !== DEFAULT_IMAGE ? (
                            <img
                              src={profileImgSrc}
                              className="w-full h-full object-cover"
                              alt={user?.name || "Profile"}
                              decoding="async"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = DEFAULT_IMAGE;
                              }}
                            />
                          ) : (
                            <User className="w-5 h-5 text-brand-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold navbar-text-base">
                            {user?.name?.split(" ")[0] || "My Profile"}
                          </p>
                          <p className="text-xs text-slate-400">View profile</p>
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className="opacity-30 group-hover:opacity-100 transition-opacity text-slate-400"
                      />
                    </Link>

                    {/* Logout Button */}
                    <button
                      onClick={() => {
                        handleLogout();
                        setMenuOpen(false);
                      }}
                      className="flex items-center justify-between p-3 rounded-xl font-semibold transition-all text-rose-600 hover:bg-rose-50 w-full text-left mt-2 border border-rose-100 active:scale-98"
                      aria-label="Logout"
                    >
                      <div className="flex items-center gap-3">
                        <LogOut size={18} />
                        <span>Logout</span>
                      </div>
                      <ChevronRight size={16} className="opacity-50 text-slate-400" />
                    </button>
                  </>
                )}
              </div>

              {/* Swipe Hint */}
              <div className="p-4 text-center border-t border-slate-100border-slate-700 mt-4">
                <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                  <span>←</span> Swipe left to close <span>→</span>
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Mobile Navigation Link Component - Memoized for performance
const MobileNavLink = memo(({ to, label, active, onClick }) => {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center justify-between p-3 rounded-xl font-semibold transition-all active:scale-98 ${
        active ? "bg-brand-50 text-brand-600" : "navbar-text-base hover:bg-slate-50"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span className="flex items-center text-sm sm:text-base">{label}</span>
      <ChevronRight
        size={16}
        className={active ? "opacity-100 text-brand-600" : "opacity-30"}
      />
    </Link>
  );
});

