import {
  normalizeCustomerName,
  normalizeCustomerSessionId,
} from './customerOrderHistory';

const CUSTOMER_FAVORITES_PREFIX = 'cafe_customer_favorites_';
const CUSTOMER_FAVORITES_LIMIT = 50;

export const getCustomerFavoritesKey = (customerName = '', customerSessionId = '') => {
  const name = normalizeCustomerName(customerName);
  const sessionId = normalizeCustomerSessionId(customerSessionId);
  return `${CUSTOMER_FAVORITES_PREFIX}${name}|${sessionId || 'no-session'}`;
};

const isStoredFavorite = (item) => Boolean(item && typeof item._id === 'string' && item._id);

const sanitizeFavorites = (favorites = []) => {
  const unique = new Map();

  favorites.filter(isStoredFavorite).forEach((item) => {
    if (!unique.has(item._id)) {
      unique.set(item._id, item);
    }
  });

  return [...unique.values()].slice(0, CUSTOMER_FAVORITES_LIMIT);
};

export const readCustomerFavorites = (customerName = '', customerSessionId = '') => {
  try {
    const key = getCustomerFavoritesKey(customerName, customerSessionId);
    const saved = localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? sanitizeFavorites(parsed) : [];
  } catch {
    return [];
  }
};

export const writeCustomerFavorites = (
  customerName,
  customerSessionId = '',
  favorites = [],
) => {
  try {
    const key = getCustomerFavoritesKey(customerName, customerSessionId);
    const sanitized = sanitizeFavorites(favorites);
    localStorage.setItem(key, JSON.stringify(sanitized));
    return sanitized;
  } catch {
    return [];
  }
};

/**
 * Favorites are keyed by customer name + session. When a customer types their
 * name for the first time the key changes, so carry the previous list over
 * instead of leaving the saved items behind on the anonymous key.
 */
export const migrateCustomerFavorites = (fromKey = '', toKey = '') => {
  if (!fromKey || !toKey || fromKey === toKey) return [];

  try {
    const source = localStorage.getItem(fromKey);
    if (!source) return [];

    const parsedSource = JSON.parse(source);
    if (!Array.isArray(parsedSource) || parsedSource.length === 0) return [];

    const target = localStorage.getItem(toKey);
    const parsedTarget = target ? JSON.parse(target) : [];
    if (Array.isArray(parsedTarget) && parsedTarget.length > 0) return [];

    const migrated = sanitizeFavorites(parsedSource);
    if (migrated.length === 0) return [];

    localStorage.setItem(toKey, JSON.stringify(migrated));
    localStorage.removeItem(fromKey);
    return migrated;
  } catch {
    return [];
  }
};

export const buildFavoriteSnapshot = (item = {}) => ({
  ...item,
  favoritedAt: new Date().toISOString(),
});
