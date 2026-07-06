import React from 'react';
import Link from 'next/link';
import { FiFacebook, FiTwitter, FiInstagram, FiMail } from 'react-icons/fi';

export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-100 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Company */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-white">BookBridge</h3>
            <p className="text-sm text-gray-400">Every Book Finds a Reader. India's largest marketplace for books.</p>
            <div className="flex space-x-4 mt-4">
              <a href="#" className="hover:text-primary transition"><FiFacebook className="w-5 h-5" /></a>
              <a href="#" className="hover:text-primary transition"><FiTwitter className="w-5 h-5" /></a>
              <a href="#" className="hover:text-primary transition"><FiInstagram className="w-5 h-5" /></a>
              <a href="#" className="hover:text-primary transition"><FiMail className="w-5 h-5" /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="text-gray-400 hover:text-primary transition">Home</Link></li>
              <li><Link href="/books" className="text-gray-400 hover:text-primary transition">Explore Books</Link></li>
              <li><Link href="/sell" className="text-gray-400 hover:text-primary transition">Sell Books</Link></li>
              <li><Link href="/about" className="text-gray-400 hover:text-primary transition">About Us</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/help" className="text-gray-400 hover:text-primary transition">Help Center</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-primary transition">Contact Us</Link></li>
              <li><Link href="/faq" className="text-gray-400 hover:text-primary transition">FAQ</Link></li>
              <li><Link href="/blog" className="text-gray-400 hover:text-primary transition">Blog</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="text-gray-400 hover:text-primary transition">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-gray-400 hover:text-primary transition">Terms & Conditions</Link></li>
              <li><Link href="/careers" className="text-gray-400 hover:text-primary transition">Careers</Link></li>
              <li><Link href="/sitemap" className="text-gray-400 hover:text-primary transition">Sitemap</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-400">© 2024 BookBridge India. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0 text-sm">
              <span>📍 Made in India</span>
              <span>🌍 Serving all of India</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
