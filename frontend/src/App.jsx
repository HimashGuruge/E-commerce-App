import React, { useEffect } from "react";
import api from "@/utils/api";
import { injectTheme, injectFont, injectNavbar } from "@/utils/color";
import Homepage from "./components/pages/shop/Homepage.jsx";
import CategoryPage from "./components/pages/shop/CategoryPage.jsx";
import ProductOverview from "./components/pages/shop/Productoverview.jsx";

import Navbar from "./components/layout/Navbar.jsx";
import Footer from "./components/layout/Footer.jsx";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import OrderPage from "./components/pages/account/Orderpage.jsx";
import OrderDetailPage from "./components/pages/account/OrderDetailPage.jsx";
import ReturnRequestPage from "./components/pages/account/ReturnRequestPage.jsx";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">We apologize for the inconvenience. Please try again later.</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="bg-brand-600 text-white px-4 py-2 rounded hover:bg-brand-700 transition-colors"
            >
              Try again
            </button>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 text-left text-xs text-gray-500 bg-gray-50 p-3 rounded">
                <summary>Error details</summary>
                <pre>{this.state.error?.toString()}</pre>
                <pre>{this.state.errorInfo?.componentStack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppLayout() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith("/admin/dashboard") || location.pathname.startsWith("/seller/dashboard");

  return (
    <ErrorBoundary>
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
      <ScrollToTop />
      {!isDashboard && <Navbar />}
 <div className={`flex-1 ${!isDashboard ? "pt-14 lg:pt-[100px]" : ""}`}>
        <Routes>
          <Route path="/shop/productoverview/:productId" element={<ProductOverview />} />
          <Route path="/shop/category/:slug" element={<CategoryPage />} />
          
          {/* Account Pages */}
          <Route path="/orders" element={<OrderPage />} />
          <Route path="/orders/:orderId" element={<OrderDetailPage />} />
          <Route path="/orders/:orderId/return" element={<ReturnRequestPage />} />
          
          <Route path="/*" element={<Homepage />} />
        </Routes>
      </div>
      {!isDashboard && <Footer />}
    </div>
    </ErrorBoundary>
  );
}

function App() {
  useEffect(() => {
    const applySettings = (s) => {
      if (!s) return;
      if (s.primaryColor) injectTheme(s.primaryColor);
      if (s.chatWidgetColor || s.primaryColor) {
        const color = s.chatWidgetColor || s.primaryColor;
        const root = document.documentElement;
        root.style.setProperty("--chat-color", color);
        root.style.setProperty("--chat-color-r", parseInt(color.slice(1,3), 16));
        root.style.setProperty("--chat-color-g", parseInt(color.slice(3,5), 16));
        root.style.setProperty("--chat-color-b", parseInt(color.slice(5,7), 16));
        // Save to cookie for all components to read instantly on mount
        document.cookie = `opencodeChatColor=${encodeURIComponent(color)}; max-age=31536000; path=/`;
      }
      if (s.fontFamily) injectFont(s.fontFamily, s.fontUrl);
      injectNavbar(s);
      window.dispatchEvent(new CustomEvent("settingsUpdated", { detail: s }));
    };

    const fetchSettings = () => {
      api.get("/api/settings/public")
        .then((res) => { if (res.data?.success) applySettings(res.data.settings); })
        .catch(() => {});
    };

    fetchSettings();
    const interval = setInterval(fetchSettings, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;

