import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search, Filter, ShoppingBag, Heart, SlidersHorizontal, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

export const GoShopCatalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filter States
  const qParam = searchParams.get("q") || "";
  const catParam = searchParams.get("category") || "";
  const featParam = searchParams.get("featured") === "true";
  const bestParam = searchParams.get("bestseller") === "true";

  const [search, setSearch] = useState(qParam);
  const [selectedCategory, setSelectedCategory] = useState(catParam);
  const [sortBy, setSortBy] = useState("newest");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [maxPriceFilter, setMaxPriceFilter] = useState(100000);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let url = `/goshop/products?sort_by=${sortBy}`;
      if (search) url += `&q=${encodeURIComponent(search)}`;
      if (selectedCategory) url += `&category=${encodeURIComponent(selectedCategory)}`;
      if (featParam) url += `&featured=true`;
      if (bestParam) url += `&bestseller=true`;
      if (inStockOnly) url += `&in_stock=true`;

      const { data } = await api.get(url);
      setProducts(data.filter(p => (p.price - (p.discount || 0)) <= maxPriceFilter));
    } catch (e) {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get("/goshop/categories");
      setCategories(data);
    } catch (e) {}
  };

  const fetchWishlist = async () => {
    if (user) {
      try {
        const { data } = await api.get("/goshop/wishlist");
        setWishlistIds(new Set(data.map(p => p.id)));
      } catch (e) {}
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchWishlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, sortBy, inStockOnly, maxPriceFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (search) newParams.set("q", search);
    else newParams.delete("q");
    setSearchParams(newParams);
  };

  const selectCategory = (catName) => {
    const newParams = new URLSearchParams(searchParams);
    if (selectedCategory === catName) {
      setSelectedCategory("");
      newParams.delete("category");
    } else {
      setSelectedCategory(catName);
      newParams.set("category", catName);
    }
    setSearchParams(newParams);
  };

  const toggleWishlist = async (productId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info("Please login to save items to wishlist");
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850 pb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-amber-400 font-bold">Catalog</div>
            <h1 className="font-outfit text-3xl font-extrabold text-white">Luxury Store Collections</h1>
          </div>

          <div className="flex items-center gap-3">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-800 text-zinc-200 rounded-full text-xs">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                <SelectItem value="newest">Newest Arrivals</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Catalog Main Layout */}
        <div className="grid lg:grid-cols-4 gap-8">
          
          {/* Filter Sidebar */}
          <Card className="p-6 bg-zinc-900/60 border-zinc-800 space-y-6 h-fit rounded-2xl sticky top-24">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="font-outfit font-bold text-zinc-200 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" /> Filters
              </div>
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("");
                  setInStockOnly(false);
                  setMaxPriceFilter(100000);
                  setSearchParams(new URLSearchParams());
                }}
                className="text-xs text-zinc-500 hover:text-amber-400 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            </div>

            {/* Instant Search input */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Input
                type="text"
                placeholder="Filter catalog..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-zinc-200 rounded-full pl-9 h-9 text-xs"
              />
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            </form>

            {/* Categories */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Categories</div>
              <div className="space-y-1">
                {(categories.length > 0 ? categories : [
                  { name: "Watches" }, { name: "Electronics" }, { name: "Luxury Apparel" }, { name: "Footwear" }, { name: "Accessories" }
                ]).map((c, i) => (
                  <button
                    key={i}
                    onClick={() => selectCategory(c.name)}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex justify-between items-center transition-all ${
                      selectedCategory === c.name ? "bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-950/50"
                    }`}
                  >
                    <span>{c.name}</span>
                    {selectedCategory === c.name && <Check className="w-3 h-3 text-amber-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div className="pt-4 border-t border-zinc-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded bg-zinc-950 border-zinc-800 text-amber-500 focus:ring-0"
                />
                <span>In Stock Items Only</span>
              </label>
            </div>
          </Card>

          {/* Product Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="text-center py-20 text-zinc-500 font-light">Updating catalog...</div>
            ) : products.length === 0 ? (
              <Card className="p-12 text-center bg-zinc-900/40 border-zinc-800 text-zinc-400 rounded-2xl">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                <p className="font-outfit text-lg font-medium text-zinc-300">No products match your criteria.</p>
                <p className="text-xs text-zinc-500 mt-1">Try clearing filters or search term.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((p) => (
                  <Card
                    key={p.id}
                    onClick={() => navigate(`/goshop/product/${p.id}`)}
                    className="bg-zinc-900/60 border-zinc-800 hover:border-amber-500/40 rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="relative aspect-square bg-zinc-950 overflow-hidden">
                      <img
                        src={(p.images || ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80"])[0]}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {p.stock <= 0 ? (
                        <Badge variant="destructive" className="absolute top-3 left-3 text-[10px] rounded-full">Out of Stock</Badge>
                      ) : p.discount > 0 ? (
                        <Badge className="absolute top-3 left-3 bg-amber-500 text-zinc-950 font-extrabold text-[10px] rounded-full">
                          -{Math.round((p.discount / p.price) * 100)}%
                        </Badge>
                      ) : null}

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
                          disabled={p.stock <= 0}
                          onClick={(e) => handleAddToCart(p.id, e)}
                          className="bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-200 rounded-full h-8 px-3 text-xs transition-all"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 mr-1" /> {p.stock > 0 ? "Add" : "Sold"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
