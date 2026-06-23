import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/authStore";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // send cookies for refresh token
});

// ── Request interceptor — attach access token ─────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — auto-refresh on 401 ───────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<{ success: boolean; data: { accessToken: string } }>(
          "/api/auth/refresh",
          {},
          { withCredentials: true }
        );

        const newToken = data.data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        useAuthStore.getState().clearAuth();
        if (typeof window !== "undefined") {
          window.location.href = "/login?reason=session_expired";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// ── Typed API helpers ─────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (data: { name: string; email: string; phone?: string; password: string }) =>
    api.post("/auth/register", data),
  logout: () => api.post("/auth/logout"),
};

export const menuApi = {
  getAll: (params?: { category?: string; featured?: boolean }) =>
    api.get("/menu", { params }),
  create: (data: unknown) => api.post("/menu", data),
  update: (id: string, data: unknown) => api.patch(`/menu/${id}`, data),
  delete: (id: string) => api.delete(`/menu/${id}`),
};

export const ordersApi = {
  getAll: (params?: { status?: string; page?: number }) =>
    api.get("/orders", { params }),
  getById: (id: string) => api.get(`/orders/${id}`),
  create: (data: unknown) => api.post("/orders", data),
  updateStatus: (id: string, status: string) => api.patch(`/orders/${id}`, { status }),
};

export const bookingsApi = {
  getAll: (params?: { status?: string }) => api.get("/bookings", { params }),
  create: (data: unknown) => api.post("/bookings", data),
  update: (id: string, data: unknown) => api.patch(`/bookings/${id}`, data),
};

export const ticketsApi = {
  getAll: () => api.get("/tickets"),
  buy: (eventId: string, quantity: number) =>
    api.post("/tickets", { eventId, quantity }),
};

export const paymentsApi = {
  stkPush: (data: {
    phoneNumber: string;
    orderId?: string;
    bookingId?: string;
    ticketId?: string;
  }) => api.post("/payments/mpesa-stk", data),
};

export const analyticsApi = {
  getDashboard: () => api.get("/analytics"),
};
