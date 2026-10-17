import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/utils/api";
import SellerDashboardSidebar from "./SellerDashboardSidebar";
import SellerDashboardTopbar from "./SellerDashboardTopbar";
import SellerDashboardHome from "./SellerDashboardHome";
import SellerProducts from "./SellerProducts";
import SellerAddProduct from "./SellerAddProduct";
import SellerOrders from "./SellerOrders";
import SellerOrdersFull from "./SellerOrdersFull";
import SellerMessages from "./SellerMessages";
import SellerNotifications from "./SellerNotifications";
import SellerEarnings from "./SellerEarnings";
import SellerSettings from "./SellerSettings";

export default function SellerDashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSeller = async () => {
      try {
        const { data } = await api.get("/api/sellers/me");
        if (data.success) setSeller(data.seller);
      } catch {
        setSeller(null);
      } finally {
        setLoading(false);
      }
    };
    fetchSeller();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-shopbg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-shopprimary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If not a seller or not approved, show message
  if (!seller) {
    return (
      <div className="min-h-screen bg-shopbg flex items-center justify-center">
        <div className="text-center bg-white rounded-[13px] border border-shopborder p-8 max-w-md">
          <h2 className="text-xl font-bold text-shoptext mb-2">Seller Account Not Found</h2>
          <p className="text-shopmuted mb-4">You need to register as a seller first.</p>
          <a href="/become-seller/register" className="inline-flex px-5 py-2.5 bg-shopprimary text-white rounded-[9px] hover:bg-[#4338ca] font-semibold">Register as Seller</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-shopbg">
      <div className="hidden lg:block">
        <SellerDashboardSidebar user={seller} isMobileOpen={false} closeMobile={() => {}} />
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <SellerDashboardSidebar user={seller} isMobileOpen={mobileOpen} closeMobile={() => setMobileOpen(false)} />
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <SellerDashboardTopbar user={seller} toggleMobile={() => setMobileOpen((p) => !p)} />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route index element={<SellerDashboardHome />} />
            <Route path="products" element={<SellerProducts />} />
            <Route path="add-product" element={<SellerAddProduct />} />
            <Route path="edit-product/:productId" element={<SellerAddProduct />} />
            <Route path="orders" element={<SellerOrdersFull />} />
            <Route path="messages" element={<SellerMessages />} />
            <Route path="notifications" element={<SellerNotifications />} />
            <Route path="earnings" element={<SellerEarnings />} />
            <Route path="settings" element={<SellerSettings />} />
            <Route path="*" element={<Navigate to="/seller/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
