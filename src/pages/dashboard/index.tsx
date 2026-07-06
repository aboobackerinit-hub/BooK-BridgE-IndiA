import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import { HiEye, HiPencil, HiTrash, HiPlus, HiChartBar } from 'react-icons/hi';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  React.useEffect(() => {
    if (!user || (user.role !== 'seller' && user.role !== 'bookstore' && user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, router]);

  const stats = [
    { label: 'Total Books', value: 42, icon: '📚' },
    { label: 'Books Sold', value: 15, icon: '✓' },
    { label: 'Active Listings', value: 27, icon: '🔴' },
    { label: 'Revenue', value: '₹45,000', icon: '💰' },
  ];

  const recentListings = [
    {
      id: 1,
      title: 'The Alchemist',
      price: 250,
      views: 145,
      status: 'active',
      date: '2 days ago',
    },
    {
      id: 2,
      title: 'Atomic Habits',
      price: 350,
      views: 89,
      status: 'active',
      date: '1 week ago',
    },
    {
      id: 3,
      title: 'Sapiens',
      price: 450,
      views: 234,
      status: 'sold',
      date: '3 days ago',
    },
  ];

  return (
    <Layout title="Seller Dashboard - BookBridge India">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.full_name}</p>
          </div>
          <button
            onClick={() => router.push('/sell')}
            className="flex items-center space-x-2 px-6 py-3 bg-primary text-white rounded-lg font-bold hover:opacity-90 transition"
          >
            <HiPlus className="w-5 h-5" />
            <span>List New Book</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white rounded-card p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <span className="text-4xl">{stat.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-gray-200 mb-8">
          {['overview', 'listings', 'orders', 'analytics'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium border-b-2 transition ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold mb-4">Recent Listings</h2>
              <div className="bg-white rounded-card overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Book Title</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Price</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Views</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentListings.map((listing) => (
                      <tr key={listing.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{listing.title}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">₹{listing.price}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{listing.views}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            listing.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {listing.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm flex space-x-2">
                          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded">
                            <HiEye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded">
                            <HiPencil className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded">
                            <HiTrash className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-4">Quick Stats</h2>
              <div className="bg-white rounded-card p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avg. Views/Listing</span>
                  <span className="font-bold">156</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Conversion Rate</span>
                  <span className="font-bold">8.5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avg. Response Time</span>
                  <span className="font-bold">2.3h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Rating</span>
                  <span className="font-bold">4.8 ⭐</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'listings' && (
          <div className="bg-white rounded-card p-8 text-center">
            <p className="text-gray-600">Detailed listings management coming soon</p>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-card p-8 text-center">
            <p className="text-gray-600">Orders management coming soon</p>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white rounded-card p-8 text-center">
            <p className="text-gray-600">Analytics dashboard coming soon</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
