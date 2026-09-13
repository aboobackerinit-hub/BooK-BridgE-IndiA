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
          localStorage.removeItem("bb_user");
          clearCache();
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("bb_token", data.token);
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
      const safeUser = sanitizeUser(data.user);
      localStorage.setItem("bb_user", JSON.stringify(safeUser));
      setUser(safeUser);
    } else {
      const loginRes = await api.post("/auth/login", { email: payload.email, password: payload.password });
      localStorage.setItem("bb_token", loginRes.data.token);
      const safeUser = sanitizeUser(loginRes.data.user);
      localStorage.setItem("bb_user", JSON.stringify(safeUser));
      setUser(safeUser);
    }
    return true;
  };

  const logout = () => {
    localStorage.removeItem("bb_token");
    localStorage.removeItem("bb_user");
    clearCache();
    setUser(null);
  };

  const refresh = async () => {
    const { data } = await api.get("/auth/me");
    setUser(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
