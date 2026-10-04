import api from "@/utils/api";
import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { FiTrendingUp } from "react-icons/fi";
import Card from "@/components/product/Card.jsx";


export default function ProductRecommendations({
  currentProductId,
  limit = 8,
}) {
  const [productsWithRatings, setProductsWithRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch recommendations from API
  // Add limit to dependency array
  const fetchRecommendations = useCallback(async () => {
    if (!currentProductId) return;

    try {
      // Pass limit to API call
      const res = await api.get(
        `/api/products/${currentProductId}/recommendations?limit=${limit}`
      );

      if (res.data.success && res.data.recommendations) {
        const formatted = res.data.recommendations.map((p) => ({
          ...p,
          rating: p.rating || p.averageRating || 0,
          totalReviews: p.totalReviews || 0,
        }));
        setProductsWithRatings(formatted);
      } else {
        setProductsWithRatings([]);
      }
    } catch (err) {
      console.error("Failed to load recommendations:", err);
      setProductsWithRatings([]);
    } finally {
      setLoading(false);
    }
  }, [currentProductId, limit]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="mt-8 sm:mt-12">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <div className="w-1 h-6 sm:h-8 bg-brand-600 rounded-full"></div>
          <h2 className="text-lg sm:text-2xl font-black text-brand-800">
            You May Also Like
          </h2>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          {[...Array(Math.min(limit, 8))].map((_, i) => (
            <div key={i} className="w-[185px] sm:w-[200px]">
              <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden border border-slate-100">
                <div className="w-full pb-[100%] bg-slate-200 animate-pulse"></div>
                <div className="p-2 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show nothing if no products
  if (productsWithRatings.length === 0) {
    return null;
  }

  // Main UI - Card Style
  return (
    <div className="mt-8 sm:mt-12 md:mt-16">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-2 mb-4 sm:mb-6 md:mb-8"
      >
        <div className="w-1 h-6 sm:h-8 bg-brand-600 rounded-full"></div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-brand-800">
          You May Also Like
        </h2>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear",
            repeatDelay: 3,
          }}
          className="hidden sm:block"
        >
          <FiTrendingUp className="text-brand-500 text-sm sm:text-base" />
        </motion.div>
      </motion.div>

      {/* Products Grid - Card Style */}
      <div className="flex flex-wrap justify-center gap-4">
        {productsWithRatings.map((product, idx) => (
          <motion.div
            key={product._id || product.productId}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.4 }}
            whileHover={{ y: -8 }}
            className="w-[185px] sm:w-[200px]"
          >
            <Card
              productId={product.productId}
              productName={product.productName}
              price={product.price}
              sellingPrice={product.sellingPrice || product.price}
              images={product.images}
              stock={product.stock}
              rating={product.rating || 0}
              reviewCount={product.totalReviews || 0}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
