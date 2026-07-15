import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, BookOpen, Package, DollarSign, Store, Building2, ShieldAlert, Star, Trash2, Ban } from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";

const STATUSES = ["New", "Processing", "Packed", "Shipped", "Delivered", "Cancelled"];

const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [books, setBooks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [superAdminEmail, setSuperAdminEmail] = useState("");
  const { user } = useAuth();

  const load = async () => {
    const [s, u, b, o] = await Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/users"),
      api.get("/admin/books"),
      api.get("/orders/all"),
    ]);
    setStats(s.data); setUsers(u.data); setBooks(b.data); setOrders(o.data);
  };
  useEffect(() => { load(); }, []);

  const suspendUser = async (id) => {
    await api.put(`/admin/users/${id}/suspend`);
    toast.success("Status toggled");
    load();
  };
  const deleteUser = async (id) => {
    if (!window.confirm("Delete user permanently?")) return;
    await api.delete(`/admin/users/${id}`);
    toast.success("Deleted");
    load();
  };
  const toggleFeatured = async (id) => {
    await api.put(`/admin/books/${id}/feature`);
    toast.success("Feature toggled");
    load();
  };
  const updateOrder = async (id, status) => {
    try {
      await api.put(`/orders/${id}/status`, { status });
      toast.success(`Status → ${status}`);
      load();
    } catch (err) { toast.error("Failed to update status"); }
  };
  const deleteOrder = async (id) => {
    if (!window.confirm("Delete order?")) return;
    try {
      await api.delete(`/admin/orders/${id}`);
      toast.success("Order deleted");
      load();
    } catch (err) { toast.error("Failed to delete order"); }
  };
  const deleteBook = async (id) => {
    if (!window.confirm("Delete book?")) return;
    try {
      await api.delete(`/admin/books/${id}`);
      toast.success("Book deleted");
      load();
    } catch (err) { toast.error("Failed to delete book"); }
  };
  const grantSuperAdmin = async (e) => {
    e.preventDefault();
    try {
      await api.put("/admin/assign_super_admin", { email: superAdminEmail });
      toast.success("Super Admin role granted!");
      setSuperAdminEmail("");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to grant role");
    }
  };
  
  const EditUserDialog = ({ u }) => {
    const [name, setName] = useState(u.name);
    const [role, setRole] = useState(u.role);
    const submit = async (e) => {
      e.preventDefault();
      try {
        await api.put(`/admin/users/${u.id}`, { name, role });
        toast.success("User updated");
        load();
      } catch (err) { toast.error("Failed to update user"); }
    };
    return (
      <Dialog>
        <DialogTrigger asChild><Button size="sm" variant="outline">Edit</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4 mt-4">
            <div><Label>Name</Label><Input value={name} onChange={e=>setName(e.target.value)} required /></div>
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="store_owner">Store Owner</SelectItem>
                  <SelectItem value="publisher">Publisher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  const EditBookDialog = ({ b }) => {
    const [title, setTitle] = useState(b.title);
    const [author, setAuthor] = useState(b.author);
    const [price, setPrice] = useState(b.price);
    const submit = async (e) => {
      e.preventDefault();
      try {
        await api.put(`/admin/books/${b.id}`, { title, author, price: parseFloat(price) });
        toast.success("Book updated");
        load();
      } catch (err) { toast.error("Failed to update book"); }
    };
    return (
      <Dialog>
        <DialogTrigger asChild><Button size="sm" variant="outline">Edit</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Book</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4 mt-4">
            <div><Label>Title</Label><Input value={title} onChange={e=>setTitle(e.target.value)} required /></div>
            <div><Label>Author</Label><Input value={author} onChange={e=>setAuthor(e.target.value)} required /></div>
            <div><Label>Price (₹)</Label><Input type="number" value={price} onChange={e=>setPrice(e.target.value)} required /></div>
            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  const Stat = ({ icon: Icon, label, value, color }) => (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-2xl font-serif">{value}</div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Command Center</div>
          <h1 className="font-serif text-4xl">Admin Dashboard</h1>
        </div>
        {user?.role === "super_admin" && (
          <form onSubmit={grantSuperAdmin} className="flex items-center gap-2 bg-muted p-2 rounded-lg">
            <Input type="email" placeholder="Email to grant Super Admin..." value={superAdminEmail} onChange={e=>setSuperAdminEmail(e.target.value)} required className="w-64 h-9 bg-background" />
            <Button type="submit" size="sm" className="h-9">Grant</Button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat icon={Users} label="Users" value={stats.total_users || 0} color="bg-primary/10 text-primary" />
        <Stat icon={BookOpen} label="Books" value={stats.total_books || 0} color="bg-secondary/10 text-secondary" />
        <Stat icon={Package} label="Orders" value={stats.total_orders || 0} color="bg-accent text-accent-foreground" />
        <Stat icon={DollarSign} label="Revenue" value={`₹${(stats.revenue || 0).toFixed(0)}`} color="bg-primary/10 text-primary" />
        <Stat icon={Store} label="Stores" value={stats.stores || 0} color="bg-secondary/10 text-secondary" />
        <Stat icon={Building2} label="Publishers" value={stats.publishers || 0} color="bg-accent text-accent-foreground" />
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" data-testid="admin-tab-users">Users</TabsTrigger>
          <TabsTrigger value="books" data-testid="admin-tab-books">Books</TabsTrigger>
          <TabsTrigger value="orders" data-testid="admin-tab-orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4 space-y-2">
          {users.map((u) => (
            <Card key={u.id} className="p-3 flex items-center gap-4" data-testid={`admin-user-${u.id}`}>
              <Avatar><AvatarFallback className="bg-primary/10 text-primary">{u.name?.[0]}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{u.name}</div>
                <div className="text-xs text-muted-foreground">{u.email} · <span className="font-mono">{u.bbid}</span></div>
              </div>
              <Badge variant="outline" className="capitalize">{u.role?.replace("_", " ")}</Badge>
              {u.suspended && <Badge variant="destructive">Suspended</Badge>}
              <EditUserDialog u={u} />
              <Button size="sm" variant="outline" onClick={() => suspendUser(u.id)} data-testid={`suspend-${u.id}`}>
                <Ban className="w-3 h-3 mr-1" /> {u.suspended ? "Unsuspend" : "Suspend"}
              </Button>
              {u.role !== "super_admin" && (
                <Button size="icon" variant="ghost" onClick={() => deleteUser(u.id)} className="text-destructive" data-testid={`del-user-${u.id}`}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="books" className="mt-4 space-y-2">
          {books.map((b) => (
            <Card key={b.id} className="p-3 flex items-center gap-4" data-testid={`admin-book-${b.id}`}>
              <div className="w-10 h-14 bg-muted rounded overflow-hidden">
                {b.image_url && <img src={b.image_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-serif font-semibold">{b.title}</div>
                <div className="text-xs text-muted-foreground">by {b.author} · {b.category}</div>
              </div>
              {b.featured && <Badge className="bg-accent text-accent-foreground">Featured</Badge>}
              <div className="font-mono text-primary">₹{b.price}</div>
              <EditBookDialog b={b} />
              <Button size="sm" variant="outline" onClick={() => toggleFeatured(b.id)} data-testid={`feature-${b.id}`}>
                <Star className="w-3 h-3 mr-1" /> {b.featured ? "Unfeature" : "Feature"}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => deleteBook(b.id)} className="text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="orders" className="mt-4 space-y-2">
          {orders.map((o) => (
            <Card key={o.id} className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div><div className="text-xs text-muted-foreground">Order</div><div className="font-mono font-semibold">{o.order_no}</div></div>
                <div><div className="text-xs text-muted-foreground">Customer</div><div className="text-sm">{o.user_name}</div></div>
                <div><div className="text-xs text-muted-foreground">Total</div><div className="font-mono text-primary">₹{o.total}</div></div>
                <Select value={o.status} onValueChange={(v) => updateOrder(o.id, v)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="icon" variant="ghost" onClick={() => deleteOrder(o.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
