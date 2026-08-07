import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Package, ShoppingBag, Users, DollarSign, Plus, Edit, Trash2, MessageSquare, ExternalLink, RefreshCw, Upload, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import ImageUpload from "@/components/ImageUpload";
import api from "@/lib/api";

const ORDER_STATUSES = ["Pending", "Contacted", "Payment Received", "Packing", "Shipped", "Delivered", "Cancelled"];

export const GoShopAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state for Orders
  const [orderSearch, setOrderSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Product Modal State
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    category: "General",
    price: 0,
    discount: 0,
    stock: 10,
    images: [],
    tags: "",
    featured: false,
    bestseller: false
  });
  const [savingProduct, setSavingProduct] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  const loadAdminData = async () => {
    if (!user || user.role !== "admin") {
      toast.error("Admin access required");
      navigate("/goshop");
      return;
    }
    try {
      setLoading(true);
      const [statsRes, ordersRes, productsRes, catsRes] = await Promise.all([
        api.get("/goshop/admin/stats"),
        api.get("/goshop/orders/all"),
        api.get("/goshop/products?limit=200"),
        api.get("/goshop/categories")
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data);
      setProducts(productsRes.data);
      setCategories(catsRes.data);
    } catch (e) {
      toast.error("Failed to load admin dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/goshop/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Order status updated to ${newStatus}`);
      loadAdminData();
    } catch (e) {
      toast.error("Failed to update order status");
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name || productForm.price === undefined) {
      return toast.error("Product name and price are required");
    }
    setSavingProduct(true);
    try {
      const payload = {
        ...productForm,
        tags: typeof productForm.tags === "string" ? productForm.tags.split(",").map(t => t.trim()) : productForm.tags,
        images: productForm.images.length > 0 ? productForm.images : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80"]
      };

      if (editingProduct) {
        await api.put(`/goshop/products/${editingProduct.id}`, payload);
        toast.success("Product updated successfully!");
      } else {
        await api.post("/goshop/products", payload);
        toast.success("Product created successfully!");
      }

      setProductModalOpen(false);
      setEditingProduct(null);
      loadAdminData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save product");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await api.delete(`/goshop/products/${id}`);
      toast.success("Product deleted");
      loadAdminData();
    } catch (e) {
      toast.error("Failed to delete product");
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    const matchesSearch = !orderSearch ||
      o.order_no?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.user_name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.user_phone?.includes(orderSearch);
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 text-zinc-400 py-20 text-center">Loading GOSHOP STORE Admin Panel...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850 pb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-amber-400 font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Admin Management Panel
            </div>
            <h1 className="font-outfit text-3xl font-extrabold text-white">GOSHOP STORE Overview</h1>
          </div>
          <Button onClick={loadAdminData} variant="outline" size="sm" className="border-zinc-800 text-zinc-300 rounded-full">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Data
          </Button>
        </div>

        {/* ── OVERVIEW ANALYTICS STAT CARDS ───────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 bg-zinc-900/60 border-zinc-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Sales</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div className="font-outfit text-2xl font-extrabold text-white">₹{stats.total_sales}</div>
            </Card>

            <Card className="p-5 bg-zinc-900/60 border-zinc-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Orders</span>
                <Package className="w-4 h-4 text-amber-400" />
              </div>
              <div className="font-outfit text-2xl font-extrabold text-white">{stats.total_orders}</div>
            </Card>

            <Card className="p-5 bg-zinc-900/60 border-zinc-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Products</span>
                <ShoppingBag className="w-4 h-4 text-amber-400" />
              </div>
              <div className="font-outfit text-2xl font-extrabold text-white">{stats.total_products}</div>
            </Card>

            <Card className="p-5 bg-zinc-900/60 border-zinc-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold uppercase tracking-wider">Active Customers</span>
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <div className="font-outfit text-2xl font-extrabold text-white">{stats.total_users}</div>
            </Card>
          </div>
        )}

        {/* ── ADMIN TABS ──────────────────────────────────────────────── */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800 p-1 rounded-full text-xs">
            <TabsTrigger value="orders" className="rounded-full data-[state=active]:bg-amber-500 data-[state=active]:text-zinc-950 font-bold px-6">
              Orders Manager ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="products" className="rounded-full data-[state=active]:bg-amber-500 data-[state=active]:text-zinc-950 font-bold px-6">
              Product Inventory ({products.length})
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: ORDERS MANAGER & WHATSAPP FLOW ──────────────────── */}
          <TabsContent value="orders" className="space-y-6">
            
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800">
              <Input
                type="text"
                placeholder="Search orders by Order #, Customer Name, or Phone..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-zinc-200 rounded-full max-w-md text-xs"
              />
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] bg-zinc-950 border-zinc-800 text-zinc-200 rounded-full text-xs">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                  <SelectItem value="all">All Statuses</SelectItem>
                  {ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Orders Table */}
            <div className="space-y-4">
              {filteredOrders.map((o) => (
                <Card key={o.id} className="p-6 bg-zinc-900/60 border-zinc-800 rounded-2xl space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                    <div>
                      <div className="font-mono font-bold text-amber-400 text-base">#{o.order_no}</div>
                      <div className="text-xs text-zinc-300 font-medium">{o.user_name} ({o.user_phone})</div>
                      <div className="text-[11px] text-zinc-500">{o.address?.house_name_no}, {o.address?.place}, {o.address?.district} - {o.address?.pin_code}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* WhatsApp Direct Message Button */}
                      {o.whatsapp_link && (
                        <a
                          href={o.whatsapp_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-transform hover:scale-105"
                        >
                          <MessageSquare className="w-3.5 h-3.5 fill-white" /> Contact Customer
                        </a>
                      )}

                      {/* Status Selector */}
                      <Select value={o.status} onValueChange={(ns) => handleUpdateOrderStatus(o.id, ns)}>
                        <SelectTrigger className="w-[170px] bg-zinc-950 border-amber-500/40 text-amber-400 font-bold rounded-full text-xs">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                          {ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2 text-xs">
                    {o.items?.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-zinc-300">
                        <span>{it.name} (x{it.quantity})</span>
                        <span className="font-mono">₹{(it.price - (it.discount || 0)) * it.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-zinc-800 text-xs font-bold text-white">
                    <span>Total Amount</span>
                    <span className="text-amber-400 text-sm">₹{o.total}</span>
                  </div>
                </Card>
              ))}
            </div>

          </TabsContent>

          {/* ── TAB 2: PRODUCT INVENTORY ───────────────────────────────── */}
          <TabsContent value="products" className="space-y-6">
            
            <div className="flex justify-between items-center">
              <h2 className="font-outfit text-xl font-bold text-white">Product Inventory ({products.length})</h2>
              <Button
                onClick={() => {
                  setEditingProduct(null);
                  setProductForm({
                    name: "", description: "", category: "General", price: 0, discount: 0, stock: 10, images: [], tags: "", featured: false, bestseller: false
                  });
                  setProductModalOpen(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-full"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Product
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => (
                <Card key={p.id} className="p-4 bg-zinc-900/60 border-zinc-800 rounded-2xl space-y-3 relative">
                  <div className="aspect-square rounded-xl overflow-hidden bg-zinc-950">
                    <img src={(p.images || [""])[0]} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">{p.category}</div>
                    <div className="font-outfit font-bold text-white truncate text-base">{p.name}</div>
                    <div className="flex justify-between items-center mt-2 text-xs">
                      <span className="font-outfit font-extrabold text-amber-400">₹{p.price - (p.discount || 0)}</span>
                      <span className="text-zinc-400">Stock: {p.stock}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-zinc-800">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingProduct(p);
                        setProductForm({
                          name: p.name,
                          description: p.description || "",
                          category: p.category || "General",
                          price: p.price || 0,
                          discount: p.discount || 0,
                          stock: p.stock || 0,
                          images: p.images || [],
                          tags: Array.isArray(p.tags) ? p.tags.join(", ") : "",
                          featured: p.featured || false,
                          bestseller: p.bestseller || false
                        });
                        setProductModalOpen(true);
                      }}
                      className="rounded-full flex-1 border-zinc-800 text-xs text-zinc-300"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteProduct(p.id)}
                      className="rounded-full text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

          </TabsContent>

        </Tabs>

      </div>

      {/* ── PRODUCT CREATION / EDIT MODAL ───────────────────────────── */}
      <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
        <DialogContent className="max-w-xl bg-zinc-900 border-zinc-800 text-zinc-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-outfit text-xl font-bold">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="space-y-4 pt-2 text-xs">
            
            {/* Cloudinary Image Uploader */}
            <div>
              <Label className="mb-1 block">Product Image (Cloudinary Storage)</Label>
              <ImageUpload
                value={(productForm.images || [])[0] || ""}
                onChange={(url) => setProductForm({ ...productForm, images: [url] })}
                aspect="square"
              />
            </div>

            <div>
              <Label>Product Name *</Label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="bg-zinc-950 border-zinc-800 text-zinc-200"
                placeholder="e.g. GOSHOP Heritage Gold Watch"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                className="bg-zinc-950 border-zinc-800 text-zinc-200"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Input
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  className="bg-zinc-950 border-zinc-800 text-zinc-200"
                />
              </div>
              <div>
                <Label>Stock Quantity</Label>
                <Input
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) || 0 })}
                  className="bg-zinc-950 border-zinc-800 text-zinc-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price (₹) *</Label>
                <Input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })}
                  className="bg-zinc-950 border-zinc-800 text-zinc-200"
                />
              </div>
              <div>
                <Label>Discount (₹)</Label>
                <Input
                  type="number"
                  value={productForm.discount}
                  onChange={(e) => setProductForm({ ...productForm, discount: parseFloat(e.target.value) || 0 })}
                  className="bg-zinc-950 border-zinc-800 text-zinc-200"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={productForm.featured}
                  onChange={(e) => setProductForm({ ...productForm, featured: e.target.checked })}
                  className="rounded bg-zinc-950 border-zinc-800 text-amber-500"
                />
                <span>Featured Product</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={productForm.bestseller}
                  onChange={(e) => setProductForm({ ...productForm, bestseller: e.target.checked })}
                  className="rounded bg-zinc-950 border-zinc-800 text-amber-500"
                />
                <span>Bestseller</span>
              </label>
            </div>

            <Button type="submit" disabled={savingProduct} className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-full mt-4">
              {savingProduct ? "Saving..." : "Save Product"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
