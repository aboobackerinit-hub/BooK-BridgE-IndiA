import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingBag, Heart, Search, User, ShieldCheck, Menu, X, LogOut, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

export const GoShopNavbar = ({ cartCount = 0, wishlistCount = 0 }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/goshop/catalog?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 text-zinc-100 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Section */}
          <Link to="/goshop" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-0.5 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-outfit font-extrabold text-xl tracking-tight text-white leading-none">
                GOSHOP
              </span>
              <span className="font-outfit font-bold text-xs tracking-[0.25em] text-amber-400 leading-tight">
                STORE
              </span>
            </div>
          </Link>

          {/* Desktop Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md mx-8 relative">
            <Input
              type="text"
              placeholder="Search products, brands, luxury items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/80 border-zinc-800 text-zinc-200 placeholder:text-zinc-500 rounded-full pl-11 pr-4 h-10 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
            />
            <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </form>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            <Link to="/goshop" className={`hover:text-amber-400 transition-colors ${location.pathname === "/goshop" ? "text-amber-400 font-semibold" : "text-zinc-300"}`}>
              Home
            </Link>
            <Link to="/goshop/catalog" className={`hover:text-amber-400 transition-colors ${location.pathname.startsWith("/goshop/catalog") ? "text-amber-400 font-semibold" : "text-zinc-300"}`}>
              Catalog
            </Link>
            <Link to="/goshop/catalog?featured=true" className="text-zinc-300 hover:text-amber-400 transition-colors">
              Featured
            </Link>
            {user?.role === "admin" && (
              <Link to="/goshop/admin" className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
                <ShieldCheck className="w-4 h-4" /> Admin Panel
              </Link>
            )}
          </nav>

          {/* User & Cart Controls */}
          <div className="flex items-center gap-3">
            
            {/* Wishlist */}
            <Link to={user ? "/goshop/dashboard?tab=wishlist" : "/goshop/auth"} className="relative p-2.5 text-zinc-300 hover:text-amber-400 transition-colors rounded-full hover:bg-zinc-900">
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-amber-500 text-zinc-950 font-bold text-[10px] w-5 h-5 flex items-center justify-center rounded-full p-0">
                  {wishlistCount}
                </Badge>
              )}
            </Link>

            {/* Cart Drawer Link */}
            <Link to="/goshop/cart" className="relative p-2.5 text-zinc-300 hover:text-amber-400 transition-colors rounded-full hover:bg-zinc-900">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-amber-500 text-zinc-950 font-bold text-[10px] w-5 h-5 flex items-center justify-center rounded-full p-0">
                  {cartCount}
                </Badge>
              )}
            </Link>

            {/* User Auth Profile */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link to="/goshop/dashboard" className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 text-xs text-zinc-200 transition-all">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span className="max-w-[90px] truncate">{user.name || "Account"}</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={logout} title="Logout" className="text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-full">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Link to="/goshop/auth">
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-full px-4 transition-transform hover:scale-105">
                  Sign In
                </Button>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <Button variant="ghost" size="icon" className="lg:hidden text-zinc-300 rounded-full" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>

          </div>

        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-zinc-950 border-b border-zinc-800 px-4 pt-2 pb-6 space-y-4">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-zinc-200 rounded-full pl-10 h-10 w-full"
            />
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </form>
          <div className="flex flex-col gap-3 font-medium text-sm pt-2">
            <Link to="/goshop" onClick={() => setMobileMenuOpen(false)} className="text-zinc-300 hover:text-amber-400">Home</Link>
            <Link to="/goshop/catalog" onClick={() => setMobileMenuOpen(false)} className="text-zinc-300 hover:text-amber-400">All Products</Link>
            <Link to="/goshop/catalog?featured=true" onClick={() => setMobileMenuOpen(false)} className="text-zinc-300 hover:text-amber-400">Featured Items</Link>
            {user && (
              <Link to="/goshop/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-zinc-300 hover:text-amber-400">My Account & Orders</Link>
            )}
            {user?.role === "admin" && (
              <Link to="/goshop/admin" onClick={() => setMobileMenuOpen(false)} className="text-amber-400 font-semibold">Admin Dashboard</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
