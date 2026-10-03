import axios from 'axios';
import { getCachedCoordinates, ensureFreshCoordinates } from '../utils/geolocation';

const API_BASE_URL = import.meta.env.DEV
  ? '/api'
  : import.meta.env.VITE_API_BASE_URL ||
    'https://digital-cafe-menu-and-ordering-system.onrender.com/api';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  // Increased timeout to 30 seconds to accommodate Render cold starts and OTP email latency.
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Retry once on network timeout / 5xx errors
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (!config) {
      return Promise.reject(error);
    }
    // Retry only once for network errors or server errors (5xx)
    const url = `${config.baseURL || ''}${config.url || ''}`;
    const isPasswordReset =
      url.includes('/auth/forgot-password') || url.includes('/auth/reset-password');
    if (
      !isPasswordReset &&
      !config.__retry &&
      (!response || response.status >= 500)
    ) {
      config.__retry = true;
      console.warn('Retrying request after timeout/5xx...');
      return axiosClient(config);
    }
    return Promise.reject(error);
  }
);

// Interceptor to attach the Authorization Bearer token and the customer's
// current position, which the server's geofence middleware checks.
axiosClient.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('cafe_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Refresh a stale fix before sending. A failure here is not fatal on its
    // own: the request goes out without coordinates and the API decides.
    const cached = getCachedCoordinates();
    if (!cached) {
      await ensureFreshCoordinates().catch(() => {});
    }

    const position = getCachedCoordinates();
    if (position) {
      config.headers['x-client-lat'] = String(position.lat);
      config.headers['x-client-lon'] = String(position.lon);
      config.headers['x-client-accuracy'] = String(position.accuracy ?? '');
      config.headers['x-client-geo-at'] = String(position.at);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle 401 Unauthorized globally
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('cafe_admin_token');
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
