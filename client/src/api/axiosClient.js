import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://digital-cafe-menu-and-ordering-system.onrender.com/api';

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
    // Retry only once for network errors or server errors (5xx)
    if (!config.__retry && (!response || response.status >= 500)) {
      config.__retry = true;
      console.warn('Retrying request after timeout/5xx...');
      return axiosClient(config);
    }
    return Promise.reject(error);
  }
);

// Interceptor to attach Authorization Bearer token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cafe_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
