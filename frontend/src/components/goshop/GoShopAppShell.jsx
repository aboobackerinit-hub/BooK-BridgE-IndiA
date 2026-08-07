import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { GoShopNavbar } from "@/components/goshop/GoShopNavbar";
import { GoShopFooter } from "@/components/goshop/GoShopFooter";
import { GoShopThemeProvider, useGoShopTheme } from "@/context/GoShopThemeContext";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

const InnerShell = () => {
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const { user } = useAuth();
  const { isDark } = useGoShopTheme();

  const fetchCounts = async () => {
    if (user) {
      try {
        const [cartRes, wishRes] = await Promise.all([
          api.get("/goshop/cart"),
          api.get("/goshop/wishlist")
        ]);
        setCartCount(cartRes.data.items?.length || 0);
        setWishlistCount(wishRes.data?.length || 0);
      } catch (e) {}
    } else {
      setCartCount(0);
      setWishlistCount(0);
    }
  };

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className={`min-h-screen flex flex-col font-outfit antialiased selection:bg-amber-500 selection:text-zinc-950 transition-colors duration-300 ${
      isDark ? "bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-900"
    }`}>
      <GoShopNavbar cartCount={cartCount} wishlistCount={wishlistCount} />
      <main className="flex-1">
        <Outlet />
      </main>
      <GoShopFooter />
    </div>
  );
};

export const GoShopAppShell = () => {
  return (
    <GoShopThemeProvider>
      <InnerShell />
    </GoShopThemeProvider>
  );
};
