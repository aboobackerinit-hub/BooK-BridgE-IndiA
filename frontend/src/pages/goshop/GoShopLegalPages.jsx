import React from "react";
import { useParams, Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Mail, Phone, MapPin, MessageSquare, HelpCircle, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";

export const GoShopLegalPages = () => {
  const { page } = useParams();

  const renderContent = () => {
    switch (page) {
      case "about":
        return (
          <div className="space-y-6">
            <h1 className="font-outfit text-4xl font-extrabold text-white">About GOSHOP STORE</h1>
            <p className="text-zinc-300 text-base leading-relaxed font-light">
              GOSHOP STORE is a premier luxury eCommerce platform established in 2026. We specialize in curating high-end lifestyle products, heritage watches, precision electronics, and luxury apparel.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 pt-4">
              <Card className="p-5 bg-zinc-900/60 border-zinc-800 rounded-2xl text-center space-y-2">
                <div className="text-amber-400 font-outfit text-2xl font-bold">100%</div>
                <div className="text-xs text-zinc-400">Authentic Products</div>
              </Card>
              <Card className="p-5 bg-zinc-900/60 border-zinc-800 rounded-2xl text-center space-y-2">
                <div className="text-amber-400 font-outfit text-2xl font-bold">24/7</div>
                <div className="text-xs text-zinc-400">Customer Support</div>
              </Card>
              <Card className="p-5 bg-zinc-900/60 border-zinc-800 rounded-2xl text-center space-y-2">
                <div className="text-amber-400 font-outfit text-2xl font-bold">Pan-India</div>
                <div className="text-xs text-zinc-400">Express Delivery</div>
              </Card>
            </div>
          </div>
        );

      case "contact":
        return (
          <div className="space-y-6">
            <h1 className="font-outfit text-4xl font-extrabold text-white">Contact Customer Support</h1>
            <p className="text-zinc-400 text-sm">Our concierge team is available to assist you with order verification, inquiries, and returns.</p>
            
            <div className="grid sm:grid-cols-2 gap-6 pt-2">
              <Card className="p-6 bg-zinc-900/60 border-zinc-800 rounded-2xl space-y-3">
                <MessageSquare className="w-6 h-6 text-amber-400" />
                <div className="font-outfit font-bold text-white text-base">WhatsApp Support</div>
                <div className="text-xs text-zinc-400">Instant customer support via WhatsApp message</div>
                <a href="https://wa.me/919000000000" target="_blank" rel="noreferrer" className="inline-block text-xs font-bold text-emerald-400">
                  Open WhatsApp Chat ➔
                </a>
              </Card>

              <Card className="p-6 bg-zinc-900/60 border-zinc-800 rounded-2xl space-y-3">
                <Mail className="w-6 h-6 text-amber-400" />
                <div className="font-outfit font-bold text-white text-base">Email Concierge</div>
                <div className="text-xs text-zinc-400">support@goshopstore.com</div>
              </Card>
            </div>
          </div>
        );

      case "privacy":
        return (
          <div className="space-y-6 text-zinc-300 text-sm leading-relaxed">
            <h1 className="font-outfit text-4xl font-extrabold text-white">Privacy Policy</h1>
            <p>At GOSHOP STORE, we respect your privacy and are committed to protecting your personal data. This privacy policy informs you how we manage your personal information during checkout and registration.</p>
            <h3 className="font-outfit font-bold text-white text-base pt-2">1. Information We Collect</h3>
            <p>We collect full name, phone number, delivery address, and order history strictly for shipping and WhatsApp order verification purposes.</p>
            <h3 className="font-outfit font-bold text-white text-base pt-2">2. Data Security</h3>
            <p>All passwords and data are secured using Firebase Firestore and SSL encryption protocols.</p>
          </div>
        );

      case "terms":
        return (
          <div className="space-y-6 text-zinc-300 text-sm leading-relaxed">
            <h1 className="font-outfit text-4xl font-extrabold text-white">Terms of Service</h1>
            <p>By using GOSHOP STORE, you agree to comply with our store policies and terms. Orders placed on GOSHOP STORE are confirmed by our admin team via WhatsApp prior to shipping.</p>
          </div>
        );

      case "return-policy":
        return (
          <div className="space-y-6 text-zinc-300 text-sm leading-relaxed">
            <h1 className="font-outfit text-4xl font-extrabold text-white">Return & Refund Policy</h1>
            <p>We offer a hassle-free 7-day return policy for any damaged or defective products. Please contact customer support on WhatsApp to initiate a return request.</p>
          </div>
        );

      case "faq":
      default:
        return (
          <div className="space-y-6">
            <h1 className="font-outfit text-4xl font-extrabold text-white">Frequently Asked Questions</h1>
            <div className="space-y-4">
              <Card className="p-5 bg-zinc-900/60 border-zinc-800 rounded-2xl space-y-2">
                <div className="font-outfit font-bold text-white text-base">How does order confirmation work?</div>
                <div className="text-xs text-zinc-400 font-light">Once you place an order, our admin team contacts you on WhatsApp using your registered phone number to verify order details.</div>
              </Card>

              <Card className="p-5 bg-zinc-900/60 border-zinc-800 rounded-2xl space-y-2">
                <div className="font-outfit font-bold text-white text-base">How long does shipping take?</div>
                <div className="text-xs text-zinc-400 font-light">Standard express shipping across India takes between 2 to 5 business days.</div>
              </Card>

              <Card className="p-5 bg-zinc-900/60 border-zinc-800 rounded-2xl space-y-2">
                <div className="font-outfit font-bold text-white text-base">Are products authentic?</div>
                <div className="text-xs text-zinc-400 font-light">Yes! All items listed on GOSHOP STORE are 100% genuine and quality checked.</div>
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link to="/goshop" className="inline-flex items-center text-xs text-zinc-400 hover:text-amber-400">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Store
        </Link>

        {renderContent()}
      </div>
    </div>
  );
};
