"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, SlidersHorizontal, MapPin, BookOpen } from "lucide-react";
import Link from "next/link";

// Reuse BookCard (Ideally this should be moved to a shared component folder)
function BookCard({ book }: { book: any }) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full cursor-pointer">
      <div className="aspect-[3/4] relative bg-muted overflow-hidden">
        {book.images && book.images.length > 0 ? (
          <img 
            src={book.images[0]} 
            alt={book.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
            <BookOpen className="w-12 h-12 opacity-50" />
          </div>
        )}
        <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md text-sm font-semibold shadow-sm">
          ₹{book.price}
        </div>
      </div>
      <CardContent className="p-4 flex flex-col flex-grow">
        <h3 className="font-heading font-semibold text-lg line-clamp-1 mb-1 group-hover:text-primary transition-colors">
          {book.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-1 mb-3 flex-grow">
          {book.author}
        </p>
        <div className="flex items-center text-xs text-muted-foreground gap-1.5 mt-auto bg-muted/50 p-2 rounded-md">
          <MapPin className="w-3.5 h-3.5 text-primary/70" />
          <span className="truncate">{book.location_district || "Location unknown"}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dbUser } = useAuthStore();
  
  const [books, setBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Filters State
  const [query, setQuery] = useState(searchParams?.get("q") || "");
  const [sort, setSort] = useState(searchParams?.get("sort") || "latest");
  const [minPrice, setMinPrice] = useState(searchParams?.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams?.get("maxPrice") || "");
  const [condition, setCondition] = useState(searchParams?.get("condition") || "all");
  const [transactionType, setTransactionType] = useState(searchParams?.get("type") || "all");
  
  // Location Filters
  const [locationScope, setLocationScope] = useState(searchParams?.get("scope") || "all");

  useEffect(() => {
    fetchResults();
  }, [searchParams]);

  const fetchResults = async () => {
    setIsLoading(true);
    try {
      // Build API query parameters
      const params = new URLSearchParams();
      if (searchParams?.get("q")) params.append("q", searchParams.get("q")!);
      if (searchParams?.get("sort")) params.append("sort", searchParams.get("sort")!);
      if (searchParams?.get("minPrice")) params.append("minPrice", searchParams.get("minPrice")!);
      if (searchParams?.get("maxPrice")) params.append("maxPrice", searchParams.get("maxPrice")!);
      if (searchParams?.get("condition") && searchParams.get("condition") !== "all") params.append("condition", searchParams.get("condition")!);
      if (searchParams?.get("type") && searchParams.get("type") !== "all") params.append("type", searchParams.get("type")!);
      
      // Location scopes
      const scope = searchParams?.get("scope");
      if (scope === "college" && dbUser?.college) params.append("college", dbUser.college);
      if (scope === "district" && dbUser?.location_district) params.append("district", dbUser.location_district);
      if (scope === "state" && dbUser?.location_state) params.append("state", dbUser.location_state);

      const res = await apiClient.get(`/books/search?${params.toString()}`);
      setBooks(res.data || []);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    const params = new URLSearchParams();
    if (query) params.append("q", query);
    if (sort !== "latest") params.append("sort", sort);
    if (minPrice) params.append("minPrice", minPrice);
    if (maxPrice) params.append("maxPrice", maxPrice);
    if (condition !== "all") params.append("condition", condition);
    if (transactionType !== "all") params.append("type", transactionType);
    if (locationScope !== "all") params.append("scope", locationScope);

    router.push(`/search?${params.toString()}`);
    setShowMobileFilters(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
      
      {/* Mobile Filters Toggle */}
      <div className="md:hidden flex items-center gap-2 w-full">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search books..."
            className="pl-10"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        </form>
        <Button variant="outline" size="icon" onClick={() => setShowMobileFilters(!showMobileFilters)}>
          <SlidersHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* Sidebar Filters */}
      <aside className={`w-full md:w-64 flex-shrink-0 ${showMobileFilters ? "block" : "hidden"} md:block`}>
        <div className="sticky top-24 bg-card rounded-xl border p-5 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b">
            <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filters
            </h3>
            <Button variant="ghost" size="sm" onClick={() => {
              setQuery(""); setSort("latest"); setMinPrice(""); setMaxPrice("");
              setCondition("all"); setTransactionType("all"); setLocationScope("all");
            }}>
              Clear
            </Button>
          </div>

          <form onSubmit={handleSearch} className="space-y-6">
            
            {/* Search Query (Desktop) */}
            <div className="hidden md:block space-y-2">
              <Label>Search Query</Label>
              <Input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Title, author, ISBN..."
              />
            </div>

            {/* Sorting */}
            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nearest">Nearest First</SelectItem>
                  <SelectItem value="latest">Latest Listed</SelectItem>
                  <SelectItem value="price_asc">Lowest Price</SelectItem>
                  <SelectItem value="price_desc">Highest Price</SelectItem>
                  <SelectItem value="trending">Trending</SelectItem>
                  <SelectItem value="views">Most Viewed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location Scope */}
            <div className="space-y-2">
              <Label>Location Scope</Label>
              <Select value={locationScope} onValueChange={setLocationScope}>
                <SelectTrigger>
                  <SelectValue placeholder="Anywhere" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Anywhere</SelectItem>
                  {dbUser?.college && <SelectItem value="college">Same College</SelectItem>}
                  {dbUser?.location_district && <SelectItem value="district">Same District</SelectItem>}
                  {dbUser?.location_state && <SelectItem value="state">Same State</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Type */}
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select value={transactionType} onValueChange={setTransactionType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sell">For Sale</SelectItem>
                  <SelectItem value="exchange">Exchange Only</SelectItem>
                  <SelectItem value="donate">Donation / Free</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <Label>Price Range (₹)</Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="number" 
                  placeholder="Min" 
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full"
                />
                <span>-</span>
                <Input 
                  type="number" 
                  placeholder="Max" 
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Book Condition */}
            <div className="space-y-2">
              <Label>Book Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger>
                  <SelectValue placeholder="Any Condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Condition</SelectItem>
                  <SelectItem value="new">Like New</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair (Some highlights)</SelectItem>
                  <SelectItem value="poor">Poor (Missing pages)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full">Apply Filters</Button>
          </form>
        </div>
      </aside>

      {/* Main Content: Results */}
      <main className="flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-heading font-bold">Search Results</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? "Searching..." : `${books.length} books found`}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-xl"></div>
            ))}
          </div>
        ) : books.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {books.map((book) => (
              <Link key={book.id} href={`/books/${book.id}`}>
                <BookCard book={book} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/30 rounded-xl border border-dashed">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-heading font-semibold mb-2">No books found</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              Try adjusting your filters, trying different keywords, or expanding your location scope.
            </p>
            <Button variant="outline" onClick={() => {
              setQuery(""); setSort("latest"); setMinPrice(""); setMaxPrice("");
              setCondition("all"); setTransactionType("all"); setLocationScope("all");
              router.push("/search");
            }}>
              Clear all filters
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading search...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
