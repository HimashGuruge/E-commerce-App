// Load cart from localStorage
export function loadCart() {
  const cart = localStorage.getItem("cart");
  return cart != null ? JSON.parse(cart) : [];
}

// Save cart to localStorage and dispatch event
export function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
  window.dispatchEvent(new Event("cartUpdated"));
}

// Add item to cart or update quantity
export async function addToCart(productId, qty, price, lastPrice, image, productName, availableStock, _existingItemIndex = null, variantInfo = null) {
  const cart = loadCart();
  
  let index;
  
  if (variantInfo && variantInfo.variantSku) {
    index = cart.findIndex((item) => 
      String(item.productId) === String(productId) && 
      item.variantSku === variantInfo.variantSku
    );
  } else {
    index = cart.findIndex((item) => String(item.productId) === String(productId));
  }

  if (index === -1) {
    if (qty > availableStock) {
      alert(`Only ${availableStock} items available in stock`);
      return false;
    }
    
    const cartItem = { 
      productId: String(productId),
      qty, 
      price, 
      lastPrice,
      image,
      productName,
      stock: availableStock
    };
    
    if (variantInfo) {
      cartItem.variantSku = variantInfo.variantSku;
      cartItem.attributes = variantInfo.attributes;
    }
    
    cart.push(cartItem);
  } else {
    const item = cart[index];
    const newQty = item.qty + qty;

    if (newQty <= 0) {
      cart.splice(index, 1);
    } else {
      if (newQty > availableStock) {
        alert(`Cannot add more than ${availableStock} items. Only ${availableStock} available.`);
        return false;
      }
      item.qty = newQty;
      item.price = price;
      item.lastPrice = lastPrice;
      item.stock = availableStock;
    }
  }

  saveCart(cart);
  return true;
}

// Clear entire cart
export function clearCart() {
  localStorage.removeItem("cart");
  window.dispatchEvent(new Event("cartUpdated"));
}

// Remove specific item
export function deleteItem(productId, variantSku) {
  const cart = loadCart();
  const index = cart.findIndex((item) =>
    String(item.productId) === String(productId) &&
    (!variantSku || item.variantSku === variantSku)
  );
  if (index !== -1) {
    cart.splice(index, 1);
    saveCart(cart);
  }
}

// Update item quantity directly
export function updateItemQty(productId, qty, availableStock, variantSku) {
  const cart = loadCart();
  const index = cart.findIndex((item) =>
    String(item.productId) === String(productId) &&
    (!variantSku || item.variantSku === variantSku)
  );

  if (index !== -1) {
    if (qty <= 0) {
      cart.splice(index, 1);
    } else {
      if (availableStock !== undefined && qty > availableStock) {
        alert(`Only ${availableStock} items available in stock`);
        return false;
      }
      cart[index].qty = qty;
      if (availableStock !== undefined) {
        cart[index].stock = availableStock;
      }
    }
    saveCart(cart);
  }
  return true;
}

// Get cart totals
export function getCartWithTotals() {
  const cart = loadCart();
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalSavings = cart.reduce((sum, item) => {
    const saving = (item.lastPrice - item.price) * item.qty;
    return sum + (saving > 0 ? saving : 0);
  }, 0);
  const total = subtotal;
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  
  return {
    subtotal,
    totalSavings,
    total,
    itemCount,
  };
}
