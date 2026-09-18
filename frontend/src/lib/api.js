import axios from "axios";

const BACKEND_URL = process.env.NODE_ENV === "production" ? (process.env.REACT_APP_BACKEND_URL || "") : "http://localhost:8000";
export const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("bb_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("bb_refresh_token");
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API}/auth/refresh`, { refresh_token: refreshToken });
          localStorage.setItem("bb_token", data.token);
          if (data.refreshToken) {
            localStorage.setItem("bb_refresh_token", data.refreshToken);
          }
          originalRequest.headers.Authorization = `Bearer ${data.token}`;
          return axios(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear session
          localStorage.removeItem("bb_token");
          localStorage.removeItem("bb_refresh_token");
          localStorage.removeItem("bb_user");
          window.dispatchEvent(new Event("auth-expired"));
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
