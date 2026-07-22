import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-ID': process.env.NEXT_PUBLIC_TENANT_ID || 'DEFAULT',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, ok: boolean) {
  failedQueue.forEach((prom) => {
    if (ok) {
      prom.resolve();
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
}

function clearAuthAndRedirect() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}

api.interceptors.request.use(
  (config) => {
    // Prefer httpOnly cookies (sent via withCredentials). Fall back to
    // Authorization header for transitional clients that still have tokens.
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes('/auth/refresh')) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => api(originalRequest));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken =
        typeof window !== 'undefined'
          ? localStorage.getItem('refreshToken')
          : null;

      const { data } = await axios.post(
        `${api.defaults.baseURL}/auth/refresh`,
        {},
        {
          withCredentials: true,
          headers: {
            ...(refreshToken
              ? { Authorization: `Bearer ${refreshToken}` }
              : {}),
            'X-Tenant-ID': process.env.NEXT_PUBLIC_TENANT_ID || 'DEFAULT',
          },
        },
      );

      if (typeof window !== 'undefined') {
        // Keep localStorage in sync during transition; cookies are primary.
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
        }
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        if (data.mustChangePassword) {
          window.location.href = '/change-password';
          return Promise.reject(error);
        }
      }

      processQueue(null, true);
      if (data.accessToken) {
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      }
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, false);
      clearAuthAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
