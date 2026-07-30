import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true, // send httpOnly refresh cookie
});

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes("/auth/")) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingQueue.push(() => resolve(api(originalRequest)));
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post("/auth/refresh");
        setAccessToken(data.data.accessToken);
        pendingQueue.forEach((cb) => cb());
        pendingQueue = [];
        return api(originalRequest);
      } catch {
        pendingQueue = [];
        onUnauthorized?.();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
