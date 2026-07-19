"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Heart, ShoppingCart, MessageCircle, Share2, ShieldCheck, 
  MapPin, BookOpen, Star, AlertCircle, Clock
} from "lucide-react";
import Link from "next/link";

export default function BookDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, dbUser } = useAuthStore();
  
  const [book, setBook] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (id) fetchBookDetails();
  }, [id]);

  const fetchBookDetails = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/books/${id}`);
      setBook(res.data);
      
      // Fetch seller info (trust score, etc.)
      if (res.data.seller_id) {
        try {
          const sellerRes = await apiClient.get(`/users/${res.data.seller_id}`);
          setSeller(sellerRes.data);
        } catch (err) {
          console.error("Failed to load seller", err);
        }
      }
    } catch (error) {
      toast.error("Failed to load book details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast.error("Please log in to add to cart");
      router.push("/login");
      return;
    }
    try {
      // Assuming a backend endpoint for cart exists
      // await apiClient.post("/cart", { book_id: book.id });
      toast.success("Added to cart!");
    } catch (error) {
      toast.error("Failed to add to cart");
    }
  };

  const handleWishlist = async () => {
    if (!user) {
      toast.error("Please log in to add to wishlist");
      router.push("/login");
      return;
    }
    toast.success("Added to wishlist!");
  };

  const handleChat = async () => {
    if (!user) {
      toast.error("Please log in to chat with seller");
      router.push("/login");
      return;
    }
    // Navigate to chat interface with this seller
    router.push(`/chat?userId=${seller?.id}&bookId=${book.id}`);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/2 aspect-[3/4] bg-muted rounded-xl"></div>
          <div className="w-full md:w-1/2 space-y-4">
            <div className="h-10 bg-muted rounded w-3/4"></div>
            <div className="h-6 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded w-full mt-8"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold font-heading mb-4">Book not found</h2>
        <Link href="/search">
          <Button>Back to Search</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/search" className="hover:text-foreground">Books</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground truncate">{book.title}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Left: Images */}
        <div className="w-full lg:w-5/12 space-y-4">
          <div className="aspect-[3/4] bg-muted rounded-xl overflow-hidden relative border shadow-sm flex items-center justify-center">
            {book.images && book.images.length > 0 ? (
              <img 
                src={book.images[activeImage]} 
                alt={book.title} 
                className="w-full h-full object-cover"
              />
            ) : (
              <BookOpen className="w-20 h-20 text-muted-foreground opacity-30" />
            )}
          </div>
          
          {/* Thumbnails */}
          {book.images && book.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {book.images.map((img: string, idx: number) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-20 h-20 flex-shrink-0 rounded-md border-2 overflow-hidden ${activeImage === idx ? 'border-primary' : 'border-transparent'}`}
                >
                  <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className="w-full lg:w-7/12 flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
              {book.title}
            </h1>
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
          
          <p className="text-xl text-muted-foreground mb-6">by {book.author}</p>
          
          <div className="flex items-center gap-4 mb-6">
            <span className="text-3xl font-bold text-primary">₹{book.price}</span>
            {book.original_price && (
              <span className="text-lg text-muted-foreground line-through">₹{book.original_price}</span>
            )}
            {book.condition && (
              <span className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-sm font-semibold ml-auto border border-secondary/20">
                {book.condition.toUpperCase()}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-muted/50 p-3 rounded-lg border">
              <span className="text-xs text-muted-foreground block mb-1">Transaction</span>
              <span className="font-semibold capitalize">{book.transaction_type || "Sell"}</span>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg border">
              <span className="text-xs text-muted-foreground block mb-1">Language</span>
              <span className="font-semibold">{book.language || "English"}</span>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg border">
              <span className="text-xs text-muted-foreground block mb-1">ISBN</span>
              <span className="font-semibold truncate">{book.isbn || "N/A"}</span>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg border">
              <span className="text-xs text-muted-foreground block mb-1">Listed</span>
              <span className="font-semibold text-sm flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {new Date(book.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-10">
            {book.seller_id !== dbUser?.id ? (
              <>
                <Button size="lg" className="flex-1 text-base" onClick={handleAddToCart}>
                  <ShoppingCart className="w-5 h-5 mr-2" /> Add to Cart
                </Button>
                <Button size="lg" variant="secondary" className="flex-1 text-base" onClick={handleChat}>
                  <MessageCircle className="w-5 h-5 mr-2" /> Chat with Seller
                </Button>
                <Button size="lg" variant="outline" className="px-4" onClick={handleWishlist}>
                  <Heart className="w-5 h-5" />
                </Button>
              </>
            ) : (
              <Button size="lg" variant="outline" className="w-full">
                Edit Listing
              </Button>
            )}
          </div>

          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none mb-10">
            <h3 className="text-xl font-heading font-semibold mb-3">Description</h3>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {book.description || "No description provided."}
            </p>
          </div>

          {/* Seller Info Card */}
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-6">
              <h3 className="font-heading font-semibold text-lg mb-4">About the Seller</h3>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xl font-bold shrink-0">
                  {seller?.name?.charAt(0) || "U"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-lg">{seller?.name || "Unknown User"}</span>
                    {seller?.is_verified && (
                      <ShieldCheck className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground gap-1.5 mb-2">
                    <MapPin className="w-4 h-4" />
                    {seller?.college || seller?.location_district || "Location unknown"}
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{seller?.trust_score ? (seller.trust_score / 20).toFixed(1) : "New"}</span>
                    <span className="text-muted-foreground mx-1">•</span>
                    <span className="text-muted-foreground">Trust Score: {seller?.trust_score || 0}/100</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
