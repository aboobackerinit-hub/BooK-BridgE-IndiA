import axios from "axios";

// Default to backend API running on Railway or local FastAPI
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to attach Firebase Auth token (if available)
apiClient.interceptors.request.use(
  async (config) => {
    // We will retrieve the token dynamically if we're on the client
    if (typeof window !== "undefined") {
      try {
        const { auth } = await import("./firebase/config");
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error("Error attaching auth token", error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
