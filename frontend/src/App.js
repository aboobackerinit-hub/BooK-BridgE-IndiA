import React from "react";
import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PrefsProvider } from "@/context/PrefsContext";
import { Toaster } from "@/components/ui/sonner";
import { LoginPage, RegisterPage } from "@/pages/Auth";
import AppShell from "@/components/layout/AppShell";
import StorePage from "@/pages/Store";
import BookDetail from "@/pages/BookDetail";
import ReviewsPage from "@/pages/Reviews";
import CartPage from "@/pages/Cart";
import OrdersPage from "@/pages/Orders";
import ChatPage from "@/pages/Chat";
import ProfilePage from "@/pages/Profile";
import SettingsPage from "@/pages/Settings";
import SellBookPage from "@/pages/SellBook";
import SellerDashboard from "@/pages/SellerDashboard";
import AdminDashboard from "@/pages/AdminDashboard";

const RoleGuard = ({ roles, children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/store" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <PrefsProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/store" replace />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/book/:id" element={<BookDetail />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:userId" element={<ChatPage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/sell" element={<SellBookPage />} />
            <Route path="/store-owner" element={<RoleGuard roles={["store_owner", "admin", "super_admin"]}><SellerDashboard role="store_owner" /></RoleGuard>} />
            <Route path="/publisher" element={<RoleGuard roles={["publisher", "admin", "super_admin"]}><SellerDashboard role="publisher" /></RoleGuard>} />
            <Route path="/admin" element={<RoleGuard roles={["admin", "super_admin"]}><AdminDashboard /></RoleGuard>} />
          </Route>
          <Route path="*" element={<Navigate to="/store" replace />} />
        </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </PrefsProvider>
    </AuthProvider>
  );
}

export default App;
