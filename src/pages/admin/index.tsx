import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import { HiUsers, HiBookOpen, HiShoppingCart, HiCog, HiChartBar } from 'react-icons/hi';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  React.useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
    }
  }, [user, router]);

  const stats = [
    { label: 'Total Users', value: '1.2M', icon: HiUsers, color: 'bg-blue-100 text-blue-600' },
    { label: 'Total Books', value: '5.4M', icon: HiBookOpen, color: 'bg-green-100 text-green-600' },
    { label: 'Total Orders', value: '428K', icon: HiShoppingCart, color: 'bg-purple-100 text-purple-600' },
    { label: 'Revenue', value: '₹2.3Cr', icon: HiChartBar, color: 'bg-orange-100 text-orange-600' },
  ];

  return (
    <Layout title="Admin Dashboard - BookBridge India">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-white rounded-card p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-gray-200 mb-8 overflow-x-auto">
          {['overview', 'users', 'books', 'orders', 'reports', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium border-b-2 transition whitespace-nowrap ${
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
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-card p-6">
                <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b">
                    <span>New user registered</span>
                    <span className="text-sm text-gray-500">2 mins ago</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b">
                    <span>New book listing</span>
                    <span className="text-sm text-gray-500">5 mins ago</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b">
                    <span>Order completed</span>
                    <span className="text-sm text-gray-500">12 mins ago</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-card p-6">
                <h2 className="text-lg font-bold mb-4">System Status</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">API</span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">Online</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Database</span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">Online</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Storage</span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">Online</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white rounded-card p-6">
              <h2 className="text-lg font-bold mb-4">User Management</h2>
              <p className="text-gray-600">User management interface coming soon</p>
            </div>
          )}

          {activeTab === 'books' && (
            <div className="bg-white rounded-card p-6">
              <h2 className="text-lg font-bold mb-4">Books Management</h2>
              <p className="text-gray-600">Books moderation interface coming soon</p>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="bg-white rounded-card p-6">
              <h2 className="text-lg font-bold mb-4">Orders Management</h2>
              <p className="text-gray-600">Orders management interface coming soon</p>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="bg-white rounded-card p-6">
              <h2 className="text-lg font-bold mb-4">Reports & Analytics</h2>
              <p className="text-gray-600">Advanced analytics coming soon</p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-card p-6">
              <h2 className="text-lg font-bold mb-4">System Settings</h2>
              <p className="text-gray-600">Settings management coming soon</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
