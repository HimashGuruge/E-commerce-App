import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:4000",
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
      // console.log(`📤 API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("❌ Unauthorized");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("authChange"));
    } else {
      console.error("API error:", error.response?.status, error.message);
    }
    return Promise.reject(error);
  }
);

export default api;