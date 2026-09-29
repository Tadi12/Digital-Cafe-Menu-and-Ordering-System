import { create } from 'zustand';

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
    const { sessionId, sessionKey } = getStoredCustomerSession();

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

const useCartStore = create((set, get) => ({
  cartItems: (() => {
    try {
      const savedCart = localStorage.getItem("cafe_cart_items");
      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  })(),
  customerName: localStorage.getItem("cafe_customer_name") || "",
  customerSessionId: getOrCreateCustomerSessionId(),

  setCustomerName: (name) => {
    localStorage.setItem("cafe_customer_name", name);
    set({ customerName: name });
  },

  setCustomerSessionId: (id) => {
    const nextExpiry = String(Date.now() + SESSION_ID_TTL_MS);
    localStorage.setItem("cafe_customer_session_id", id);
    localStorage.setItem("cafe_customer_session_expires_at", nextExpiry);
    localStorage.setItem("customer_session_id", id);
    localStorage.setItem("customer_session_expires_at", nextExpiry);
    set({ customerSessionId: id });
  },

  addToCart: (food, quantity = 1) => {
    set((state) => {
      const existingIndex = state.cartItems.findIndex(
        (item) => item._id === food._id,
      );
      let updated;
      if (existingIndex > -1) {
        updated = [...state.cartItems];
        updated[existingIndex].quantity += quantity;
      } else {
        updated = [...state.cartItems, { ...food, quantity }];
      }
      localStorage.setItem("cafe_cart_items", JSON.stringify(updated));
      return { cartItems: updated };
    });
  },

  updateQuantity: (foodId, delta) => {
    set((state) => {
      const updated = state.cartItems
        .map((item) => {
          if (item._id === foodId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
      localStorage.setItem("cafe_cart_items", JSON.stringify(updated));
      return { cartItems: updated };
    });
  },

  removeFromCart: (foodId) => {
    set((state) => {
      const updated = state.cartItems.filter((item) => item._id !== foodId);
      localStorage.setItem("cafe_cart_items", JSON.stringify(updated));
      return { cartItems: updated };
    });
  },

  clearCart: () => {
    localStorage.setItem("cafe_cart_items", JSON.stringify([]));
    set({ cartItems: [] });
  },

  // Derived state (selectors can be used instead, but keeping them as functions on the store makes migration seamless)
  getTotalItemsCount: () => get().cartItems.reduce((acc, item) => acc + item.quantity, 0),
  getSubtotal: () => get().cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0),
}));

export default useCartStore;
