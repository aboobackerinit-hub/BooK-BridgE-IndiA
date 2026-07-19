"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MapPin, BookOpen, GraduationCap, TrendingUp, Sparkles, Map } from "lucide-react";
import apiClient from "@/lib/api-client";

// Placeholder BookCard component (will move to its own file later)
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

// Reusable Book Section
function BookSection({ title, icon: Icon, books, isLoading, viewAllLink }: { title: string, icon: any, books: any[], isLoading: boolean, viewAllLink?: string }) {
  if (!isLoading && (!books || books.length === 0)) {
    return null; // Don't show empty sections
  }

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Icon className="w-6 h-6 text-primary" /> {title}
          </h2>
          {viewAllLink && (
            <Link href={viewAllLink} className="text-sm font-semibold text-primary hover:underline">
              View All
            </Link>
          )}
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-xl"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {books.slice(0, 6).map((book) => (
              <Link key={book.id} href={`/books/${book.id}`}>
                <BookCard book={book} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { dbUser, isLoading: isAuthLoading } = useAuthStore();
  const [books, setBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        // In a real app, we'd fetch specific lists from backend based on location
        // For now, we fetch latest 20 books to populate the mock sections
        const res = await apiClient.get("/books?limit=20");
        setBooks(res.data || []);
      } catch (error) {
        console.error("Error fetching books:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBooks();
  }, []);

  // Mocking the location-based filtering for UI demonstration
  const nearMeBooks = books.filter(b => dbUser && b.location_district === dbUser.location_district);
  const collegeBooks = books.filter(b => dbUser && b.college === dbUser.college);
  const stateBooks = books.filter(b => dbUser && b.location_state === dbUser.location_state);
  const trendingBooks = [...books].sort((a, b) => b.price - a.price); // Mock sort

  return (
    <div className="min-h-screen bg-background">
      
      {/* Hero Section */}
      <section className="bg-primary/5 py-16 md:py-24 border-b">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-heading text-4xl md:text-6xl font-bold text-foreground mb-6 max-w-3xl mx-auto leading-tight">
            Find the right books for your <span className="text-primary italic">college journey</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Buy, sell, and exchange textbooks with students from your campus and nearby areas.
          </p>
          
          <div className="max-w-2xl mx-auto relative flex shadow-sm rounded-full bg-background border p-1.5 focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-shadow">
            <div className="flex-1 flex items-center px-4">
              <Search className="w-5 h-5 text-muted-foreground mr-3" />
              <input 
                type="text" 
                placeholder="Search by title, author, ISBN or category..." 
                className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button size="lg" className="rounded-full px-8 hidden sm:flex">
              Search
            </Button>
          </div>
        </div>
      </section>

      {/* Sections based on Authentication & Onboarding status */}
      {!isAuthLoading && !dbUser && (
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-heading font-bold mb-4">See books on your campus</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Sign in and tell us your college to prioritize listings from your classmates.
            </p>
            <Link href="/login">
              <Button size="lg" variant="default">Sign in / Sign up</Button>
            </Link>
          </div>
        </section>
      )}

      {/* Location-Based Sections */}
      {dbUser?.college && (
        <BookSection 
          title="Same College" 
          icon={GraduationCap} 
          books={collegeBooks.length > 0 ? collegeBooks : books.slice(0, 4)} 
          isLoading={isLoading} 
          viewAllLink={`/search?college=${encodeURIComponent(dbUser.college)}`}
        />
      )}

      {dbUser?.location_district && (
        <BookSection 
          title="Near Me (Same District)" 
          icon={MapPin} 
          books={nearMeBooks.length > 0 ? nearMeBooks : books.slice(4, 8)} 
          isLoading={isLoading} 
          viewAllLink={`/search?district=${encodeURIComponent(dbUser.location_district)}`}
        />
      )}

      {dbUser?.location_state && (
        <BookSection 
          title="Same State" 
          icon={Map} 
          books={stateBooks.length > 0 ? stateBooks : books.slice(8, 12)} 
          isLoading={isLoading} 
          viewAllLink={`/search?state=${encodeURIComponent(dbUser.location_state)}`}
        />
      )}

      {/* General Sections */}
      <BookSection 
        title="Trending Nearby" 
        icon={TrendingUp} 
        books={trendingBooks} 
        isLoading={isLoading} 
      />

      <BookSection 
        title="Recommended For You" 
        icon={Sparkles} 
        books={books} 
        isLoading={isLoading} 
      />

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground mt-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-6">Have books you no longer need?</h2>
          <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto mb-8">
            Clear your shelf, help a junior, and make some money. List your books in less than 2 minutes.
          </p>
          <Link href="/sell">
            <Button size="lg" variant="secondary" className="font-semibold px-8 rounded-full">
              Start Selling Now
            </Button>
          </Link>
        </div>
      </section>

    </div>
  );
}
