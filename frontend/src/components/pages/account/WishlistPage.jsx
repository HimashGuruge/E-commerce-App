import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Trash2, ShoppingCart, ArrowLeft } from "lucide-react";
import api from "@/utils/api";
import toast from "react-hot-toast";
import getApiError from "@/utils/errors";

const formatPrice = (price) => {
  return (price || 0).toLocaleString();
};

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/wishlist");
      setWishlist(data.products || []);
    } catch (error) {
      console.error("Fetch wishlist error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
    const handleUpdate = () => fetchWishlist();
    window.addEventListener("wishlistUpdated", handleUpdate);
    return () => window.removeEventListener("wishlistUpdated", handleUpdate);
  }, []);

  const handleRemove = async (productId) => {
    try {
      await api.delete("/api/wishlist/remove", { params: { productId } });
      setWishlist((prev) => prev.filter((p) => (p._id || p.productId) !== productId));
      window.dispatchEvent(new Event("wishlistUpdated"));
    } catch (error) {
      console.error("Remove from wishlist error:", error);
      toast.error(getApiError(error, "Failed to update wishlist"));
    }
  };

  const handleAddToCart = async (product) => {
    try {
      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      const productId = product._id || product.productId;
      const existing = cart.find((item) => item.productId === productId);

      if (existing) {
        existing.qty += 1;
      } else {
        cart.push({
          productId,
          productName: product.productName || product.name,
          price: product.sellingPrice || product.price,
          image: product.images?.[0],
          qty: 1,
        });
      }

      localStorage.setItem("cart", JSON.stringify(cart));
      window.dispatchEvent(new Event("cartUpdated"));
      await handleRemove(productId);
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error(getApiError(error, "Failed to update wishlist"));
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="w-24 h-24 bg-slate-200 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Heart className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-700 mb-2">Your Wishlist is Empty</h2>
        <p className="text-slate-500 text-sm mb-6">Save items you love to your wishlist</p>
        <Link
          to="/"
          className="bg-brand-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-700 transition"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">My Wishlist</h1>
        <span className="text-slate-500 text-sm">({wishlist.length} items)</span>
      </div>

      <div className="space-y-3">
        {wishlist.map((item) => {
          const productId = item._id || item.productId;
          const productName = item.productName || item.name;
          const price = item.sellingPrice || item.price;

          return (
            <div
              key={productId}
              className="flex gap-4 bg-white p-3 rounded-lg border border-slate-100 shadow-sm"
            >
              <Link to={`/shop/productoverview/${productId}`} className="flex-shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 rounded-lg overflow-hidden">
                  {item.images?.[0] ? (
                    <img
                      src={item.images[0]}
                      alt={productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
                      No Image
                    </div>
                  )}
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                <Link to={`/shop/productoverview/${productId}`}>
                  <h3 className="text-sm font-medium text-slate-800 line-clamp-2 hover:text-brand-600">
                    {productName}
                  </h3>
                </Link>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  Rs.{formatPrice(price)}
                </p>
                {item.stock <= 0 && (
                  <span className="text-xs text-red-500">Out of Stock</span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleAddToCart(item)}
                  disabled={item.stock <= 0}
                  className="flex items-center justify-center gap-1 px-3 py-1.5 bg-brand-500 text-white text-xs rounded-lg hover:bg-brand-600 disabled:bg-gray-300 transition"
                >
                  <ShoppingCart size={14} />
                  Add to Cart
                </button>
                <button
                  onClick={() => handleRemove(productId)}
                  className="flex items-center justify-center gap-1 px-3 py-1.5 text-red-500 text-xs rounded-lg hover:bg-red-50 transition"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
