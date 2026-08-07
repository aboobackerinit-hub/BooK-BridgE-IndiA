import React, { Suspense } from "react";
import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PrefsProvider } from "@/context/PrefsContext";
import { Toaster } from "@/components/ui/sonner";
import AppShell from "@/components/layout/AppShell";
import { GoShopAppShell } from "@/components/goshop/GoShopAppShell";
import PageSkeleton from "@/components/ui/PageSkeleton";

// Legacy pages
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

// GOSHOP STORE Pages
const GoShopHome = React.lazy(() => import("@/pages/goshop/GoShopHome").then(m => ({ default: m.GoShopHome })));
const GoShopCatalog = React.lazy(() => import("@/pages/goshop/GoShopCatalog").then(m => ({ default: m.GoShopCatalog })));
const GoShopProductDetail = React.lazy(() => import("@/pages/goshop/GoShopProductDetail").then(m => ({ default: m.GoShopProductDetail })));
const GoShopCartCheckout = React.lazy(() => import("@/pages/goshop/GoShopCartCheckout").then(m => ({ default: m.GoShopCartCheckout })));
const GoShopCustomerDashboard = React.lazy(() => import("@/pages/goshop/GoShopCustomerDashboard").then(m => ({ default: m.GoShopCustomerDashboard })));
const GoShopAdminDashboard = React.lazy(() => import("@/pages/goshop/GoShopAdminDashboard").then(m => ({ default: m.GoShopAdminDashboard })));
const GoShopLegalPages = React.lazy(() => import("@/pages/goshop/GoShopLegalPages").then(m => ({ default: m.GoShopLegalPages })));

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
              
              {/* GOSHOP STORE LUXURY ECOMMERCE ROUTES */}
              <Route element={<GoShopAppShell />}>
                <Route path="/goshop" element={<GoShopHome />} />
                <Route path="/goshop/catalog" element={<GoShopCatalog />} />
                <Route path="/goshop/product/:id" element={<GoShopProductDetail />} />
                <Route path="/goshop/cart" element={<GoShopCartCheckout />} />
                <Route path="/goshop/dashboard" element={<GoShopCustomerDashboard />} />
                <Route path="/goshop/admin" element={<RoleGuard roles={["admin"]}><GoShopAdminDashboard /></RoleGuard>} />
                <Route path="/goshop/auth" element={<LoginPage />} />
                <Route path="/goshop/:page" element={<GoShopLegalPages />} />
              </Route>

              {/* LEGACY APP ROUTES */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={<AppShell />}>
                <Route path="/" element={<Navigate to="/goshop" replace />} />
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
              <Route path="*" element={<Navigate to="/goshop" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </PrefsProvider>
    </AuthProvider>
  );
}

export default App;
