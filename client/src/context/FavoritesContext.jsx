import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCart } from "../hooks/useCart";
import {
  buildFavoriteSnapshot,
  getCustomerFavoritesKey,
  migrateCustomerFavorites,
  readCustomerFavorites,
  writeCustomerFavorites,
} from "../utils/customerFavorites";

export const FavoritesContext = createContext();

export const FavoritesProvider = ({ children }) => {
  const { customerName, customerSessionId } = useCart();

  const ownerKey = getCustomerFavoritesKey(customerName, customerSessionId);
  const previousOwnerKeyRef = useRef(ownerKey);

  const [favoriteItems, setFavoriteItems] = useState(() =>
    readCustomerFavorites(customerName, customerSessionId),
  );

  // Reload the saved list whenever the customer identity changes. When a name is
  // entered for the first time, the anonymous list is carried over.
  useEffect(() => {
    const previousKey = previousOwnerKeyRef.current;
    let nextFavorites = readCustomerFavorites(customerName, customerSessionId);

    if (previousKey !== ownerKey && nextFavorites.length === 0) {
      nextFavorites = migrateCustomerFavorites(previousKey, ownerKey);
    }

    previousOwnerKeyRef.current = ownerKey;
    setFavoriteItems(nextFavorites);
  }, [ownerKey, customerName, customerSessionId]);

  // Writes happen inside the mutations below so a changed identity can never
  // persist the previous customer's list under the new key.
  const persistFavorites = useCallback(
    (nextFavorites) =>
      writeCustomerFavorites(customerName, customerSessionId, nextFavorites),
    [customerName, customerSessionId],
  );

  const favoriteIds = useMemo(
    () => favoriteItems.map((item) => item._id),
    [favoriteItems],
  );

  const isFavorite = useCallback(
    (itemId) => Boolean(itemId) && favoriteIds.includes(itemId),
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    (item) => {
      if (!item?._id) return false;

      const alreadyFavorited = favoriteIds.includes(item._id);
      const nextFavorites = alreadyFavorited
        ? favoriteItems.filter((favorite) => favorite._id !== item._id)
        : [buildFavoriteSnapshot(item), ...favoriteItems];

      setFavoriteItems(persistFavorites(nextFavorites));
      return !alreadyFavorited;
    },
    [favoriteIds, favoriteItems, persistFavorites],
  );

  const removeFavorite = useCallback(
    (itemId) => {
      if (!itemId) return;
      setFavoriteItems(
        persistFavorites(favoriteItems.filter((favorite) => favorite._id !== itemId)),
      );
    },
    [favoriteItems, persistFavorites],
  );

  const replaceFavorites = useCallback(
    (items = []) => {
      const nextFavorites = Array.isArray(items) ? items : [];
      setFavoriteItems(persistFavorites(nextFavorites));
    },
    [persistFavorites],
  );

  const clearFavorites = useCallback(() => {
    setFavoriteItems(persistFavorites([]));
  }, [persistFavorites]);

  return (
    <FavoritesContext.Provider
      value={{
        favoriteItems,
        favoriteIds,
        favoriteCount: favoriteItems.length,
        isFavorite,
        toggleFavorite,
        removeFavorite,
        replaceFavorites,
        clearFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};
