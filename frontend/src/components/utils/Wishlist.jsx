const WISHLIST_KEY = "myWishlist";

export const getWishlistLocal = () => {
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || [];
  } catch {
    return [];
  }
};

export const addToWishlistLocal = (product) => {
  const current = getWishlistLocal();
  const exists = current.find((p) => p.productId === (product.productId || product._id));
  if (!exists) {
    const newItem = {
      productId: product.productId || product._id,
      productName: product.productName || product.name,
      price: product.price,
      sellingPrice: product.sellingPrice,
      images: product.images,
      stock: product.stock,
      addedAt: new Date().toISOString(),
    };
    localStorage.setItem(WISHLIST_KEY, JSON.stringify([...current, newItem]));
    window.dispatchEvent(new Event("wishlistUpdated"));
    return true;
  }
  return false;
};

export const removeFromWishlistLocal = (productId) => {
  const current = getWishlistLocal();
  const filtered = current.filter((p) => p.productId !== productId);
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(filtered));
  window.dispatchEvent(new Event("wishlistUpdated"));
};

export const isInWishlistLocal = (productId) => {
  const current = getWishlistLocal();
  return current.some((p) => p.productId === productId);
};
