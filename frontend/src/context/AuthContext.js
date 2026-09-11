import React, { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";
import { initPushNotifications } from "@/lib/pushNotifications";

const AuthContext = createContext(null);

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
    if (!token) { setLoading(false); return; }
    api.get("/auth/me")
      .then((r) => {
        setUser(r.data);
        initPushNotifications(r.data);
      })
      .catch(() => localStorage.removeItem("bb_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("bb_token", data.token);
    setUser(data.user);
    return data.user;
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
      setUser(data.user);
    } else {
      const loginRes = await api.post("/auth/login", { email: payload.email, password: payload.password });
      localStorage.setItem("bb_token", loginRes.data.token);
      setUser(loginRes.data.user);
    }
    return true;
  };

  const logout = () => {
    localStorage.removeItem("bb_token");
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
