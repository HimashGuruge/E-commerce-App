import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/utils/api";
import { Loader2, Sparkles } from "lucide-react";

export default function FlashSale({ limit = 10, title = "On Sale Now" }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

useEffect(() => {
    const fetchFlashSaleProducts = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/products?limit=${limit}&sortBy=sellingPrice-asc`);

        let fetchedProducts = [];

        if (response.data?.success && response.data.products) {
          fetchedProducts = response.data.products;
        } else if (Array.isArray(response.data)) {
          fetchedProducts = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          fetchedProducts = response.data.data;
        }

        const flashProducts = fetchedProducts.filter(
          (p) => p.price && (p.sellingPrice || p.price)
        );

        setProducts(flashProducts);
      } catch (error) {
        console.error("Error fetching flash sale products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFlashSaleProducts();
  }, [limit]);

  if (loading) {
    return (
      <div className="py-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="cardFsContent">
      {/* Header */}
      <div
        className="card-fs-content-header flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: "#fff" }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-500" />
          <div className="fs-status-text font-black uppercase tracking-wider" style={{ color: "#f57224" }}>
            {title}
          </div>
        </div>
        <Link
          to="/shop?sort=discount"
          className="pc-custom-link shopMoreBtn text-center text-xs font-black uppercase"
          style={{ borderColor: "#f57224", color: "#f57224" }}
        >
          SHOP ALL PRODUCTS
        </Link>
      </div>

      {/* Products */}
      <style>{`
        @keyframes marquee-left {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .flash-marquee-track {
          animation: marquee-left ${Math.max(products.length * 4, 20)}s linear infinite;
        }
        .flash-marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="overflow-hidden p-4">
        <div className="flash-marquee-track flex gap-3 w-max">
          {[...products, ...products].map((product, index) => {
            const discount = product.price && (product.sellingPrice || product.price)
              ? Math.round(((Number(product.price) - Number(product.sellingPrice || product.price)) / Number(product.price)) * 100)
              : 0;

            const firstImage = 
              product.images?.[0] || 
              product.image || 
              product.imageUrl || 
              null;

            return (
              <Link
                key={`${product._id || product.productId}-${index}`}
                to={`/shop/productoverview/${product.productId || product._id}`}
                className="pc-custom-link card-fs-content-body-unit hp-mod-card-hover flex-shrink-0"
              >
                <div className="common-img fs-card-img img-w100p w-[200px]">
                  <img
                    src={firstImage || "https://img.lazcdn.com/static/lk/p/default-product.jpg"}
                    alt={product.productName}
                    className="w-[200px] h-[200px] object-cover rounded-lg"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = "https://img.lazcdn.com/static/lk/p/default-product.jpg";
                    }}
                  />
                </div>
                <div className="fs-card-text p-2">
                  <p className="fs-card-title two-line-clamp text-xs mb-2 font-medium text-slate-700">
                    {product.productName}
                  </p>
                  <div className="fs-card-price flex items-baseline gap-1">
                    <span className="currency text-xs text-slate-500">Rs.</span>
                    <span className="price text-sm font-black text-brand-600">
                      {Number(product.sellingPrice || product.price).toLocaleString()}
                    </span>
                  </div>
                  {Number(product.price) > Number(product.sellingPrice || 0) && (
                    <div className="fs-card-origin-price flex items-baseline gap-1">
                      <div className="fs-origin-price flex items-baseline gap-1">
                        <span className="currency text-xs text-slate-400">Rs.</span>
                        <span className="price text-xs text-slate-400 line-through">
                          {product.price?.toLocaleString()}
                        </span>
                      </div>
                      {discount > 0 && (
                        <span className="itemDiscount ml-1 text-[10px] bg-brand-100 text-brand-700 px-1 rounded">
                          -{discount}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
