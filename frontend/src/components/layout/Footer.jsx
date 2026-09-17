import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12 py-12 pb-24 md:pb-12 text-sm text-gray-600">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="font-bold text-lg mb-4 text-gray-900">BookBridge</h3>
          <p className="mb-4">Your trusted platform for buying and selling books across India.</p>
          <p className="text-xs text-gray-500">
            <strong>Registered Address:</strong><br />
            [Placeholder Company Name] Pvt. Ltd.<br />
            [Placeholder Building/Street],<br />
            [Placeholder City, State, Pincode]
          </p>
          <p className="text-xs text-gray-500 mt-2">
            CIN: [Placeholder CIN Number]
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold mb-4 text-gray-900">Legal & Policies</h4>
          <ul className="space-y-2">
            <li><Link to="/legal/terms" className="hover:text-primary">Terms & Conditions</Link></li>
            <li><Link to="/legal/privacy" className="hover:text-primary">Privacy Policy</Link></li>
            <li><Link to="/legal/marketplace-rules" className="hover:text-primary">Marketplace Rules</Link></li>
            <li><Link to="/legal/refunds" className="hover:text-primary">Refunds & Cancellations</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4 text-gray-900">Safety & Trust</h4>
          <ul className="space-y-2">
            <li><Link to="/legal/prohibited" className="hover:text-primary">Prohibited Items</Link></li>
            <li><Link to="/legal/safety" className="hover:text-primary">Safety Tips</Link></li>
            <li><Link to="/legal/ip" className="hover:text-primary">Intellectual Property</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4 text-gray-900">Help & Support</h4>
          <ul className="space-y-2">
            <li><Link to="/legal/faq" className="hover:text-primary">FAQ</Link></li>
            <li><Link to="/legal/grievance" className="hover:text-primary">Grievance Officer</Link></li>
            <li><a href="mailto:support@bookbridge.placeholder" className="hover:text-primary">Contact Us</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-gray-200 text-center text-xs text-gray-500">
        &copy; {new Date().getFullYear()} BookBridge. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
