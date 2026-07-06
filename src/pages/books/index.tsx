import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { BookCard } from '@/components/BookCard';
import { HiFilter, HiChevronDown } from 'react-icons/hi';
import { Book } from '@/types';

export default function BooksPage() {
  const [filters, setFilters] = useState({
    category: '',
    condition: '',
    priceMin: 0,
    priceMax: 10000,
    language: '',
    location: '',
  });

  const [sortBy, setSortBy] = useState('newest');

  const mockBooks: Book[] = [
    {
      id: '1',
      title: 'The Alchemist',
      author: 'Paulo Coelho',
      publisher: 'Penguin',
      isbn: '9780061122415',
      edition: '1st',
      language: 'English',
      pages: 224,
      category: 'Fiction',
      subcategory: 'Novels',
      description: 'A masterpiece about self-discovery',
      condition: 'like-new',
      price: 250,
      negotiable: true,
      seller_id: 'seller1',
      image_urls: ['https://via.placeholder.com/200x300'],
      location: 'Mumbai, Maharashtra',
      latitude: 19.0760,
      longitude: 72.8777,
      availability: 'in-stock',
      book_type: 'buy',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      id: '2',
      title: 'Atomic Habits',
      author: 'James Clear',
      publisher: 'Avery',
      isbn: '9780735211292',
      edition: '1st',
      language: 'English',
      pages: 320,
      category: 'Self-Help',
      subcategory: 'Habits',
      description: 'Build good habits and break bad ones',
      condition: 'good',
      price: 350,
      negotiable: false,
      seller_id: 'seller2',
      image_urls: ['https://via.placeholder.com/200x300'],
      location: 'Delhi, NCR',
      latitude: 28.7041,
      longitude: 77.1025,
      availability: 'in-stock',
      book_type: 'buy',
      created_at: '2024-01-02',
      updated_at: '2024-01-02',
    },
  ];

  return (
    <Layout title="Browse Books - BookBridge India">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8">Browse Books</h1>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-card p-6 sticky top-24 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center space-x-2">
                  <HiFilter className="w-5 h-5" />
                  <span>Filters</span>
                </h3>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Categories</option>
                  <option value="fiction">Fiction</option>
                  <option value="non-fiction">Non-Fiction</option>
                  <option value="exam">Competitive Exams</option>
                  <option value="engineering">Engineering</option>
                  <option value="medical">Medical</option>
                </select>
              </div>

              {/* Condition Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                <div className="space-y-2">
                  {['new', 'like-new', 'good', 'fair'].map((condition) => (
                    <label key={condition} className="flex items-center">
                      <input type="checkbox" className="rounded" />
                      <span className="ml-2 text-sm text-gray-600 capitalize">{condition}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    value={filters.priceMax}
                    onChange={(e) => setFilters({ ...filters, priceMax: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm">
                    <span>₹{filters.priceMin}</span>
                    <span>₹{filters.priceMax}</span>
                  </div>
                </div>
              </div>

              {/* Language Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                <select
                  value={filters.language}
                  onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Languages</option>
                  <option value="english">English</option>
                  <option value="hindi">Hindi</option>
                  <option value="marathi">Marathi</option>
                  <option value="gujarati">Gujarati</option>
                </select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  placeholder="Enter city"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition">
                Clear Filters
              </button>
            </div>
          </div>

          {/* Books Grid */}
          <div className="lg:col-span-3">
            {/* Sort Options */}
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">Showing {mockBooks.length} books</p>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="nearest">Nearest</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>
            </div>

            {/* Books Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {mockBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
