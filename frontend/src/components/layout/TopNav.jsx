import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Store, Newspaper, ShoppingBag, MessageCircle,
  Settings, LayoutDashboard, LogOut, Search
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/store", label: "Store", icon: Store, testid: "nav-store" },
  { to: "/reviews", label: "Reviews", icon: Newspaper, testid: "nav-reviews" },
  { to: "/cart", label: "Cart", icon: ShoppingBag, testid: "nav-cart" },
  { to: "/chat", label: "Discussion", icon: MessageCircle, testid: "nav-chat" },
];

const dashboardRoute = (role) => {
  if (role === "admin") return "/admin";
  if (role === "store_owner") return "/store-owner";
  if (role === "publisher") return "/publisher";
  return null;
};

const TopNav = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dashRoute = dashboardRoute(user?.role);

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
              Dashboard
            </NavLink>
          )}
        </nav>

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
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-serif">{user?.name}</div>
              <div className="text-xs text-muted-foreground font-normal capitalize">{user?.role?.replace("_", " ")}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(`/profile/${user?.id}`)} data-testid="menu-my-profile">
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")} data-testid="menu-settings">
              <Settings className="w-4 h-4 mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/orders")} data-testid="menu-my-orders">
              My Orders
            </DropdownMenuItem>
            {dashRoute && (
              <DropdownMenuItem onClick={() => navigate(dashRoute)} data-testid="menu-dashboard">
                <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { logout(); navigate("/login"); }} data-testid="menu-logout">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
      </div>
    </header>
  );
};

export default TopNav;
