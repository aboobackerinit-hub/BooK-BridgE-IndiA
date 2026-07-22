import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { usePrefs } from "@/context/PrefsContext";
import api from "@/lib/api";
import { Store, Newspaper, Plus, MessageCircle, User, ShoppingBag } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const MobileNav = () => {
  const { t } = usePrefs();
  const { user } = useAuth();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const load = () => api.get("/cart").then((r) => setCartCount(r.data.items?.length || 0)).catch(() => {});
    load();
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, []);

  if (!user) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-border px-2 py-2 pb-safe flex items-center justify-around z-50">
      <NavLink
        to="/store"
        className={({ isActive }) =>
          `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] ${
            isActive ? "text-primary" : "text-muted-foreground"
          }`
        }
      >
        <Store className="w-5 h-5" />
        {t("store")}
      </NavLink>
      
      <NavLink
        to="/reviews"
        className={({ isActive }) =>
          `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] ${
            isActive ? "text-primary" : "text-muted-foreground"
          }`
        }
      >
        <Newspaper className="w-5 h-5" />
        {t("reviews")}
      </NavLink>

      <NavLink
        to="/sell"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center -mt-6 bg-primary text-primary-foreground w-12 h-12 rounded-full shadow-lg ${
            isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
          }`
        }
      >
        <Plus className="w-6 h-6" />
      </NavLink>

      <NavLink
        to="/chat"
        className={({ isActive }) =>
          `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] relative ${
            isActive ? "text-primary" : "text-muted-foreground"
          }`
        }
      >
        <MessageCircle className="w-5 h-5" />
        {t("chat")}
      </NavLink>

      <NavLink
        to={`/profile/${user.id}`}
        className={({ isActive }) =>
          `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] ${
            isActive ? "text-primary" : "text-muted-foreground"
          }`
        }
      >
        <User className="w-5 h-5" />
        {t("profile")}
      </NavLink>
    </nav>
  );
};

export default MobileNav;
