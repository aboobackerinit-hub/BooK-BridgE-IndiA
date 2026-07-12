import React, { useEffect, useState, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { usePrefs } from "@/context/PrefsContext";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  BookOpen, Store, Newspaper, ShoppingBag, MessageCircle,
  Settings, LayoutDashboard, LogOut, User, Package, Moon, Sun, Bell, Plus
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const dashboardRoute = (role) => {
  if (role === "admin") return "/admin";
  if (role === "store_owner") return "/store-owner";
  if (role === "publisher") return "/publisher";
  return null;
};

const TopNav = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme, t } = usePrefs();
  const navigate = useNavigate();
  const dashRoute = dashboardRoute(user?.role);
  const [cartCount, setCartCount] = useState(0);
  const [notif, setNotif] = useState({ unread_messages: 0, recent: [], pending_orders: 0 });
  const lastSeenRef = useRef(0);

  useEffect(() => {
    const load = () => api.get("/cart").then((r) => setCartCount(r.data.items?.length || 0)).catch(() => {});
    load();
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!user?.notifications_enabled) { setNotif({ unread_messages: 0, recent: [], pending_orders: 0 }); return; }
    const loadNotif = async () => {
      try {
        const { data } = await api.get("/notifications");
        setNotif(data);
        const total = (data.unread_messages || 0) + (data.pending_orders || 0);
        if (total > lastSeenRef.current && lastSeenRef.current > 0) {
          const latest = data.recent?.[0];
          if (latest) {
            const { toast } = require("sonner");
            toast(`💬 ${latest.from_user_name}`, { description: latest.text });
          }
        }
        lastSeenRef.current = total;
      } catch {}
    };
    loadNotif();
    const iv = setInterval(loadNotif, 12000);
    return () => clearInterval(iv);
  }, [user?.notifications_enabled]);

  const NAV = [
    { to: "/store", label: t("store"), icon: Store, testid: "nav-store" },
    { to: "/reviews", label: t("reviews"), icon: Newspaper, testid: "nav-reviews" },
    { to: "/chat", label: t("chat"), icon: MessageCircle, testid: "nav-chat" },
  ];

  return (
    <header className="glass sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/store" className="flex items-center gap-2 group" data-testid="brand-link">
          <div className="w-9 h-9 rounded-xl spine flex items-center justify-center shadow-md">
            <BookOpen className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <div className="font-serif text-lg font-bold text-foreground">BookBridge</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground -mt-1">India</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={n.testid}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <n.icon className="w-4 h-4" aria-hidden="true" />
              {n.label}
            </NavLink>
          ))}
          {dashRoute && (
            <NavLink
              to={dashRoute}
              data-testid="nav-dashboard"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-secondary/10 text-secondary"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
              {t("dashboard")}
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user?.notifications_enabled && (notif.unread_messages > 0 || notif.pending_orders > 0) && (
            <button
              onClick={() => navigate("/chat")}
              className="relative w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              data-testid="notif-bell-btn"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-semibold">
                {notif.unread_messages + notif.pending_orders}
              </span>
            </button>
          )}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            data-testid="theme-toggle-btn"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-muted transition-colors" data-testid="user-menu-trigger">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {user?.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-medium leading-tight">{user?.name}</div>
                  <div className="text-[10px] font-mono text-muted-foreground leading-tight">{user?.bbid}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="font-serif">{user?.name}</div>
                <div className="text-xs text-muted-foreground font-normal capitalize">{user?.role?.replace("_", " ")}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(`/profile/${user?.id}`)} data-testid="menu-my-profile">
                <User className="w-4 h-4 mr-2" /> {t("profile")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/sell")} data-testid="menu-sell-book" className="text-primary focus:text-primary">
                <Plus className="w-4 h-4 mr-2" /> Sell a Book
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/cart")} data-testid="menu-cart">
                <ShoppingBag className="w-4 h-4 mr-2" /> {t("cart")}
                {cartCount > 0 && <Badge className="ml-auto bg-primary text-primary-foreground">{cartCount}</Badge>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/orders")} data-testid="menu-my-orders">
                <Package className="w-4 h-4 mr-2" /> {t("orders")}
              </DropdownMenuItem>
              {dashRoute && (
                <DropdownMenuItem onClick={() => navigate(dashRoute)} data-testid="menu-dashboard">
                  <LayoutDashboard className="w-4 h-4 mr-2" /> {t("dashboard")}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")} data-testid="menu-settings">
                <Settings className="w-4 h-4 mr-2" /> {t("settings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { logout(); navigate("/login"); }} data-testid="menu-logout">
                <LogOut className="w-4 h-4 mr-2" /> {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t border-border px-2 py-2 flex items-center justify-around">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`
          }>
            <n.icon className="w-5 h-5" />
            {n.label}
          </NavLink>
        ))}
        <button onClick={() => navigate("/cart")} className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] text-muted-foreground relative">
          <ShoppingBag className="w-5 h-5" />
          {cartCount > 0 && <span className="absolute -top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center">{cartCount}</span>}
          {t("cart")}
        </button>
      </div>
    </header>
  );
};

export default TopNav;
