import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { HiArrowRight } from 'react-icons/hi';
import { supabase } from '@/lib/supabase';
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from '@/lib/siteConfig';
import type { Book } from '@/types';

export default function Home() {
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeaturedBooks = async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('availability', 'in-stock')
        .order('created_at', { ascending: false })
        .limit(4);

      if (!error && data) {
        setFeaturedBooks(data as Book[]);
      }
      setLoading(false);
    };

    loadFeaturedBooks();
  }, []);

  const categories = [
    { name: 'Novels', icon: '📖', color: 'bg-blue-100' },
    { name: 'Competitive Exams', icon: '📚', color: 'bg-green-100' },
    { name: 'Engineering', icon: '🔧', color: 'bg-orange-100' },
    { name: 'Medical', icon: '⚕️', color: 'bg-red-100' },
    { name: 'Children', icon: '🧸', color: 'bg-pink-100' },
    { name: 'Comics', icon: '💭', color: 'bg-purple-100' },
    { name: 'History', icon: '🏛️', color: 'bg-yellow-100' },
    { name: 'Foreign', icon: '🌍', color: 'bg-indigo-100' },
  ];

  return (
    <Layout title={`Home - ${APP_NAME}`} description={APP_DESCRIPTION}>
      {/* Hero Section */}
      <section className="relative bg-gradient-primary text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-10 text-6xl">📚</div>
          <div className="absolute top-20 right-20 text-5xl">✨</div>
          <div className="absolute bottom-10 left-1/3 text-6xl">📖</div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                {APP_TAGLINE}
              </h1>
              <p className="text-lg md:text-xl text-gray-100 mb-8 max-w-lg">
                {APP_DESCRIPTION}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/books" className="px-8 py-4 bg-accent text-gray-900 rounded-lg font-bold hover:opacity-90 transition flex items-center justify-center space-x-2">
                  <span>Explore Books</span>
                  <HiArrowRight className="w-5 h-5" />
                </Link>
                <Link href="/sell" className="px-8 py-4 bg-white bg-opacity-20 text-white rounded-lg font-bold hover:bg-opacity-30 transition flex items-center justify-center space-x-2 border border-white">
                  <span>Sell Your Book</span>
                  <HiArrowRight className="w-5 h-5" />
                </Link>
              </div>
              <div className="mt-12 grid grid-cols-3 gap-6">
                <div>
                  <p className="text-3xl font-bold">5M+</p>
                  <p className="text-sm text-gray-200">Books Listed</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">1M+</p>
                  <p className="text-sm text-gray-200">Active Users</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">₹1B+</p>
                  <p className="text-sm text-gray-200">Transactions</p>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <div className="relative w-64 h-96 bg-white bg-opacity-10 rounded-card">
                <div className="absolute inset-0 flex items-center justify-center text-9xl">📚</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Why Choose BookBridge?</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="bg-white rounded-card p-8 text-center hover:shadow-lg transition">
              <div className="text-4xl mb-4">🛒</div>
              <h3 className="font-bold text-lg mb-2">Buy & Sell</h3>
              <p className="text-gray-600 text-sm">Buy affordable books from verified sellers or sell your collection easily.</p>
            </div>
            <div className="bg-white rounded-card p-8 text-center hover:shadow-lg transition">
              <div className="text-4xl mb-4">🔄</div>
              <h3 className="font-bold text-lg mb-2">Exchange</h3>
              <p className="text-gray-600 text-sm">Swap books with other readers and get new titles without spending money.</p>
            </div>
            <div className="bg-white rounded-card p-8 text-center hover:shadow-lg transition">
              <div className="text-4xl mb-4">💝</div>
              <h3 className="font-bold text-lg mb-2">Donate</h3>
              <p className="text-gray-600 text-sm">Contribute to education by donating books to NGOs and schools.</p>
            </div>
            <div className="bg-white rounded-card p-8 text-center hover:shadow-lg transition">
              <div className="text-4xl mb-4">🏠</div>
              <h3 className="font-bold text-lg mb-2">Rent</h3>
              <p className="text-gray-600 text-sm">Rent books for a fraction of the price with flexible rental periods.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-12">Explore Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link key={cat.name} href={`/books?category=${cat.name.toLowerCase()}`}>
                <div className={`${cat.color} rounded-card p-6 text-center cursor-pointer hover:shadow-lg transition`}>
                  <div className="text-4xl mb-2">{cat.icon}</div>
                  <h3 className="font-bold text-gray-900">{cat.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Books */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Featured Books</h2>
            <Link href="/books" className="text-primary hover:text-opacity-80 flex items-center space-x-2">
              <span>View All</span>
              <HiArrowRight className="w-5 h-5" />
            </Link>
          </div>
          {loading ? (
            <div className="text-center text-gray-500">Loading featured books…</div>
          ) : featuredBooks.length === 0 ? (
            <div className="rounded-card border border-dashed border-gray-300 p-8 text-center text-gray-500">
              No books are available yet. Start by adding a book listing through the Sell page.
            </div>
          ) : (
            <div className="grid md:grid-cols-4 gap-6">
              {featuredBooks.map((book) => (
                <Link key={book.id} href={`/book/${book.id}`}>
                  <div className="bg-white rounded-card overflow-hidden hover:shadow-lg transition cursor-pointer">
                    <div className="relative aspect-[3/4] bg-gray-100 flex items-center justify-center overflow-hidden group">
                      {book.image_urls?.[0] ? (
                        <img src={book.image_urls[0]} alt={book.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="text-6xl">📚</div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition"></div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 line-clamp-2">{book.title}</h3>
                      <p className="text-sm text-gray-500 mb-2">{book.author}</p>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-primary text-lg">₹{book.price}</span>
                        <span className="text-xs bg-accent text-gray-900 px-2 py-1 rounded">{book.condition}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Start?</h2>
          <p className="text-lg text-gray-100 mb-8 max-w-2xl mx-auto">
            Join thousands of readers, students, and collectors already using BookBridge to find, share, and exchange books.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup" className="px-8 py-4 bg-accent text-gray-900 rounded-lg font-bold hover:opacity-90 transition">
              Create Free Account
            </Link>
            <Link href="/contact" className="px-8 py-4 bg-white bg-opacity-20 text-white rounded-lg font-bold hover:bg-opacity-30 transition border border-white">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
