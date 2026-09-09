import React, { createContext, useState, useEffect } from "react";

export const CartContext = createContext();

const SESSION_ID_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const SESSION_KEYS = [
  ["cafe_customer_session_id", "cafe_customer_session_expires_at"],
  ["customer_session_id", "customer_session_expires_at"],
];

const getStoredCustomerSession = () => {
  for (const [sessionKey, expiryKey] of SESSION_KEYS) {
    try {
      const storedSessionId = localStorage.getItem(sessionKey);
      const expiry = Number(localStorage.getItem(expiryKey) || 0);

      if (storedSessionId && expiry > Date.now()) {
        return { sessionId: storedSessionId, sessionKey, expiryKey, expiry };
      }
    } catch {
      // ignore and continue to the next key fallback
    }
  }

  return { sessionId: null, sessionKey: null, expiryKey: null, expiry: 0 };
};

const getOrCreateCustomerSessionId = () => {
  try {
    const { sessionId, sessionKey, expiryKey } = getStoredCustomerSession();

    if (sessionId) {
      if (sessionKey !== "cafe_customer_session_id") {
        localStorage.setItem("cafe_customer_session_id", sessionId);
        localStorage.setItem(
          "cafe_customer_session_expires_at",
          String(Date.now() + SESSION_ID_TTL_MS),
        );
        localStorage.setItem("customer_session_id", sessionId);
        localStorage.setItem(
          "customer_session_expires_at",
          String(Date.now() + SESSION_ID_TTL_MS),
        );
      }
      return sessionId;
    }

    const generatedId = `cust_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const newExpiry = String(Date.now() + SESSION_ID_TTL_MS);
    localStorage.setItem("cafe_customer_session_id", generatedId);
    localStorage.setItem("cafe_customer_session_expires_at", newExpiry);
    localStorage.setItem("customer_session_id", generatedId);
    localStorage.setItem("customer_session_expires_at", newExpiry);
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
    const nextExpiry = String(Date.now() + SESSION_ID_TTL_MS);
    localStorage.setItem("cafe_customer_session_id", customerSessionId);
    localStorage.setItem("cafe_customer_session_expires_at", nextExpiry);
    localStorage.setItem("customer_session_id", customerSessionId);
    localStorage.setItem("customer_session_expires_at", nextExpiry);
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
