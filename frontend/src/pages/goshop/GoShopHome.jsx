import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Heart, Star, ArrowRight, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

export const GoShopHome = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [featRes, bestRes, catRes] = await Promise.all([
        api.get("/goshop/products?featured=true&limit=8"),
        api.get("/goshop/products?bestseller=true&limit=8"),
        api.get("/goshop/categories")
      ]);
      setFeaturedProducts(featRes.data);
      setBestSellers(bestRes.data);
      setCategories(catRes.data);

      if (user) {
        const wishRes = await api.get("/goshop/wishlist");
        setWishlistIds(new Set(wishRes.data.map(p => p.id)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toggleWishlist = async (productId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info("Please login to save to wishlist");
      navigate("/goshop/auth");
      return;
    }
    try {
      const { data } = await api.post(`/goshop/wishlist/toggle?product_id=${productId}`);
      toast.success(data.message);
      const updated = new Set(wishlistIds);
      if (data.in_wishlist) updated.add(productId);
      else updated.delete(productId);
      setWishlistIds(updated);
    } catch (err) {
      toast.error("Failed to update wishlist");
    }
  };

  const handleAddToCart = async (productId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info("Please sign in to add items to cart");
      navigate("/goshop/auth");
      return;
    }
    try {
      await api.post(`/goshop/cart?product_id=${productId}&quantity=1`);
      toast.success("Added to cart");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add item to cart");
    }
  };

  return (
    <div className="space-y-16 pb-16 bg-zinc-950 text-zinc-100 min-h-screen">
      
      {/* ── HERO BANNER ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32 bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-850">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center md:text-left grid md:grid-cols-2 items-center gap-12">
          <div className="space-y-6">
            <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 font-outfit uppercase tracking-widest text-[11px] px-3 py-1 rounded-full">
              ✨ Premium Collection 2026
            </Badge>
            <h1 className="font-outfit text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-none">
              Elegance Defined. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500">
                Luxury Redefined.
              </span>
            </h1>
            <p className="text-zinc-400 text-base sm:text-lg max-w-lg font-light leading-relaxed">
              Explore handpicked luxury lifestyle items, premium watches, high-end accessories, and minimalist apparel curated for perfection.
            </p>

            <div className="flex items-center gap-4 flex-wrap pt-2">
              <Link to="/goshop/catalog">
                <Button size="lg" className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-zinc-950 font-bold rounded-full px-8 shadow-xl shadow-amber-500/20 hover:scale-105 transition-all">
                  Shop Catalog <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/goshop/catalog?featured=true">
                <Button size="lg" variant="outline" className="border-zinc-700 text-zinc-200 hover:border-amber-400 hover:text-amber-400 rounded-full px-8">
                  Featured Items
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative group">
            <div className="aspect-square rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl relative">
              <img
                src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80"
                alt="GOSHOP Luxury Showcase"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 flex justify-between items-center">
                <div>
                  <div className="text-xs text-amber-400 font-bold uppercase tracking-wider">Top Collection</div>
                  <div className="font-outfit font-bold text-white text-lg">GOSHOP Heritage Watch</div>
                </div>
                <Link to="/goshop/catalog">
                  <Button size="sm" className="bg-amber-400 text-zinc-950 font-bold rounded-full">Explore</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORIES SLIDER ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-amber-400 font-bold">Categories</div>
            <h2 className="font-outfit text-3xl font-bold text-white">Browse By Collection</h2>
          </div>
          <Link to="/goshop/catalog" className="text-sm text-zinc-400 hover:text-amber-400 font-medium transition-colors flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {(categories.length > 0 ? categories : [
            { name: "Watches", slug: "watches", image_url: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&q=80" },
            { name: "Electronics", slug: "electronics", image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80" },
            { name: "Luxury Apparel", slug: "apparel", image_url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80" },
            { name: "Footwear", slug: "footwear", image_url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&q=80" },
            { name: "Accessories", slug: "accessories", image_url: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&q=80" },
            { name: "Eyewear", slug: "eyewear", image_url: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&q=80" }
          ]).map((cat, idx) => (
            <Link
              key={cat.id || idx}
              to={`/goshop/catalog?category=${encodeURIComponent(cat.name)}`}
              className="group relative aspect-square rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900"
            >
              <img
                src={cat.image_url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80"}
                alt={cat.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-70 group-hover:opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-center">
                <span className="font-outfit font-bold text-white text-sm tracking-wide group-hover:text-amber-400 transition-colors">
                  {cat.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FEATURED PRODUCTS GRID ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-amber-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Curated
            </div>
            <h2 className="font-outfit text-3xl font-bold text-white">Featured Luxury Items</h2>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-500 font-light">Loading curated items...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((p) => (
              <Card
                key={p.id}
                onClick={() => navigate(`/goshop/product/${p.id}`)}
                className="bg-zinc-900/60 border-zinc-800/80 hover:border-amber-500/40 rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 flex flex-col justify-between"
              >
                <div className="relative aspect-square overflow-hidden bg-zinc-950">
                  <img
                    src={(p.images || ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80"])[0]}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {p.discount > 0 && (
                    <Badge className="absolute top-3 left-3 bg-amber-500 text-zinc-950 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                      -{Math.round((p.discount / p.price) * 100)}% OFF
                    </Badge>
                  )}
                  <button
                    onClick={(e) => toggleWishlist(p.id, e)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-zinc-950/60 border border-zinc-800 text-zinc-300 hover:text-amber-400 transition-colors"
                  >
                    <Heart className={`w-4 h-4 ${wishlistIds.has(p.id) ? "fill-amber-400 text-amber-400" : ""}`} />
                  </button>
                </div>

                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">{p.category}</div>
                    <h3 className="font-outfit font-semibold text-white text-base group-hover:text-amber-400 transition-colors truncate">
                      {p.name}
                    </h3>
                  </div>

                  <div className="flex items-baseline justify-between pt-2 border-t border-zinc-800/60">
                    <div>
                      <span className="font-outfit font-extrabold text-lg text-white">₹{p.price - (p.discount || 0)}</span>
                      {p.discount > 0 && (
                        <span className="text-xs text-zinc-500 line-through ml-2 font-mono">₹{p.price}</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={(e) => handleAddToCart(p.id, e)}
                      className="bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-200 rounded-full h-8 px-3 text-xs transition-all"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};
