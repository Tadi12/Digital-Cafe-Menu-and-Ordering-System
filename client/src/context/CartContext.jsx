import React, { createContext, useState, useEffect } from "react";

export const CartContext = createContext();

const SESSION_ID_TTL_MS = 1000 * 60 * 60 * 24 * 30;

const getOrCreateCustomerSessionId = () => {
  try {
    const storedSessionId = localStorage.getItem("cafe_customer_session_id");
    const expiry = Number(
      localStorage.getItem("cafe_customer_session_expires_at") || 0,
    );

    if (storedSessionId && expiry > Date.now()) {
      return storedSessionId;
    }

    const generatedId = `cust_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("cafe_customer_session_id", generatedId);
    localStorage.setItem(
      "cafe_customer_session_expires_at",
      String(Date.now() + SESSION_ID_TTL_MS),
    );
    return generatedId;
  } catch {
    return `cust_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem("cafe_cart_items");
      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  });

  const [customerName, setCustomerName] = useState(() => {
    return localStorage.getItem("cafe_customer_name") || "";
  });

  const [customerSessionId, setCustomerSessionId] = useState(() =>
    getOrCreateCustomerSessionId(),
  );

  useEffect(() => {
    localStorage.setItem("cafe_cart_items", JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem("cafe_customer_name", customerName);
  }, [customerName]);

  useEffect(() => {
    localStorage.setItem("cafe_customer_session_id", customerSessionId);
    localStorage.setItem(
      "cafe_customer_session_expires_at",
      String(Date.now() + SESSION_ID_TTL_MS),
    );
  }, [customerSessionId]);

  const addToCart = (food, quantity = 1) => {
    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => item._id === food._id,
      );
      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex].quantity += quantity;
        return updated;
      }
      return [...prevItems, { ...food, quantity }];
    });
  };

  const updateQuantity = (foodId, delta) => {
    setCartItems((prevItems) => {
      return prevItems
        .map((item) => {
          if (item._id === foodId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const removeFromCart = (foodId) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => item._id !== foodId),
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalItemsCount = cartItems.reduce(
    (acc, item) => acc + item.quantity,
    0,
  );

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        customerName,
        setCustomerName,
        customerSessionId,
        setCustomerSessionId,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalItemsCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
