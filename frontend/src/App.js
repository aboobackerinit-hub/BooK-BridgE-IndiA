import React, { Suspense } from "react";
import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PrefsProvider } from "@/context/PrefsContext";
import { Toaster } from "@/components/ui/sonner";
import AppShell from "@/components/layout/AppShell";
import PageSkeleton from "@/components/ui/PageSkeleton";

// Lazy-loaded pages
const LoginPage = React.lazy(() => import("@/pages/Auth").then(m => ({ default: m.LoginPage })));
const RegisterPage = React.lazy(() => import("@/pages/Auth").then(m => ({ default: m.RegisterPage })));
const ResetPassword = React.lazy(() => import("@/pages/ResetPassword"));
const StorePage = React.lazy(() => import("@/pages/Store"));
const BookDetail = React.lazy(() => import("@/pages/BookDetail"));
const ReviewsPage = React.lazy(() => import("@/pages/Reviews"));
const CartPage = React.lazy(() => import("@/pages/Cart"));
const OrdersPage = React.lazy(() => import("@/pages/Orders"));
const ChatPage = React.lazy(() => import("@/pages/Chat"));
const ProfilePage = React.lazy(() => import("@/pages/Profile"));
const SettingsPage = React.lazy(() => import("@/pages/Settings"));
const SellBookPage = React.lazy(() => import("@/pages/SellBook"));
const SellerDashboard = React.lazy(() => import("@/pages/SellerDashboard"));
const AdminDashboard = React.lazy(() => import("@/pages/AdminDashboard"));

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
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset-password" element={<ResetPassword />} />
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
                <Route path="/store-owner" element={<RoleGuard roles={["store_owner", "admin"]}><SellerDashboard role="store_owner" /></RoleGuard>} />
                <Route path="/publisher" element={<RoleGuard roles={["publisher", "admin"]}><SellerDashboard role="publisher" /></RoleGuard>} />
                <Route path="/admin" element={<RoleGuard roles={["admin"]}><AdminDashboard /></RoleGuard>} />
              </Route>
              <Route path="*" element={<Navigate to="/store" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </PrefsProvider>
    </AuthProvider>
  );
}

export default App;
