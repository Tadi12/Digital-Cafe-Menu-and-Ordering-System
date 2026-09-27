import React, { createContext, useCallback, useMemo, useState } from "react";

const LAST_TABLE_KEY = "cafe_last_table_id";

export const CustomerUIContext = createContext();

const readLastTableId = () => {
  try {
    return localStorage.getItem(LAST_TABLE_KEY) || "";
  } catch {
    return "";
  }
};

export const CustomerUIProvider = ({ children }) => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCustomerNavigationHidden, setIsCustomerNavigationHidden] = useState(false);
  const [lastTableId, setLastTableId] = useState(readLastTableId);

  // Cart drawer and search overlay are full-screen surfaces: keep them
  // mutually exclusive so they never stack on top of each other.
  const openCart = useCallback(() => {
    setIsSearchOpen(false);
    setIsCartOpen(true);
  }, []);

  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const openSearch = useCallback(() => {
    setIsCartOpen(false);
    setIsSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  const rememberTableId = useCallback((tableId) => {
    if (!tableId) return;

    const value = String(tableId);
    try {
      localStorage.setItem(LAST_TABLE_KEY, value);
    } catch {
      // Storage unavailable: the tab bar simply cannot deep-link back to the menu.
    }
    setLastTableId(value);
  }, []);

  const value = useMemo(
    () => ({
      isCartOpen,
      isSearchOpen,
      isCustomerNavigationHidden,
      setIsCustomerNavigationHidden,
      lastTableId,
      openCart,
      closeCart,
      openSearch,
      closeSearch,
      rememberTableId,
    }),
    [
      isCartOpen,
      isSearchOpen,
      isCustomerNavigationHidden,
      lastTableId,
      openCart,
      closeCart,
      openSearch,
      closeSearch,
      rememberTableId,
    ],
  );

  return (
    <CustomerUIContext.Provider value={value}>
      {children}
    </CustomerUIContext.Provider>
  );
};
