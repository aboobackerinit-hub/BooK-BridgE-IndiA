import React from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuth();

  React.useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  const stats = [
    { label: 'Books Listed', value: 42 },
    { label: 'Books Bought', value: 15 },
    { label: 'Books Sold', value: 8 },
    { label: 'Rating', value: '4.8 ⭐' },
  ];

  return (
    <Layout title="My Profile - BookBridge India">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Profile Header */}
        <div className="bg-white rounded-card p-8 border border-gray-200 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="flex items-center space-x-6 mb-6 md:mb-0">
              <div className="w-24 h-24 bg-gradient-primary rounded-full flex items-center justify-center text-4xl">
                👤
              </div>
              <div>
                <h1 className="text-2xl font-bold">{user?.full_name}</h1>
                <p className="text-gray-600">{user?.email}</p>
                <p className="text-gray-600 mt-1">📍 {user?.location || 'Location not set'}</p>
              </div>
            </div>
            <button className="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
              Edit Profile
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-gray-600 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-primary mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-6">My Listings</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((item) => (
                <div key={item} className="bg-white rounded-card overflow-hidden border border-gray-200 cursor-pointer hover:shadow-lg transition">
                  <div className="aspect-[3/4] bg-gray-100 text-6xl flex items-center justify-center">
                    📚
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold">Book Title</h3>
                    <p className="text-primary font-bold mt-2">₹299</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
