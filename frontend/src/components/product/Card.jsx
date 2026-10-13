import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import api from "@/utils/api";

const formatPrice = (value) => {
  if (!value && value !== 0) return "0";
  return Number(value).toLocaleString("en-US");
};

export default function Card({ productId, productName, price, sellingPrice, images, stock, isSale, oldPrice, rating, reviewCount, isVariantParent, variants }) {
  const oldPriceNum = Number(oldPrice || price || 0);
  const nowPriceNum = Number(sellingPrice || price || 0);
  const allVariantsOutOfStock = isVariantParent && Array.isArray(variants) && variants.length > 0
    ? variants.every((v) => (v.stock || 0) === 0)
    : false;

  const isOutOfStock = !isVariantParent
    ? (stock === 0 || stock === "0" || !stock)
    : allVariantsOutOfStock;

  const showViewOptions = isVariantParent && !allVariantsOutOfStock;
  const isDiscount = nowPriceNum < oldPriceNum && oldPriceNum > 0;
  const discountPercent = isDiscount ? Math.round(((oldPriceNum - nowPriceNum) / oldPriceNum) * 100) : 0;
  const totalReviews = reviewCount || 0;

  const validImages = Array.isArray(images)
    ? images.filter(img => img && img.startsWith('http'))
    : [];
  const firstImageUrl = validImages[0] || null;

  const DEFAULT_IMAGE = "https://placehold.co/300x300?text=No+Image";

  const token = localStorage.getItem("token");
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkWishlist = async () => {
      if (!token) {
        const local = JSON.parse(localStorage.getItem("myWishlist") || "[]");
        if (mounted) {
          setIsWishlisted(local.some(p => p.productId === productId));
          setWishlistLoading(false);
        }
        return;
      }

      try {
        const local = JSON.parse(localStorage.getItem("myWishlist") || "[]");
        if (mounted) {
          setIsWishlisted(local.some(p => p.productId === productId));
        }
      } catch {
        if (mounted) setIsWishlisted(false);
      } finally {
        if (mounted) setWishlistLoading(false);
      }
    };

    checkWishlist();

    const handleUpdate = () => checkWishlist();
    window.addEventListener("wishlistUpdated", handleUpdate);

    return () => {
      mounted = false;
      window.removeEventListener("wishlistUpdated", handleUpdate);
    };
  }, [productId, token]);

  const handleWishlistClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!token) {
      const local = JSON.parse(localStorage.getItem("myWishlist") || "[]");
      const product = { productId, productName, price, sellingPrice, images, stock };
      if (isWishlisted) {
        const filtered = local.filter(p => p.productId !== productId);
        localStorage.setItem("myWishlist", JSON.stringify(filtered));
      } else {
        local.push(product);
        localStorage.setItem("myWishlist", JSON.stringify(local));
      }
      setIsWishlisted(!isWishlisted);
      window.dispatchEvent(new Event("wishlistUpdated"));
      return;
    }

    try {
      if (isWishlisted) {
        await api.delete("/api/wishlist/remove", { params: { productId } });
      } else {
        await api.post("/api/wishlist/add", { productId });
      }
      setIsWishlisted(!isWishlisted);
      window.dispatchEvent(new Event("wishlistUpdated"));
    } catch (error) {
      console.error("Wishlist toggle error:", error);
    }
  };

  return (
    <Link
      to={isOutOfStock && !isVariantParent ? "#" : `/shop/productoverview/${productId}`}
      className={`block w-full bg-white rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border border-slate-100 relative group ${isOutOfStock ? "opacity-75 grayscale" : ""}`}
    >
      <button
        onClick={handleWishlistClick}
        disabled={wishlistLoading}
        className={`absolute top-2 right-2 z-10 p-1.5 rounded-full transition-all ${
          isWishlisted
            ? "bg-red-500 text-white shadow-md"
            : "bg-white/90 text-gray-400 hover:text-red-500"
        }`}
      >
        <Heart size={16} fill={isWishlisted ? "currentColor" : "none"} />
      </button>
      <div className="relative w-full pb-[100%] overflow-hidden bg-slate-100">
        {firstImageUrl ? (
          <img
            src={firstImageUrl}
            alt={productName}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              e.target.src = DEFAULT_IMAGE;
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-xs">
            <img src={DEFAULT_IMAGE} alt="No Image" className="w-full h-full object-cover opacity-50" />
          </div>
        )}

        {isSale && !isOutOfStock && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-md">
            -{discountPercent}%
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded shadow-md">
              Out of Stock
            </span>
          </div>
        )}
        {showViewOptions && (
          <div className="absolute bottom-0 left-0 right-0 bg-brand-500/90 text-white text-xs font-bold px-2 py-1.5 text-center">
            View Options
          </div>
        )}
      </div>

      <div className="pt-2 pb-3 px-2">
        <h3 className="overflow-hidden text-ellipsis text-sm font-medium text-slate-800 h-[36px] leading-[18px] line-clamp-2">
          {productName}
        </h3>

        <div className="flex items-center gap-1 mt-1">
          <span className="text-brand-500 font-bold text-base">
            Rs. {formatPrice(nowPriceNum || oldPriceNum)}
          </span>
          {isSale && oldPriceNum > 0 && (
            <span className="text-xs text-slate-400 line-through ml-1">
              Rs. {formatPrice(oldPriceNum)}
            </span>
          )}
        </div>

        {rating > 0 && (
          <div className="flex items-center mt-2">
            <div className="inline-flex gap-px">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-xs ${star <= rating ? "text-amber-400" : "text-gray-300"}`}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-slate-400 text-xs ml-1">({totalReviews})</span>
          </div>
        )}
      </div>
    </Link>
  );
}
