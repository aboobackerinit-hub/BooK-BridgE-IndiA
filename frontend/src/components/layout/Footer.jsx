import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="hidden md:block bg-white border-t border-gray-200 mt-12 py-12 pb-24 md:pb-12 text-sm text-gray-600">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h4 className="font-semibold mb-4 text-gray-900">Legal &amp; Policies</h4>
          <ul className="space-y-2">
            <li><Link to="/legal/terms" className="hover:text-primary">Terms &amp; Conditions</Link></li>
            <li><Link to="/legal/privacy" className="hover:text-primary">Privacy Policy</Link></li>
            <li><Link to="/legal/marketplace-rules" className="hover:text-primary">Marketplace Rules</Link></li>
            <li><Link to="/legal/refunds" className="hover:text-primary">Refunds &amp; Cancellations</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4 text-gray-900">Safety &amp; Trust</h4>
          <ul className="space-y-2">
            <li><Link to="/legal/prohibited" className="hover:text-primary">Prohibited Items</Link></li>
            <li><Link to="/legal/safety" className="hover:text-primary">Safety Tips</Link></li>
            <li><Link to="/legal/ip" className="hover:text-primary">Intellectual Property</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-4 text-gray-900">Help &amp; Support</h4>
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
