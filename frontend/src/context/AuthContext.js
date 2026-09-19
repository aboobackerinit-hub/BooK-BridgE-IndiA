import React, { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";
import { initPushNotifications } from "@/lib/pushNotifications";
import { clearCache } from "@/lib/dbCache";

const AuthContext = createContext(null);

const sanitizeUser = (u) => {
  if (!u) return null;
  const { id, email, name, role, avatar_url, notifications_enabled, created_at } = u;
  return { id, email, name, role, avatar_url, notifications_enabled, created_at };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      initPushNotifications(user);
    }
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem("bb_token");
    const cachedUserRaw = localStorage.getItem("bb_user");
    let loginTime = localStorage.getItem("bb_login_time");

    // 1 year (365 days) in milliseconds
    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

    if (token) {
      if (!loginTime) {
        // Grandfather in existing sessions by setting their start time to now
        loginTime = Date.now().toString();
        localStorage.setItem("bb_login_time", loginTime);
      }

      if (Date.now() - parseInt(loginTime, 10) > ONE_YEAR_MS) {
        localStorage.removeItem("bb_token");
        localStorage.removeItem("bb_refresh_token");
        localStorage.removeItem("bb_user");
        localStorage.removeItem("bb_login_time");
        clearCache();
        setUser(null);
        setLoading(false);
        return;
      }
    }

    if (token && cachedUserRaw) {
      try {
        const cachedUser = JSON.parse(cachedUserRaw);
        if (cachedUser && cachedUser.id) {
          setUser(cachedUser);
          setLoading(false); // Instant app startup!
        }
      } catch {}
    }

    if (!token) {
      setLoading(false);
      return;
    }

    // Silent background session validation & sync
    api.get("/auth/me")
      .then((r) => {
        const safeUser = sanitizeUser(r.data);
        setUser(safeUser);
        localStorage.setItem("bb_user", JSON.stringify(safeUser));
        initPushNotifications(safeUser);
      })
      .catch((err) => {
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          localStorage.removeItem("bb_token");
          localStorage.removeItem("bb_refresh_token");
          localStorage.removeItem("bb_user");
          localStorage.removeItem("bb_login_time");
          clearCache();
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
      
    const handleAuthExpired = () => {
      setUser(null);
    };
    window.addEventListener("auth-expired", handleAuthExpired);
    return () => window.removeEventListener("auth-expired", handleAuthExpired);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("bb_token", data.token);
    localStorage.setItem("bb_login_time", Date.now().toString());
    if (data.refreshToken) localStorage.setItem("bb_refresh_token", data.refreshToken);
    const safeUser = sanitizeUser(data.user);
    localStorage.setItem("bb_user", JSON.stringify(safeUser));
    setUser(safeUser);
    return safeUser;
  };

  const register = async (emailOrObj, password, name, role = "user") => {
    let payload;
    if (typeof emailOrObj === "object") {
      payload = emailOrObj;
    } else {
      payload = { email: emailOrObj, password, name, role };
    }
    const { data } = await api.post("/auth/register", payload);
    if (data.token && data.token !== "firebase_token_pending") {
      localStorage.setItem("bb_token", data.token);
      localStorage.setItem("bb_login_time", Date.now().toString());
      if (data.refreshToken) localStorage.setItem("bb_refresh_token", data.refreshToken);
      const safeUser = sanitizeUser(data.user);
      localStorage.setItem("bb_user", JSON.stringify(safeUser));
      setUser(safeUser);
    } else {
      const loginRes = await api.post("/auth/login", { email: payload.email, password: payload.password });
      localStorage.setItem("bb_token", loginRes.data.token);
      localStorage.setItem("bb_login_time", Date.now().toString());
      if (loginRes.data.refreshToken) localStorage.setItem("bb_refresh_token", loginRes.data.refreshToken);
      const safeUser = sanitizeUser(loginRes.data.user);
      localStorage.setItem("bb_user", JSON.stringify(safeUser));
      setUser(safeUser);
    }
    return true;
  };

  const requestOtp = async (email) => {
    const { data } = await api.post("/auth/request-otp", { email });
    return data;
  };

  const verifyOtp = async (email, otp) => {
    const { data } = await api.post("/auth/verify-otp", { email, otp });
    return data;
  };

  const googleLogin = async () => {
    try {
      const { initializeApp, getApps } = await import("firebase/app");
      const { getAuth, signInWithPopup, GoogleAuthProvider } = await import("firebase/auth");
      
      // IMPORTANT: appId must be the REAL Firebase Web App ID from Firebase Console.
      // Get it from: Firebase Console → Project Settings → Your Apps → Web App → App ID
      // It looks like: 1:725916822917:web:ACTUAL_HASH_HERE
      // Until you set it below, Google login may fail with auth/invalid-app errors.
      const firebaseConfig = {
        apiKey: "AIzaSyC1_gTlEJ_PMmd4GHdbforK7l3R9IcOQ9I",
        authDomain: "book-bridge-india-hopwhi.firebaseapp.com",
        projectId: "book-bridge-india-hopwhi",
        messagingSenderId: "725916822917",
        // TODO: Replace this with your real Web App ID from Firebase Console → Project Settings
        appId: "1:725916822917:web:bookbridge"
      };
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      provider.addScope("email");
      provider.addScope("profile");
      
      const result = await signInWithPopup(auth, provider);
      
      // Try to login via backend
      try {
        const idToken = await result.user.getIdToken();
        const { data } = await api.post("/auth/login-google", { token: idToken });
        
        localStorage.setItem("bb_token", data.token);
        localStorage.setItem("bb_login_time", Date.now().toString());
        if (data.refreshToken) localStorage.setItem("bb_refresh_token", data.refreshToken);
        const safeUser = sanitizeUser(data.user);
        localStorage.setItem("bb_user", JSON.stringify(safeUser));
        setUser(safeUser);
        
        return { success: true, user: safeUser };
      } catch (backendErr) {
        if (backendErr.response && backendErr.response.status === 404) {
          // User not found in DB — redirect to registration with Google data pre-filled
          return { success: false, email: result.user.email, name: result.user.displayName };
        }
        throw backendErr;
      }
    } catch (err) {
      // Map Firebase error codes to human-readable messages
      const code = err.code || "";
      const friendlyErrors = {
        "auth/unauthorized-domain": "Google sign-in is not configured for this domain. Please contact support or add this domain to Firebase Authorized Domains.",
        "auth/popup-blocked": "Your browser blocked the Google sign-in popup. Please allow pop-ups for this site and try again.",
        "auth/popup-closed-by-user": "Google sign-in was cancelled. Please try again.",
        "auth/cancelled-popup-request": "Google sign-in was cancelled. Please try again.",
        "auth/operation-not-allowed": "Google sign-in is not enabled in Firebase. Please contact support.",
        "auth/account-exists-with-different-credential": "An account already exists with this email using a different sign-in method. Please sign in with your password.",
        "auth/network-request-failed": "Network error. Please check your internet connection and try again.",
        "auth/invalid-api-key": "Firebase configuration error (invalid API key). Please contact support.",
        "auth/app-not-authorized": "This app is not authorized to use Firebase Authentication. Check Firebase Console configuration.",
      };
      const message = friendlyErrors[code] || `Google sign-in failed: ${code || err.message || "Unknown error"}`;
      console.error("[BookBridge] Google Auth Error — code:", code, "full error:", err);
      const enhancedErr = new Error(message);
      enhancedErr.code = code;
      throw enhancedErr;
    }
  };

  const logout = () => {
    localStorage.removeItem("bb_token");
    localStorage.removeItem("bb_refresh_token");
    localStorage.removeItem("bb_user");
    localStorage.removeItem("bb_login_time");
    clearCache();
    setUser(null);
  };

  const refresh = async () => {
    const { data } = await api.get("/auth/me");
    setUser(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setUser, requestOtp, verifyOtp, googleLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
