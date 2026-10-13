import axios from "axios";

const requestTimeoutMs = 20000;

const isNetworkError = (error) =>
  !error.response &&
  (error.code === "ECONNABORTED" ||
    error.code === "ERR_NETWORK" ||
    error.code === "ECONNREFUSED" ||
    error.code === "ECONNRESET" ||
    error.code === "ENOTFOUND" ||
    error.message === "Network Error");

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:4000",
  timeout: requestTimeoutMs,
  headers: {
    "Content-Type": "application/json",
  },
});

export const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;

    if (status === 401) {
      console.error("Unauthorized");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("authChange"));
      return Promise.reject(error);
    }

    // Auto-retry a GET request once on transient network failures
    const method = (error.config?.method || "").toLowerCase();
    if (method === "get" && !error.config.__retried && isNetworkError(error)) {
      error.config.__retried = true;
      try {
        return await api.request(error.config);
      } catch (retryErr) {
        return Promise.reject(retryErr);
      }
    }

    console.error("API error:", status ?? "-", error.message);
    return Promise.reject(error);
  }
);

export default api;
