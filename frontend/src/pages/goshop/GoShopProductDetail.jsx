import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ShoppingBag, ShoppingCart, Heart, Star, ArrowLeft, ShieldCheck, Check, MessageSquare, Truck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

export const GoShopProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [inWishlist, setInWishlist] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadProduct = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/goshop/products/${id}`);
      setProduct(data);
      setSelectedImage((data.images || [])[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80");

      // Load related products
      if (data.category) {
        const relRes = await api.get(`/goshop/products?category=${encodeURIComponent(data.category)}&limit=4`);
        setRelatedProducts(relRes.data.filter(p => p.id !== id));
      }

      // Check wishlist
      if (user) {
        const wishRes = await api.get("/goshop/wishlist");
        setInWishlist(wishRes.data.some(p => p.id === id));
      }
    } catch (e) {
      toast.error("Product not found");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const toggleWishlist = async () => {
    if (!user) {
      toast.info("Please login to add to wishlist");
      navigate("/goshop/auth");
      return;
    }
    try {
      const { data } = await api.post(`/goshop/wishlist/toggle?product_id=${id}`);
      toast.success(data.message);
      setInWishlist(data.in_wishlist);
    } catch (e) {
      toast.error("Wishlist update failed");
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast.info("Please login to add products to your cart");
      navigate("/goshop/auth");
      return;
    }
    try {
      await api.post(`/goshop/cart?product_id=${id}&quantity=1`);
      toast.success("Added to cart");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to add to cart");
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      toast.info("Please login to place an order");
      navigate("/goshop/auth");
      return;
    }
    try {
      await api.post(`/goshop/cart?product_id=${id}&quantity=1`);
      navigate("/goshop/cart");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to process item");
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.info("Please login to leave a review");
      navigate("/goshop/auth");
      return;
    }
    if (!reviewComment.trim()) return toast.error("Please enter a review comment");

    setSubmittingReview(true);
    try {
      await api.post("/goshop/reviews", {
        product_id: id,
        rating: reviewRating,
        comment: reviewComment
      });
      toast.success("Thank you! Review submitted successfully.");
      setReviewComment("");
      loadProduct();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading || !product) {
    return <div className="min-h-screen bg-zinc-950 text-zinc-400 py-20 text-center">Loading luxury item details...</div>;
  }

  const effectivePrice = product.price - (product.discount || 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Navigation */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-zinc-400 hover:text-white rounded-full">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Store
        </Button>

        {/* Main Product Layout */}
        <div className="grid md:grid-cols-2 gap-12 items-start">
          
          {/* Gallery Section */}
          <div className="space-y-4">
            <div className="aspect-square rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 relative group">
              <img
                src={selectedImage}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 cursor-zoom-in"
              />
              <button
                onClick={toggleWishlist}
                className="absolute top-4 right-4 p-3 rounded-full bg-zinc-950/70 border border-zinc-800 text-zinc-300 hover:text-amber-400 transition-colors"
              >
                <Heart className={`w-5 h-5 ${inWishlist ? "fill-amber-400 text-amber-400" : ""}`} />
              </button>
            </div>

            {/* Thumbnail switcher */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      selectedImage === img ? "border-amber-400 scale-105" : "border-zinc-800 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase text-[10px] tracking-widest">
                  {product.category}
                </Badge>
                {product.featured && <Badge className="bg-zinc-800 text-zinc-200 text-[10px]">Featured</Badge>}
                {product.bestseller && <Badge className="bg-amber-500 text-zinc-950 font-bold text-[10px]">Bestseller</Badge>}
              </div>

              <h1 className="font-outfit text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-2 mt-2 text-sm text-zinc-400">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.avg_rating || 5) ? "fill-amber-400" : ""}`} />
                  ))}
                </div>
                <span>{product.avg_rating || 5.0} ({product.reviews?.length || 0} reviews)</span>
              </div>
            </div>

            {/* Pricing */}
            <div className="flex items-baseline gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <span className="font-outfit text-3xl font-extrabold text-white">₹{effectivePrice}</span>
              {product.discount > 0 && (
                <>
                  <span className="text-base text-zinc-500 line-through font-mono">₹{product.price}</span>
                  <Badge className="bg-amber-500 text-zinc-950 font-bold text-xs">
                    Save ₹{product.discount}
                  </Badge>
                </>
              )}
            </div>

            {/* Stock Availability */}
            <div className="text-sm">
              <span className="text-zinc-400">Availability: </span>
              <span className={`font-semibold ${product.stock > 0 ? "text-emerald-400" : "text-rose-500"}`}>
                {product.stock > 0 ? `In Stock (${product.stock} copies remaining)` : "Out of Stock"}
              </span>
            </div>

            {/* Description */}
            <p className="text-zinc-300 text-sm leading-relaxed font-light">
              {product.description || "Crafted with precision and premium elegance. Designed for high performance and lasting durability."}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 flex-wrap pt-4">
              <Button
                size="lg"
                disabled={product.stock <= 0}
                onClick={handleBuyNow}
                className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-zinc-950 font-bold rounded-full px-8 flex-1 min-w-[160px] shadow-lg shadow-amber-500/20 hover:scale-105 transition-transform"
              >
                <ShoppingBag className="w-4 h-4 mr-2" /> Buy Now
              </Button>

              <Button
                size="lg"
                variant="outline"
                disabled={product.stock <= 0}
                onClick={handleAddToCart}
                className="border-zinc-700 text-zinc-200 hover:border-amber-400 hover:text-amber-400 rounded-full px-8 flex-1 min-w-[160px]"
              >
                <ShoppingCart className="w-4 h-4 mr-2" /> Add to Cart
              </Button>
            </div>

            {/* Guarantee Props */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-zinc-800 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-400" /> Express Pan-India Shipping
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" /> WhatsApp Order Confirmation
              </div>
            </div>

          </div>

        </div>

        {/* ── REVIEWS SECTION ───────────────────────────────────────────── */}
        <section className="space-y-6 pt-12 border-t border-zinc-850">
          <h2 className="font-outfit text-2xl font-bold text-white">Customer Reviews</h2>

          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Submit Review */}
            <Card className="p-6 bg-zinc-900/60 border-zinc-800 rounded-2xl space-y-4">
              <h3 className="font-outfit font-semibold text-zinc-200 text-base">Write a Review</h3>
              <form onSubmit={submitReview} className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Rating</label>
                  <div className="flex gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className="p-1"
                      >
                        <Star className={`w-5 h-5 ${star <= reviewRating ? "fill-amber-400" : "text-zinc-600"}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Comment</label>
                  <Textarea
                    placeholder="Share your experience with this item..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-zinc-200 rounded-xl text-xs"
                    rows={3}
                  />
                </div>

                <Button size="sm" type="submit" disabled={submittingReview} className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-full">
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </Button>
              </form>
            </Card>

            {/* Reviews List */}
            <div className="md:col-span-2 space-y-4">
              {product.reviews && product.reviews.length > 0 ? (
                product.reviews.map((r) => (
                  <Card key={r.id} className="p-4 bg-zinc-900/40 border-zinc-800/60 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-outfit font-semibold text-zinc-200 text-sm">{r.user_name}</span>
                      <div className="flex text-amber-400">
                        {[...Array(r.rating || 5)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 font-light">{r.comment}</p>
                  </Card>
                ))
              ) : (
                <div className="py-8 text-center text-zinc-500 text-sm">No reviews yet. Be the first to review this product!</div>
              )}
            </div>

          </div>
        </section>

      </div>
    </div>
  );
};
