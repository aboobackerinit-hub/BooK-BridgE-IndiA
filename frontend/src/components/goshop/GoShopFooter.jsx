import React from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, ShieldCheck, Truck, RefreshCw, MessageSquare } from "lucide-react";

export const GoShopFooter = () => {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-850 text-zinc-400 text-sm">
      
      {/* Brand Value Props */}
      <div className="border-b border-zinc-800/60 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/40">
            <Truck className="w-8 h-8 text-amber-400 shrink-0" />
            <div>
              <div className="font-outfit font-semibold text-zinc-200">Express Delivery</div>
              <div className="text-xs text-zinc-500">Fast & tracked shipping across India</div>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/40">
            <MessageSquare className="w-8 h-8 text-amber-400 shrink-0" />
            <div>
              <div className="font-outfit font-semibold text-zinc-200">WhatsApp Confirmation</div>
              <div className="text-xs text-zinc-500">Personal order verification & tracking</div>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/40">
            <ShieldCheck className="w-8 h-8 text-amber-400 shrink-0" />
            <div>
              <div className="font-outfit font-semibold text-zinc-200">Verified Quality</div>
              <div className="text-xs text-zinc-500">100% authentic curated luxury products</div>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/40">
            <RefreshCw className="w-8 h-8 text-amber-400 shrink-0" />
            <div>
              <div className="font-outfit font-semibold text-zinc-200">Easy Returns</div>
              <div className="text-xs text-zinc-500">Hassle-free 7-day return policy</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-5 gap-8">
        
        {/* Brand info */}
        <div className="md:col-span-2 space-y-4">
          <Link to="/goshop" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-md shadow-amber-500/20">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <span className="font-outfit font-extrabold text-xl text-white">GOSHOP STORE</span>
          </Link>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-sm">
            Curated luxury products & lifestyle essentials designed for those who appreciate premium craftsmanship and uncompromised quality.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <div className="font-outfit font-bold text-zinc-200 mb-3 text-xs uppercase tracking-wider">Shop</div>
          <ul className="space-y-2 text-xs">
            <li><Link to="/goshop/catalog" className="hover:text-amber-400 transition-colors">All Products</Link></li>
            <li><Link to="/goshop/catalog?featured=true" className="hover:text-amber-400 transition-colors">Featured Items</Link></li>
            <li><Link to="/goshop/catalog?bestseller=true" className="hover:text-amber-400 transition-colors">Best Sellers</Link></li>
            <li><Link to="/goshop/catalog?in_stock=true" className="hover:text-amber-400 transition-colors">In Stock</Link></li>
          </ul>
        </div>

        {/* Customer Care */}
        <div>
          <div className="font-outfit font-bold text-zinc-200 mb-3 text-xs uppercase tracking-wider">Customer Care</div>
          <ul className="space-y-2 text-xs">
            <li><Link to="/goshop/faq" className="hover:text-amber-400 transition-colors">FAQ</Link></li>
            <li><Link to="/goshop/contact" className="hover:text-amber-400 transition-colors">Contact Support</Link></li>
            <li><Link to="/goshop/return-policy" className="hover:text-amber-400 transition-colors">Return Policy</Link></li>
            <li><Link to="/goshop/dashboard" className="hover:text-amber-400 transition-colors">Track Order</Link></li>
          </ul>
        </div>

        {/* Company & Legal */}
        <div>
          <div className="font-outfit font-bold text-zinc-200 mb-3 text-xs uppercase tracking-wider">Company & Legal</div>
          <ul className="space-y-2 text-xs">
            <li><Link to="/goshop/about" className="hover:text-amber-400 transition-colors">About Us</Link></li>
            <li><Link to="/goshop/privacy" className="hover:text-amber-400 transition-colors">Privacy Policy</Link></li>
            <li><Link to="/goshop/terms" className="hover:text-amber-400 transition-colors">Terms of Service</Link></li>
          </ul>
        </div>

      </div>

      <div className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} GOSHOP STORE. All rights reserved. Powered by Cloudinary & Firebase.
      </div>
    </footer>
  );
};
