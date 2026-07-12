import axios from "axios";

// On Vercel same-origin deployment, REACT_APP_BACKEND_URL is empty → calls hit /api on same domain.
// On Emergent preview / local dev, REACT_APP_BACKEND_URL is set in frontend/.env.
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("bb_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
