import React, { useEffect, useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import api from "@/utils/api";
import AiChatBot from "@/components/shared/AiChatBot.jsx";
import PrivacyPolicy from "@/components/pages/info/PrivacyPolicy.jsx";
import TermsOfFService from "@/components/pages/info/TermsOfFService.jsx";
import Shippinginfopage from "@/components/pages/info/ShippingInfoPage.jsx";
import ReturnsPage from "@/components/pages/info/ReturnsExchangesPages.jsx";
import WishlistPage from "@/components/pages/account/WishlistPage.jsx";
import HomeContainer from "./HomeContainer.jsx";
import ViewCartPage from "@/components/pages/account/ViewCart.jsx";
import AboutPage from "@/components/pages/info/About.jsx";
import ShipingPage from "@/components/pages/info/Shipping.jsx";
import PaymentPage from "./Payment.jsx";
import Login from "@/components/pages/auth/Login.jsx";
import Signup from "@/components/pages/auth/SingUp.jsx";
import ForgotPassword from "@/components/pages/auth/ForgotPasswordpage.jsx";
import ResetPassword from "@/components/pages/auth/ResetPasswordPage.jsx";
import ContactPage from "@/components/pages/info/ContactPage.jsx";
import HelpPage from "@/components/pages/info/HelpPage.jsx";
import OrderPage from "@/components/pages/account/Orderpage.jsx";
import OrderDetailPage from "@/components/pages/account/OrderDetailPage.jsx";
import NotFound from "@/components/pages/info/NotFound.jsx";
import ServicePage from "@/components/pages/info/Service.jsx";
import ProfilePage from "@/components/pages/account/ProfilePage.jsx";


import Dashboard from "@/components/pages/admin/Dashboard/Dashboard.jsx";
import ShopPage from "@/components/pages/shop/ShopPage.jsx";
import CategoryPage from "@/components/pages/shop/CategoryPage.jsx";
import ProductOverview from "@/components/pages/shop/Productoverview.jsx";
import StorePage from "@/components/pages/shop/StorePage.jsx";

// Seller components
import SellerLanding from "./SellerLanding.jsx";
import SellerRegister from "./SellerRegister.jsx";
import SellerDashboardLayout from "./SellerDashboardLayout.jsx";

// Import icons for the seller CTA
import { FiShoppingBag, FiUsers, FiTruck, FiBarChart2 } from "react-icons/fi";

import EmailPage from "@/components/pages/email/EmailPage.jsx";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function Homepage() {
  const location = useLocation();
  const [user, setUser] = useState("customer");
  const [showBanner, setShowBanner] = useState(true); // State for dismissible banner

  // Track CTA clicks
  const trackCTAClick = (eventName) => {
    // Later: Replace with actual analytics call (e.g., Mixpanel, Google Analytics)
  };

  useEffect(() => {
    const authcheck = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setUser("customer");
        return;
      }

      try {
        const decoded = jwtDecode(token);
        if (decoded.role) {
          setUser(decoded.role === "admin" ? "admin" : decoded.role === "seller" ? "seller" : "customer");
        } else {
          // Fetch user data from backend if role not in token
          const { data } = await api.get("/api/users/me");
          setUser(data.user?.role === "admin" ? "admin" : data.user?.role === "seller" ? "seller" : "customer");
        }
      } catch {
        setUser("customer");
      }
    };

    authcheck();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <ScrollToTop />

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomeContainer />} />
          <Route path="/viewcart" element={<ViewCartPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/shippinginfopage" element={<Shippinginfopage />} />
          <Route path="/shipping/" element={<ShipingPage />} />
          <Route path="/shipping" element={<ShipingPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/orders" element={<OrderPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/orders/:orderId" element={<OrderDetailPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/service" element={<ServicePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfFService />} />
          <Route path="/admin/dashboard/*" element={<Dashboard />} />
          <Route path="/become-seller" element={<SellerLanding />} />
          <Route path="/become-seller/register" element={<SellerRegister />} />
          <Route path="/seller/dashboard/*" element={<SellerDashboardLayout />} />
          <Route path="/email" element={<EmailPage />} />
          <Route
            path="/productoverview/:productId"
            element={<ProductOverview />}
          />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/store/:shopName" element={<StorePage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />

        </Routes>

      </div>
      {/* Hide the AI chat widget on the seller dashboard */}
      {!location.pathname.startsWith("/seller/dashboard") && <AiChatBot />}
    </div>
  );
}
