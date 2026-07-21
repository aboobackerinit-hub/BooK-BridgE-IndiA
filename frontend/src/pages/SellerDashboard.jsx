import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import { BookOpen, TrendingUp, Package, DollarSign, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import ImageUpload from "@/components/ImageUpload";

const STATUSES = ["New", "Processing", "Packed", "Shipped", "Delivered", "Cancelled"];

const emptyBook = {
  title: "", author: "", description: "", price: 0, stock: 1,
  category: "Fiction", condition: "New", image_url: "", isbn: "", edition: "", language: "English"
};

const BookForm = ({ initial, onSave, categories }) => {
  const [f, setF] = useState(initial || emptyBook);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <Label>Book photo</Label>
          <ImageUpload
            value={f.image_url}
            onChange={(v) => setF({ ...f, image_url: v })}
            aspect="cover"
            testId="dash-book-image"
          />
        </div>
        <div className="md:col-span-2 grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} data-testid="book-title-input" /></div>
          <div className="col-span-2"><Label>Author</Label><Input value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} data-testid="book-author-input" /></div>
          <div><Label>Price (₹)</Label><Input type="number" value={f.price} onChange={(e) => setF({ ...f, price: parseFloat(e.target.value) || 0 })} data-testid="book-price-input" /></div>
          <div><Label>Stock</Label><Input type="number" value={f.stock} onChange={(e) => setF({ ...f, stock: parseInt(e.target.value) || 0 })} data-testid="book-stock-input" /></div>
          <div>
            <Label>Category</Label>
            <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
              <SelectTrigger data-testid="book-category-select"><SelectValue /></SelectTrigger>
              <SelectContent>{categories.filter((c) => c !== "All").map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Condition</Label>
            <Select value={f.condition} onValueChange={(v) => setF({ ...f, condition: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Used">Used</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Language</Label><Input value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })} /></div>
          <div><Label>Edition</Label><Input value={f.edition} onChange={(e) => setF({ ...f, edition: e.target.value })} /></div>
          <div className="col-span-2"><Label>ISBN</Label><Input value={f.isbn} onChange={(e) => setF({ ...f, isbn: e.target.value })} data-testid="book-isbn-input" /></div>
        </div>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} data-testid="book-desc-input" />
      </div>
      <DialogFooter>
        <Button onClick={() => onSave(f)} className="rounded-full" data-testid="save-book-btn">Save Book</Button>
      </DialogFooter>
    </div>
  );
};

const SellerDashboard = ({ role }) => {
  const { user } = useAuth();
  const [overview, setOverview] = useState({ total_books: 0, total_orders: 0, revenue: 0 });
  const [books, setBooks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    const [o, b, ors, c] = await Promise.all([
      api.get("/dashboard/overview"),
      api.get("/books", { params: { owner_id: user.id } }),
      api.get("/orders/seller"),
      api.get("/categories"),
    ]);
    setOverview(o.data); setBooks(b.data); setOrders(ors.data); setCats(c.data);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const saveBook = async (data) => {
    try {
      if (editing?.id) {
        await api.put(`/books/${editing.id}`, data);
        toast.success("Book updated");
      } else {
        await api.post("/books", data);
        toast.success("Book added");
      }
      setDialogOpen(false); setEditing(null);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const deleteBook = async (id) => {
    if (!window.confirm("Delete this book?")) return;
    await api.delete(`/books/${id}`);
    toast.success("Deleted");
    load();
  };

  const updateOrderStatus = async (orderId, status) => {
    await api.put(`/orders/${orderId}/status`, { status });
    toast.success(`Status → ${status}`);
    load();
  };

  const title = role === "publisher" ? "Publisher Dashboard" : "Store Dashboard";
  const subtitle = role === "publisher" ? "Publish & distribute" : "Manage your bookstore";

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">{subtitle}</div>
          <h1 className="font-serif text-4xl">{title}</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="rounded-full" data-testid="add-book-btn"><Plus className="w-4 h-4 mr-1" /> Add Book</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle className="font-serif">{editing?.id ? "Edit Book" : "Add New Book"}</DialogTitle></DialogHeader>
            <BookForm initial={editing} onSave={saveBook} categories={cats} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><BookOpen className="w-5 h-5" /></div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Total Books</div>
              <div className="text-2xl font-serif" data-testid="stat-books">{overview.total_books}</div>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center"><Package className="w-5 h-5" /></div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Orders</div>
              <div className="text-2xl font-serif" data-testid="stat-orders">{overview.total_orders}</div>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center"><DollarSign className="w-5 h-5" /></div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Revenue</div>
              <div className="text-2xl font-serif font-mono" data-testid="stat-revenue">₹{overview.revenue.toFixed(0)}</div>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="books" className="w-full">
        <TabsList>
          <TabsTrigger value="books" data-testid="tab-books">Books ({books.length})</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">Orders ({orders.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="books" className="mt-4">
          {books.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">No books yet. Add your first!</Card>
          ) : (
            <div className="space-y-2">
              {books.map((b) => (
                <Card key={b.id} className="p-3 flex items-center gap-4">
                  <div className="w-12 h-16 rounded bg-muted overflow-hidden shrink-0">
                    {b.image_url && <img src={b.image_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-serif font-semibold truncate">{b.title}</div>
                    <div className="text-xs text-muted-foreground">by {b.author} · {b.category}</div>
                  </div>
                  <div className="text-sm">Stock: <span className="font-mono">{b.stock}</span></div>
                  <div className="font-mono text-primary font-semibold w-20 text-right">₹{b.price}</div>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(b); setDialogOpen(true); }} data-testid={`edit-book-${b.id}`}><Edit className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteBook(b.id)} className="text-destructive" data-testid={`delete-book-${b.id}`}><Trash2 className="w-4 h-4" /></Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="orders" className="mt-4">
          {orders.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">No orders yet.</Card>
          ) : (
            <div className="space-y-2">
              {orders.map((o) => (
                <Card key={o.id} className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Order</div>
                      <div className="font-mono font-semibold">{o.order_no}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Customer</div>
                      <div className="text-sm">{o.user_name}</div>
                    </div>
                    <Select value={o.status} onValueChange={(v) => updateOrderStatus(o.id, v)}>
                      <SelectTrigger className="w-40" data-testid={`status-select-${o.id}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {o.items.filter((it) => it.seller_id === user.id).map((it) => `${it.title} × ${it.quantity}`).join(", ")}
                  </div>
                  <div className="mt-3 p-3 rounded-lg bg-accent/40 border border-accent">
                    <div className="text-[10px] uppercase tracking-wider text-accent-foreground/70 mb-1">📦 Ship to</div>
                    <div className="text-sm font-medium">{o.user_name}</div>
                    <div className="text-sm">{o.address}</div>
                    <div className="text-sm font-mono">📞 {o.phone}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">Order #{o.order_no} · Payment: {o.payment_method?.toUpperCase()}</div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SellerDashboard;
