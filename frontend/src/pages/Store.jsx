import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, BookOpen, Plus } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const HERO_IMG = "https://images.unsplash.com/photo-1491841651911-c44c30c34548?w=1400";

const BookCard = ({ book }) => (
  <Link to={`/book/${book.id}`} data-testid={`book-card-${book.id}`}
    className="group rounded-2xl border border-border bg-card hover-lift overflow-hidden block">
    <div className="aspect-[3/4] bg-muted overflow-hidden">
      {book.image_url ? (
        <img src={book.image_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      ) : (
        <div className="w-full h-full flex items-center justify-center spine">
          <BookOpen className="w-12 h-12 text-white/80" />
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
    setLoading(true);
    try {
      const params = {};
      if (cat && cat !== "All") params.category = cat;
      if (q) params.q = q;
      const { data } = await api.get("/books", { params });
      setBooks(data);
    } catch { toast.error("Failed to load books"); }
    setLoading(false);
  };

  useEffect(() => { api.get("/categories").then((r) => setCats(r.data)); }, []);
  useEffect(() => { load(); }, [cat]);

  const submitSearch = (e) => { e.preventDefault(); load(); };

  const featured = books.filter((b) => b.featured);

  return (
    <div className="space-y-10">
      {/* Floating Sell CTA */}
      <button
        onClick={() => navigate("/sell")}
        data-testid="floating-sell-btn"
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-3 rounded-full shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-all"
      >
        <Plus className="w-4 h-4" />
        <span className="font-medium text-sm">Sell a Book</span>
      </button>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border">
        <img src={HERO_IMG} alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/60 to-transparent" />
        <div className="relative px-8 py-16 md:px-16 md:py-24 max-w-3xl text-white">
          <Badge className="bg-white/20 backdrop-blur text-white border border-white/30 mb-4">
            <Sparkles className="w-3 h-3 mr-1" aria-hidden="true" /> Discover · Read · Discuss
          </Badge>
          <h1 className="font-serif text-4xl md:text-6xl leading-none mb-4">
            Every book has a<br/>second life.
          </h1>
          <p className="text-white/80 text-lg max-w-xl mb-6">
            The largest community of readers, sellers and publishers in India — one shelf at a time.
          </p>
          <form onSubmit={submitSearch} className="flex gap-2 max-w-lg" data-testid="store-search-form">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                data-testid="store-search-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search title, author, ISBN..."
                className="pl-10 h-11 rounded-full bg-white/95 border-0"
              />
            </div>
            <Button type="submit" className="rounded-full h-11 px-6" data-testid="store-search-btn">Search</Button>
          </form>
        </div>
      </section>

      {/* Featured strip */}
      {featured.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Editor's Pick</div>
              <h2 className="font-serif text-3xl">Featured this week</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6" data-testid="books-grid">
            {books.map((b) => <BookCard key={b.id} book={b} />)}
          </div>
        )}
      </section>
    </div>
  );
};

export default StorePage;
