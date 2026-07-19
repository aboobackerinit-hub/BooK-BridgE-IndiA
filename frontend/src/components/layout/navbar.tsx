"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { BookOpen, Search, Menu, User, ShoppingCart, Heart, LogOut, MapPin } from "lucide-react";

export function Navbar() {
  const { user, dbUser } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-primary">
          <BookOpen className="w-6 h-6" />
          <span className="font-heading font-bold text-xl hidden sm:block text-foreground">
            BookBridge
          </span>
        </Link>

        {/* Location display (if available) */}
        {dbUser?.college && (
          <div className="hidden md:flex items-center text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            <MapPin className="w-4 h-4 mr-1.5" />
            <span className="truncate max-w-[200px]">{dbUser.college}</span>
          </div>
        )}

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/search">
            <Button variant="ghost" size="icon">
              <Search className="w-5 h-5" />
            </Button>
          </Link>
          
          {user ? (
            <>
              <Link href="/wishlist">
                <Button variant="ghost" size="icon">
                  <Heart className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/cart">
                <Button variant="ghost" size="icon">
                  <ShoppingCart className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="ghost" size="icon">
                  <User className="w-5 h-5" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost">Log in</Button>
              </Link>
              <Link href="/register">
                <Button>Sign up</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="md:hidden border-t p-4 space-y-4 bg-background">
          <Link href="/search" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <Search className="w-5 h-5" /> Search
          </Link>
          {user ? (
            <>
              <Link href="/wishlist" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <Heart className="w-5 h-5" /> Wishlist
              </Link>
              <Link href="/cart" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <ShoppingCart className="w-5 h-5" /> Cart
              </Link>
              <Link href="/profile" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <User className="w-5 h-5" /> Profile
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-2 text-destructive hover:text-destructive/80">
                <LogOut className="w-5 h-5" /> Logout
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <Link href="/login">
                <Button variant="outline" className="w-full">Log in</Button>
              </Link>
              <Link href="/register">
                <Button className="w-full">Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
