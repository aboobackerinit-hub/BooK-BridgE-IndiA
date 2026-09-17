import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const legalLinks = [
  { path: '/legal/terms', label: 'Terms & Conditions' },
  { path: '/legal/privacy', label: 'Privacy Policy' },
  { path: '/legal/marketplace-rules', label: 'Marketplace Rules' },
  { path: '/legal/refunds', label: 'Refunds & Cancellations' },
  { path: '/legal/prohibited', label: 'Prohibited Items' },
  { path: '/legal/safety', label: 'Safety Tips' },
  { path: '/legal/ip', label: 'Intellectual Property' },
  { path: '/legal/grievance', label: 'Grievance Officer' },
  { path: '/legal/faq', label: 'FAQ' },
];

export const LegalLayout = () => {
  return (
    <div className="flex flex-col md:flex-row gap-8 min-h-[60vh]">
      <aside className="w-full md:w-64 shrink-0">
        <div className="bg-white rounded-xl shadow-sm border p-4 sticky top-24">
          <h2 className="font-semibold text-lg mb-4 text-gray-900 px-3">Legal & Policies</h2>
          <nav className="flex flex-col space-y-1">
            {legalLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
      <main className="flex-1 bg-white rounded-xl shadow-sm border p-6 md:p-8">
        <div className="prose prose-sm md:prose-base max-w-none text-gray-700">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
