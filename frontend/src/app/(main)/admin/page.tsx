"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, BookOpen, ShoppingBag, TrendingUp, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function AdminDashboardPage() {
  const { user, dbUser, isLoading } = useAuthStore();
  const router = useRouter();
  
  const [stats, setStats] = useState<any>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  useEffect(() => {
    // In a real app, protect this route
    if (!isLoading && (!user || dbUser?.role !== "admin")) {
      // Mocking admin access for demo if needed, but normally redirect
      // router.push("/"); 
    }
  }, [user, dbUser, isLoading, router]);

  useEffect(() => {
    // Mock fetching admin stats
    setTimeout(() => {
      setStats({
        totalUsers: 1240,
        activeListings: 3500,
        totalTransactions: 845,
        reportedUsers: 12,
        revenue: 45000,
        growth: 15
      });
      setIsStatsLoading(false);
    }, 1000);
  }, []);

  if (isLoading || isStatsLoading) {
    return (
      <div className="container mx-auto px-4 py-8 animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="h-32 bg-muted rounded-xl"></div>
          <div className="h-32 bg-muted rounded-xl"></div>
          <div className="h-32 bg-muted rounded-xl"></div>
          <div className="h-32 bg-muted rounded-xl"></div>
        </div>
      </div>
    );
  }

  // Temporary admin block if not admin
  if (dbUser?.role !== "admin" && process.env.NODE_ENV !== "development") {
    // return null; // Uncomment in prod
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-heading">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of BookBridge platform</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Users</p>
                <h3 className="text-3xl font-bold">{stats?.totalUsers.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg text-primary">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-green-600 mt-4 flex items-center font-medium">
              <TrendingUp className="w-3 h-3 mr-1" /> +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Active Listings</p>
                <h3 className="text-3xl font-bold">{stats?.activeListings.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-green-600 mt-4 flex items-center font-medium">
              <TrendingUp className="w-3 h-3 mr-1" /> +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Completed Transactions</p>
                <h3 className="text-3xl font-bold">{stats?.totalTransactions.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-lg text-orange-500">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-green-600 mt-4 flex items-center font-medium">
              <TrendingUp className="w-3 h-3 mr-1" /> +24% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Reported Users</p>
                <h3 className="text-3xl font-bold text-destructive">{stats?.reportedUsers}</h3>
              </div>
              <div className="p-3 bg-destructive/10 rounded-lg text-destructive">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-destructive mt-4 font-medium cursor-pointer hover:underline">
              Review flagged accounts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts / Data area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Platform Growth</CardTitle>
            <CardDescription>Monthly active users and new listings</CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center bg-muted/10 rounded-b-xl border-t border-dashed m-6 mt-0">
            {/* Placeholder for actual chart */}
            <p className="text-muted-foreground">Growth Chart Visualization</p>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Top Colleges</CardTitle>
            <CardDescription>Most active campuses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>NIT Calicut</span>
                <span className="font-medium text-primary">1,240 books</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>CET Trivandrum</span>
                <span className="font-medium text-primary">980 books</span>
              </div>
              <Progress value={70} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>IIT Madras</span>
                <span className="font-medium text-primary">850 books</span>
              </div>
              <Progress value={60} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Christ University</span>
                <span className="font-medium text-primary">420 books</span>
              </div>
              <Progress value={35} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
