import React from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex flex-col justify-center items-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-sm space-y-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary text-primary-foreground p-2 rounded-xl group-hover:scale-105 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="font-heading font-bold text-2xl tracking-tight text-foreground">
              BookBridge
            </span>
          </Link>
          {children}
        </div>
      </div>
      <div className="hidden lg:block relative bg-muted h-full overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg">
          <h1 className="font-heading text-5xl font-bold text-foreground mb-6 leading-tight">
            Connect. Share. Learn.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Join the exclusive community of college students exchanging books, knowledge, and opportunities on campus.
          </p>
        </div>
      </div>
    </div>
  );
}
