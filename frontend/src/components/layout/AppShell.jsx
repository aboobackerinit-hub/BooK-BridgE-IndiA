import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import TopNav from "@/components/layout/TopNav";

import MobileNav from "@/components/layout/MobileNav";

const AppShell = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen paper-bg relative pb-16 md:pb-0">
      <TopNav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
};

export default AppShell;
