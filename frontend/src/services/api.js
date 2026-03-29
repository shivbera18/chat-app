// src/services/api.js
import axios from "axios";

const backendUrl =
  import.meta.env.VITE_BACKEND_URL?.trim() || "http://localhost:8000";

const api = axios.create({
  baseURL: `${backendUrl}/api`,
  withCredentials: true, // Important for sending HTTP-only cookies
});

api.interceptors.request.use((config) => {
  // Add auth token to every request, before sending
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  return config;
});

export default api;
