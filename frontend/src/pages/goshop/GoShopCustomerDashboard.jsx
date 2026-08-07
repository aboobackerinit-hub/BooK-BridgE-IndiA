import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Package, MapPin, Heart, Plus, Trash2, CheckCircle2, Clock, Truck, ShieldCheck, ShoppingBag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

const ORDER_TIMELINE = ["Pending", "Contacted", "Payment Received", "Packing", "Shipped", "Delivered"];

const statusColor = (s) => {
  const map = {
    Pending: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    Contacted: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    "Payment Received": "bg-purple-500/10 text-purple-400 border-purple-500/30",
    Packing: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    Shipped: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    Delivered: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    Cancelled: "bg-rose-500/10 text-rose-400 border-rose-500/30"
  };
  return map[s] || "bg-zinc-800 text-zinc-300";
};

export const GoShopCustomerDashboard = () => {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "orders";

  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const navigate = useNavigate();

  const loadCustomerData = async () => {
    if (!user) {
      navigate("/goshop/auth");
      return;
    }
    try {
      setLoading(true);
      const [ordRes, addrRes, wishRes] = await Promise.all([
        api.get("/goshop/orders/my"),
        api.get("/goshop/addresses"),
        api.get("/goshop/wishlist")
      ]);
      setOrders(ordRes.data);
      setAddresses(addrRes.data);
      setWishlist(wishRes.data);
    } catch (e) {
      toast.error("Failed to load account details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleDeleteAddress = async (id) => {
    try {
      await api.delete(`/goshop/addresses/${id}`);
      toast.success("Address removed");
      loadCustomerData();
    } catch (e) {
      toast.error("Failed to remove address");
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 text-zinc-400 py-20 text-center">Loading account dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850 pb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-amber-400 font-bold">Account Dashboard</div>
            <h1 className="font-outfit text-3xl font-extrabold text-white">Welcome back, {user?.name || "Customer"}</h1>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <Tabs defaultValue={activeTab} className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800 p-1 rounded-full text-xs">
            <TabsTrigger value="orders" className="rounded-full data-[state=active]:bg-amber-500 data-[state=active]:text-zinc-950 font-bold px-6">
              <Package className="w-3.5 h-3.5 mr-2" /> My Orders ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="addresses" className="rounded-full data-[state=active]:bg-amber-500 data-[state=active]:text-zinc-950 font-bold px-6">
              <MapPin className="w-3.5 h-3.5 mr-2" /> Delivery Addresses ({addresses.length})
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="rounded-full data-[state=active]:bg-amber-500 data-[state=active]:text-zinc-950 font-bold px-6">
              <Heart className="w-3.5 h-3.5 mr-2" /> Saved Wishlist ({wishlist.length})
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: MY ORDERS & TIMELINE ──────────────────────────── */}
          <TabsContent value="orders" className="space-y-6">
            {orders.length === 0 ? (
              <Card className="p-12 text-center bg-zinc-900/40 border-zinc-800 text-zinc-400 rounded-2xl">
                <Package className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                <p className="font-outfit text-base text-zinc-300 font-medium">You haven't placed any orders yet.</p>
                <Link to="/goshop/catalog" className="inline-block mt-4">
                  <Button className="bg-amber-500 text-zinc-950 font-bold rounded-full">Explore Catalog</Button>
                </Link>
              </Card>
            ) : (
              orders.map((o) => (
                <Card key={o.id} className="p-6 bg-zinc-900/60 border-zinc-800 rounded-2xl space-y-6">
                  
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
                    <div>
                      <span className="text-xs text-zinc-500 uppercase tracking-wider block">Order ID</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">{o.order_no}</span>
                    </div>
                    <Badge variant="outline" className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor(o.status)}`}>
                      {o.status}
                    </Badge>
                  </div>

                  {/* Order Status Workflow Timeline */}
                  <div className="py-2">
                    <div className="text-xs font-bold text-zinc-400 mb-3 uppercase tracking-wider">Order Status Timeline</div>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                      {ORDER_TIMELINE.map((stepStatus, idx) => {
                        const currentIdx = ORDER_TIMELINE.indexOf(o.status);
                        const isDone = idx <= currentIdx && o.status !== "Cancelled";
                        return (
                          <div
                            key={stepStatus}
                            className={`p-2.5 rounded-xl border text-[11px] text-center font-medium transition-all ${
                              isDone
                                ? "bg-amber-500/10 border-amber-500/50 text-amber-300"
                                : "bg-zinc-950/40 border-zinc-850 text-zinc-600"
                            }`}
                          >
                            <div className="font-bold flex items-center justify-center gap-1">
                              {isDone ? <CheckCircle2 className="w-3 h-3 text-amber-400" /> : <Clock className="w-3 h-3" />}
                              <span>{stepStatus}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Purchased Items */}
                  <div className="space-y-3 pt-2">
                    {o.items.map((it, idx) => (
                      <div key={idx} className="flex gap-4 items-center p-2 rounded-xl bg-zinc-950/50 border border-zinc-850">
                        <img src={it.image} alt={it.name} className="w-12 h-12 object-cover rounded-lg bg-zinc-900" />
                        <div className="flex-1 min-w-0">
                          <div className="font-outfit font-semibold text-zinc-200 text-sm truncate">{it.name}</div>
                          <div className="text-xs text-zinc-500">Qty: {it.quantity}</div>
                        </div>
                        <div className="font-outfit font-bold text-white text-sm">₹{(it.price - (it.discount || 0)) * it.quantity}</div>
                      </div>
                    ))}
                  </div>

                  {/* Footer info */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-3 border-t border-zinc-800 text-xs text-zinc-400 gap-2">
                    <div>
                      Delivery Address: <span className="text-zinc-200 font-medium">{o.address?.full_name}, {o.address?.place}, {o.address?.pin_code}</span>
                    </div>
                    <div className="font-outfit font-extrabold text-amber-400 text-base">
                      Total: ₹{o.total}
                    </div>
                  </div>

                </Card>
              ))
            )}
          </TabsContent>

          {/* ── TAB 2: ADDRESSES ─────────────────────────────────────── */}
          <TabsContent value="addresses" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {addresses.map((a) => (
                <Card key={a.id} className="p-5 bg-zinc-900/60 border-zinc-800 rounded-2xl relative space-y-2 text-xs text-zinc-300">
                  <div className="flex justify-between items-start">
                    <div className="font-outfit font-bold text-white text-sm">{a.full_name}</div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteAddress(a.id)} className="text-zinc-500 hover:text-rose-400 rounded-full h-7 w-7">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div>Phone: {a.mobile_number}</div>
                  <div>{a.house_name_no}, {a.street}, {a.place}</div>
                  <div>P.O. {a.post_office}, {a.district}, {a.state} - {a.pin_code}</div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── TAB 3: WISHLIST ──────────────────────────────────────── */}
          <TabsContent value="wishlist">
            {wishlist.length === 0 ? (
              <Card className="p-12 text-center bg-zinc-900/40 border-zinc-800 text-zinc-400 rounded-2xl">
                <Heart className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                <p className="font-outfit text-base text-zinc-300 font-medium">Your wishlist is currently empty.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {wishlist.map((p) => (
                  <Card key={p.id} onClick={() => navigate(`/goshop/product/${p.id}`)} className="bg-zinc-900/60 border-zinc-800 rounded-2xl overflow-hidden cursor-pointer group">
                    <div className="aspect-square overflow-hidden bg-zinc-950">
                      <img src={(p.images || [""])[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="font-outfit font-semibold text-white truncate text-sm">{p.name}</h3>
                      <div className="font-outfit font-bold text-amber-400 text-sm">₹{p.price - (p.discount || 0)}</div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

        </Tabs>

      </div>
    </div>
  );
};
