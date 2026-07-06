import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/supabase';
import { HiMenu, HiX, HiSearch, HiShoppingCart, HiUser, HiPlus } from 'react-icons/hi';
import toast from 'react-hot-toast';

export const Header = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">📚</span>
            </div>
            <span className="font-bold text-xl text-gray-900 hidden sm:inline">BookBridge</span>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 mx-8">
            <div className="w-full relative">
              <input
                type="text"
                placeholder="Search books, authors, ISBN..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <HiSearch className="absolute right-3 top-2.5 text-gray-400 w-5 h-5" />
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {user ? (
              <>
                <Link href="/sell" className="flex items-center space-x-1 text-gray-700 hover:text-primary transition">
                  <HiPlus className="w-5 h-5" />
                  <span>Sell</span>
                </Link>
                <Link href="/wishlist" className="flex items-center space-x-1 text-gray-700 hover:text-primary transition">
                  <HiShoppingCart className="w-5 h-5" />
                  <span>Wishlist</span>
                </Link>
                <div className="relative group">
                  <button className="flex items-center space-x-1 text-gray-700 hover:text-primary transition">
                    <HiUser className="w-5 h-5" />
                    <span>{user.full_name}</span>
                  </button>
                  <div className="hidden group-hover:block absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2">
                    <Link href="/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">Profile</Link>
                    {user.role === 'seller' || user.role === 'bookstore' ? (
                      <Link href="/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">Seller Dashboard</Link>
                    ) : null}
                    {user.role === 'admin' ? (
                      <Link href="/admin" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">Admin Dashboard</Link>
                    ) : null}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-gray-700 hover:text-primary transition">
                  Sign In
                </Link>
                <Link href="/auth/signup" className="px-4 py-2 bg-gradient-primary text-white rounded-lg hover:opacity-90 transition">
                  Get Started
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            {isOpen ? <HiX className="w-6 h-6" /> : <HiMenu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <input
              type="text"
              placeholder="Search books..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            {user ? (
              <>
                <Link href="/sell" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">Sell Book</Link>
                <Link href="/wishlist" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">Wishlist</Link>
                <Link href="/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">Profile</Link>
                {user.role === 'seller' || user.role === 'bookstore' ? (
                  <Link href="/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">Dashboard</Link>
                ) : null}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">Sign In</Link>
                <Link href="/auth/signup" className="block px-4 py-2 bg-gradient-primary text-white rounded">Get Started</Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
