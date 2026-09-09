import React, { createContext, useState, useEffect } from "react";

export const CartContext = createContext();

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

  const [customerSessionId, setCustomerSessionId] = useState(() => {
    const storedSessionId = sessionStorage.getItem("cafe_customer_session_id");
    if (storedSessionId) return storedSessionId;

    const generatedId = `cust_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem("cafe_customer_session_id", generatedId);
    return generatedId;
  });

  useEffect(() => {
    localStorage.setItem("cafe_cart_items", JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem("cafe_customer_name", customerName);
  }, [customerName]);

  useEffect(() => {
    sessionStorage.setItem("cafe_customer_session_id", customerSessionId);
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
