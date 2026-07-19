"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { User, ShieldCheck, MapPin, Star, Award, BookOpen, Settings, LogOut, Package } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";

export default function ProfilePage() {
  const { user, dbUser, isLoading } = useAuthStore();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-40 bg-muted rounded-xl"></div>
          <div className="h-64 bg-muted rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  // Mock gamification data if not available
  const points = dbUser?.points || 450;
  const level = dbUser?.level || Math.floor(points / 100) + 1;
  const nextLevelPoints = level * 100;
  const progressPercent = (points % 100);
  const trustScore = dbUser?.trust_score || 85;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      
      {/* Profile Header & Stats */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {/* Basic Info */}
        <Card className="w-full md:w-1/3">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center text-4xl font-bold mb-4">
              {dbUser?.name?.charAt(0) || user.email?.charAt(0) || "U"}
            </div>
            <h2 className="text-2xl font-bold font-heading">{dbUser?.name || "User"}</h2>
            <p className="text-muted-foreground mb-4">{user.email}</p>
            
            <div className="flex flex-col gap-2 w-full text-sm">
              {dbUser?.college && (
                <div className="flex items-center justify-center gap-1.5 bg-muted/50 py-1.5 rounded-md">
                  <BookOpen className="w-4 h-4 text-primary" /> {dbUser.college}
                </div>
              )}
              {dbUser?.location_district && (
                <div className="flex items-center justify-center gap-1.5 bg-muted/50 py-1.5 rounded-md">
                  <MapPin className="w-4 h-4 text-primary" /> {dbUser.location_district}, {dbUser.location_state}
                </div>
              )}
            </div>

            <Button variant="outline" className="w-full mt-6" onClick={() => router.push("/onboarding")}>
              Edit Profile
            </Button>
          </CardContent>
        </Card>

        {/* Gamification Stats */}
        <Card className="w-full md:w-2/3">
          <CardHeader>
            <CardTitle className="font-heading">Reputation & Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-6">
              
              {/* Trust Score */}
              <div className="flex-1 bg-muted/30 p-4 rounded-xl border border-dashed flex flex-col items-center justify-center text-center">
                <ShieldCheck className="w-8 h-8 text-green-500 mb-2" />
                <span className="text-3xl font-bold">{trustScore}/100</span>
                <span className="text-sm text-muted-foreground">Trust Score</span>
              </div>

              {/* Level & Points */}
              <div className="flex-[2] bg-primary/5 p-4 rounded-xl border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-lg">Level {level}</span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{points} / {nextLevelPoints} pts</span>
                </div>
                <Progress value={progressPercent} className="h-2 mb-2" />
                <p className="text-xs text-muted-foreground text-right">
                  {100 - progressPercent} points to Level {level + 1}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">Early Adopter</Badge>
                  <Badge variant="secondary">First Sale</Badge>
                  {trustScore > 80 && <Badge className="bg-green-500 hover:bg-green-600 text-white">Trusted Seller</Badge>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Tabs */}
      <Tabs defaultValue="listings" className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 mb-8 h-auto p-1 bg-muted/50">
          <TabsTrigger value="listings" className="py-2.5 data-[state=active]:bg-background">My Listings</TabsTrigger>
          <TabsTrigger value="orders" className="py-2.5 data-[state=active]:bg-background">Orders</TabsTrigger>
          <TabsTrigger value="wishlist" className="py-2.5 data-[state=active]:bg-background">Wishlist</TabsTrigger>
          <TabsTrigger value="settings" className="py-2.5 data-[state=active]:bg-background">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="listings" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold font-heading">Active Listings</h3>
            <Button onClick={() => router.push("/sell")}>Add New Book</Button>
          </div>
          <div className="bg-muted/20 border border-dashed rounded-xl p-12 text-center flex flex-col items-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-4 opacity-30" />
            <h4 className="text-lg font-semibold mb-2">No active listings</h4>
            <p className="text-muted-foreground mb-6 max-w-md">You haven't listed any books for sale or exchange yet. Start earning points by listing your first book!</p>
            <Button onClick={() => router.push("/sell")}>List a Book</Button>
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <h3 className="text-xl font-bold font-heading mb-4">Order History</h3>
          <div className="bg-muted/20 border border-dashed rounded-xl p-12 text-center flex flex-col items-center">
            <Package className="w-12 h-12 text-muted-foreground mb-4 opacity-30" />
            <h4 className="text-lg font-semibold mb-2">No orders yet</h4>
            <p className="text-muted-foreground mb-6 max-w-md">You haven't bought or exchanged any books yet.</p>
            <Button onClick={() => router.push("/search")}>Explore Books</Button>
          </div>
        </TabsContent>

        <TabsContent value="wishlist">
          <h3 className="text-xl font-bold font-heading mb-4">Saved Books</h3>
          <div className="bg-muted/20 border border-dashed rounded-xl p-12 text-center flex flex-col items-center">
            <Star className="w-12 h-12 text-muted-foreground mb-4 opacity-30" />
            <h4 className="text-lg font-semibold mb-2">Your wishlist is empty</h4>
            <p className="text-muted-foreground mb-6 max-w-md">Save books you're interested in to easily find them later.</p>
            <Button onClick={() => router.push("/search")}>Explore Books</Button>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your account preferences and notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full sm:w-auto flex justify-start" onClick={() => router.push("/onboarding")}>
                <MapPin className="w-4 h-4 mr-2" /> Update Location & College
              </Button>
              <Button variant="destructive" className="w-full sm:w-auto flex justify-start" onClick={() => signOut(auth)}>
                <LogOut className="w-4 h-4 mr-2" /> Log Out
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
    </div>
  );
}
