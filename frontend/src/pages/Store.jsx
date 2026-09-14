import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { getCache, setCache } from "@/lib/dbCache";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, BookOpen, Plus, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const HERO_IMG = "https://images.unsplash.com/photo-1491841651911-c44c30c34548?w=1400";

const handleShare = async (e, book) => {
  e.preventDefault();
  e.stopPropagation();
  const shareUrl = `${window.location.origin}/book/${book.id}`;
  const shareData = {
    title: book.title,
    text: `Check out "${book.title}" by ${book.author} on BookBridge India!`,
    url: shareUrl,
  };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (err) {
      if (err.name !== "AbortError") {
        navigator.clipboard?.writeText(shareUrl);
        toast.success("Book link copied to clipboard!");
      }
    }
  } else {
    navigator.clipboard?.writeText(shareUrl);
    toast.success("Book link copied to clipboard!");
  }
};

const BookCard = ({ book }) => (
  <Link to={`/book/${book.id}`} data-testid={`book-card-${book.id}`}
    className="group rounded-2xl border border-border bg-card hover-lift overflow-hidden block relative">
    <div className="aspect-[3/4] bg-muted overflow-hidden relative">
      <OptimizedImage src={book.image_url} alt={book.title} fallbackType="book" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <button
        onClick={(e) => handleShare(e, book)}
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-background flex items-center justify-center shadow-sm transition-all opacity-90 group-hover:opacity-100 z-10"
        title="Share book"
        aria-label="Share book"
        data-testid={`share-book-${book.id}`}
      >
        <Share2 className="w-3.5 h-3.5" />
      </button>
      {book.stock <= 0 && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
          <Badge variant="destructive" className="px-3 py-1 font-semibold shadow-md">Out of Stock</Badge>
        </div>
      )}
    </div>
    <div className="p-4">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-serif text-base font-semibold leading-tight line-clamp-2">{book.title}</h3>
        {book.featured && <Badge className="bg-accent text-accent-foreground shrink-0">Featured</Badge>}
      </div>
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{book.author}</p>
      <div className="flex items-center justify-between">
        <span className="font-mono font-semibold text-primary">₹{book.price}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{book.category}</span>
      </div>
    </div>
  </Link>
);

const StorePage = () => {
  const [books, setBooks] = useState([]);
  const [cats, setCats] = useState(["All"]);
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    const trimmedQ = q ? q.trim() : "";
    const cacheKey = `store_books_${cat}_${trimmedQ || "all"}`;
    // 1. Instantly load from cache if available
    const cached = await getCache(cacheKey);
    if (cached && Array.isArray(cached)) {
      setBooks(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // 2. Silently fetch fresh data in background
    try {
      const params = {};
      if (cat && cat !== "All") params.category = cat;
      if (trimmedQ) params.q = trimmedQ;
      const { data } = await api.get("/books", { params });
      setBooks(data);
      setCache(cacheKey, data);
    } catch {
      if (!cached) toast.error("Failed to load books");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCache("store_categories").then((cached) => {
      if (cached && Array.isArray(cached)) setCats(cached);
    });

    api.get("/categories").then((r) => {
      setCats(r.data);
      setCache("store_categories", r.data);
    }).catch(() => {});
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 250);
    return () => clearTimeout(timer);
  }, [q, cat]);

  const submitSearch = (e) => {
    if (e) e.preventDefault();
    load();
  };

  const featured = books.filter((b) => b.featured);

  return (
    <div className="space-y-10">
      {/* Floating Sell CTA */}
      <button
        onClick={() => navigate("/sell")}
        data-testid="floating-sell-btn"
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-3 rounded-full shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-all"
      >
        <Plus className="w-4 h-4" />
        <span className="font-medium text-sm hidden md:inline">Sell a Book</span>
      </button>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-border shadow-sm">
        <OptimizedImage src={HERO_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-center" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30 dark:from-slate-950/90 dark:via-slate-950/70 dark:to-slate-950/40" />
        <div className="relative px-4 py-5 sm:px-8 sm:py-10 md:px-16 md:py-20 max-w-3xl">
          <h1 className="font-serif text-2xl sm:text-4xl md:text-6xl leading-tight mb-2 md:mb-4 text-white dark:text-emerald-50 drop-shadow-sm">
            Every book has a<br/>second life.
          </h1>
          <p className="text-white/90 dark:text-emerald-100/80 text-xs sm:text-base md:text-lg max-w-xl mb-3 md:mb-6 leading-normal sm:leading-relaxed">
            The largest community of readers, sellers and publishers in India — one shelf at a time.
          </p>
          <form onSubmit={submitSearch} className="flex gap-2 max-w-lg" data-testid="store-search-form">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                data-testid="store-search-input"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search title, author, ISBN..."
                className="pl-8 sm:pl-10 h-9 sm:h-10 md:h-11 rounded-full bg-white/95 dark:bg-card/95 border-0 text-foreground text-xs sm:text-sm shadow-sm"
              />
            </div>
            <Button type="submit" className="rounded-full h-9 sm:h-10 md:h-11 px-4 sm:px-6 text-xs sm:text-sm shrink-0 shadow-sm" data-testid="store-search-btn">Search</Button>
          </form>
        </div>
      </section>

      {/* Featured strip */}
      {!q.trim() && featured.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Editor's Pick</div>
              <h2 className="font-serif text-3xl">Featured this week</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {featured.slice(0, 5).map((b) => <BookCard key={b.id} book={b} />)}
          </div>
        </section>
      )}

      {/* Category filter */}
      <section>
        <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Browse the shelves</div>
            <h2 className="font-serif text-3xl">All Books</h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            {cats.map((c) => (
              <button
                key={c}
                data-testid={`cat-${c}-btn`}
                onClick={() => setCat(c)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  cat === c ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:border-primary/40"
                }`}
              >{c}</button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading books...</div>
        ) : books.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">No books found.</Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6" data-testid="books-grid">
            {books.map((b) => <BookCard key={b.id} book={b} />)}
          </div>
        )}
      </section>
    </div>
  );
};

export default StorePage;
