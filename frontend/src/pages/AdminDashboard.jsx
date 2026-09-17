import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, User, BookOpen, Package, DollarSign, Store, Building2, ShieldAlert, Star, Trash2, Ban, Key, MessageSquare } from "lucide-react";
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
  const [posts, setPosts] = useState([]);
  const [labels, setLabels] = useState([]);
  const [banners, setBanners] = useState([]);

  const load = async () => {
    const [s, u, b, o, p, l, bn] = await Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/users"),
      api.get("/admin/books"),
      api.get("/orders/all"),
      api.get("/admin/posts"),
      api.get("/promotions/admin/labels").catch(() => ({ data: [] })),
      api.get("/promotions/admin/banners").catch(() => ({ data: [] })),
    ]);
    setStats(s.data); setUsers(u.data); setBooks(b.data); setOrders(o.data); setPosts(p.data);
    setLabels(l?.data || []); setBanners(bn?.data || []);
  };
  useEffect(() => { load(); }, []);

  const deletePost = async (id) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await api.delete(`/admin/posts/${id}`);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Post deleted successfully");
    } catch (err) {
      toast.error("Failed to delete post");
    }
  };

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
  
  const EditUserDialog = ({ u }) => {
    const [name, setName] = useState(u.name);
    const [role, setRole] = useState(u.role);
    const [newPass, setNewPass] = useState("");
    const [resetting, setResetting] = useState(false);

    const submit = async (e) => {
      e.preventDefault();
      try {
        await api.put(`/admin/users/${u.id}`, { name, role });
        if (newPass.trim()) {
          await api.post("/admin/reset-password", { user_id: u.id, email: u.email, new_password: newPass.trim() });
          toast.success(`User details & password updated to '${newPass.trim()}'`);
        } else {
          toast.success("User updated");
        }
        load();
      } catch (err) { toast.error("Failed to update user"); }
    };

    const handleDirectReset = async () => {
      const pass = newPass.trim() || "Password123!";
      setResetting(true);
      try {
        const res = await api.post("/admin/reset-password", { user_id: u.id, email: u.email, new_password: pass });
        toast.success(res.data?.message || `Password reset to '${pass}'`);
      } catch (err) {
        try {
          const fallbackRes = await api.put(`/admin/users/${u.id}/reset-password`, { new_password: pass });
          toast.success(fallbackRes.data?.message || `Password reset to '${pass}'`);
        } catch (e2) {
          toast.error("Failed to reset password");
        }
      } finally {
        setResetting(false);
      }
    };

    return (
      <Dialog>
        <DialogTrigger asChild><Button size="sm" variant="outline">Edit</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User & Password</DialogTitle></DialogHeader>
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
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 border-t border-border">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Reset User Password</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="New password (e.g. Password123!)"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                />
                <Button type="button" variant="secondary" onClick={handleDirectReset} disabled={resetting}>
                  {resetting ? "Resetting..." : "Reset Pass"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Leave blank to default to 'Password123!' when clicking Reset Pass.</p>
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
    const [originalPrice, setOriginalPrice] = useState(b.originalPrice || 0);
    const [offerPrice, setOfferPrice] = useState(b.offerPrice || 0);
    const submit = async (e) => {
      e.preventDefault();
      try {
        let finalPrice = parseFloat(price);
        if (b.condition === "New") {
          const orig = parseFloat(originalPrice) || 0;
          const offer = parseFloat(offerPrice) || 0;
          if (orig > 0 && offer > orig) {
            return toast.error("Offer price cannot be higher than original price.");
          }
          if (orig > 0) {
            finalPrice = offer > 0 ? offer : orig;
          }
        }
        await api.put(`/admin/books/${b.id}`, { 
          title, 
          author, 
          price: finalPrice,
          ...(b.condition === "New" && { originalPrice: parseFloat(originalPrice) || 0, offerPrice: parseFloat(offerPrice) || 0 })
        });
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
            {b.condition === "New" ? (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Orig Price (₹)</Label><Input type="number" value={originalPrice} onChange={e=>setOriginalPrice(e.target.value)} /></div>
                <div><Label>Offer Price (₹)</Label><Input type="number" value={offerPrice} onChange={e=>setOfferPrice(e.target.value)} /></div>
              </div>
            ) : (
              <div><Label>Price (₹)</Label><Input type="number" value={price} onChange={e=>setPrice(e.target.value)} required /></div>
            )}
            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  const resetUserPassword = async (u) => {
    const newPass = window.prompt(`Enter new password for ${u.name} (${u.email}):`, "Password123!");
    if (!newPass) return;
    try {
      const res = await api.post("/admin/reset-password", { user_id: u.id, email: u.email, new_password: newPass });
      toast.success(res.data?.message || "Password reset successfully!");
    } catch (e) {
      try {
        const fallbackRes = await api.put(`/admin/users/${u.id}/reset-password`, { new_password: newPass });
        toast.success(fallbackRes.data?.message || "Password reset successfully!");
      } catch (e2) {
        toast.error(e.response?.data?.detail || "Failed to reset password");
      }
    }
  };

  const toggleLabel = async (id) => {
    await api.patch(`/promotions/admin/labels/${id}/toggle`);
    toast.success("Label status toggled");
    load();
  };

  const deleteLabel = async (id) => {
    if (!window.confirm("Delete this label?")) return;
    await api.delete(`/promotions/admin/labels/${id}`);
    toast.success("Label deleted");
    load();
  };

  const toggleBanner = async (id) => {
    await api.patch(`/promotions/admin/banners/${id}/toggle`);
    toast.success("Banner status toggled");
    load();
  };

  const deleteBanner = async (id) => {
    if (!window.confirm("Delete this promotional banner?")) return;
    await api.delete(`/promotions/admin/banners/${id}`);
    toast.success("Banner deleted");
    load();
  };

  const LabelDialog = ({ label }) => {
    const isEdit = !!label;
    const [f, setF] = useState(label || { name: "", color: "green", priority: 0, startAt: "", endAt: "", bookIds: [] });
    const [bookIdsStr, setBookIdsStr] = useState(label?.bookIds?.join(", ") || "");

    const submit = async (e) => {
      e.preventDefault();
      const payload = {
        ...f,
        bookIds: bookIdsStr.split(",").map(id => id.trim()).filter(Boolean),
        startAt: f.startAt || null,
        endAt: f.endAt || null
      };
      try {
        if (isEdit) await api.put(`/promotions/admin/labels/${label.id}`, payload);
        else await api.post("/promotions/admin/labels", payload);
        toast.success(`Label ${isEdit ? "updated" : "created"}!`);
        load();
      } catch (err) { toast.error("Failed to save label"); }
    };
    return (
      <Dialog>
        <DialogTrigger asChild><Button size="sm" variant={isEdit ? "outline" : "default"}>{isEdit ? "Edit" : "Create Label"}</Button></DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{isEdit ? "Edit Label" : "New Label"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div><Label>Name (e.g. NEW, TRENDING)</Label><Input value={f.name} onChange={e=>setF({...f, name: e.target.value})} required /></div>
            <div>
              <Label>Color Preset</Label>
              <Select value={f.color} onValueChange={v=>setF({...f, color: v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {["green", "teal", "amber", "blue", "red", "purple"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Priority (lower = shown first)</Label><Input type="number" value={f.priority} onChange={e=>setF({...f, priority: parseInt(e.target.value)||0})} /></div>
            <div><Label>Book IDs (comma separated)</Label><Input placeholder="book-id-1, book-id-2" value={bookIdsStr} onChange={e=>setBookIdsStr(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date (optional)</Label><Input type="datetime-local" value={f.startAt?.slice(0,16) || ""} onChange={e=>setF({...f, startAt: e.target.value ? new Date(e.target.value).toISOString() : ""})} /></div>
              <div><Label>End Date (optional)</Label><Input type="datetime-local" value={f.endAt?.slice(0,16) || ""} onChange={e=>setF({...f, endAt: e.target.value ? new Date(e.target.value).toISOString() : ""})} /></div>
            </div>
            <Button type="submit" className="w-full">Save Label</Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  const BannerDialog = ({ banner }) => {
    const isEdit = !!banner;
    const [f, setF] = useState(banner || { type: "banner", title: "", subtitle: "", imageUrl: "", buttonText: "", buttonAction: "/store", priority: 0, startAt: "", endAt: "", countdownTarget: "", featuredBookIds: [] });
    const [bookIdsStr, setBookIdsStr] = useState(banner?.featuredBookIds?.join(", ") || "");

    const submit = async (e) => {
      e.preventDefault();
      const payload = {
        ...f,
        featuredBookIds: bookIdsStr.split(",").map(id => id.trim()).filter(Boolean),
        startAt: f.startAt || null,
        endAt: f.endAt || null,
        countdownTarget: f.type === "countdown" ? (f.countdownTarget || null) : null
      };
      try {
        if (isEdit) await api.put(`/promotions/admin/banners/${banner.id}`, payload);
        else await api.post("/promotions/admin/banners", payload);
        toast.success(`Banner ${isEdit ? "updated" : "created"}!`);
        load();
      } catch (err) { toast.error("Failed to save banner"); }
    };
    return (
      <Dialog>
        <DialogTrigger asChild><Button size="sm" variant={isEdit ? "outline" : "default"}>{isEdit ? "Edit" : "Create Promo"}</Button></DialogTrigger>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isEdit ? "Edit Promotional Content" : "New Promotional Content"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={f.type} onValueChange={v=>setF({...f, type: v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="banner">Standard Banner</SelectItem>
                  <SelectItem value="countdown">Countdown Event</SelectItem>
                  <SelectItem value="special_day">Special Day</SelectItem>
                  <SelectItem value="campaign">Campaign (with books)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Title</Label><Input value={f.title} onChange={e=>setF({...f, title: e.target.value})} required /></div>
              <div><Label>Subtitle (optional)</Label><Input value={f.subtitle} onChange={e=>setF({...f, subtitle: e.target.value})} /></div>
            </div>
            <div><Label>Image URL (optional)</Label><Input value={f.imageUrl} onChange={e=>setF({...f, imageUrl: e.target.value})} placeholder="https://..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Button Text</Label><Input value={f.buttonText} onChange={e=>setF({...f, buttonText: e.target.value})} placeholder="e.g. Shop Now" /></div>
              <div><Label>Button Action (Link)</Label><Input value={f.buttonAction} onChange={e=>setF({...f, buttonAction: e.target.value})} placeholder="/store" /></div>
            </div>
            
            {f.type === "countdown" && (
              <div><Label>Countdown Target Date/Time</Label><Input type="datetime-local" value={f.countdownTarget?.slice(0,16) || ""} onChange={e=>setF({...f, countdownTarget: e.target.value ? new Date(e.target.value).toISOString() : ""})} required /></div>
            )}
            {f.type === "campaign" && (
              <div><Label>Featured Book IDs (comma separated)</Label><Input placeholder="book-id-1, book-id-2" value={bookIdsStr} onChange={e=>setBookIdsStr(e.target.value)} /></div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Display Start Date (optional)</Label><Input type="datetime-local" value={f.startAt?.slice(0,16) || ""} onChange={e=>setF({...f, startAt: e.target.value ? new Date(e.target.value).toISOString() : ""})} /></div>
              <div><Label>Display End Date (optional)</Label><Input type="datetime-local" value={f.endAt?.slice(0,16) || ""} onChange={e=>setF({...f, endAt: e.target.value ? new Date(e.target.value).toISOString() : ""})} /></div>
            </div>
            <div><Label>Priority (lower = higher priority)</Label><Input type="number" value={f.priority} onChange={e=>setF({...f, priority: parseInt(e.target.value)||0})} /></div>
            <Button type="submit" className="w-full">Save Promotion</Button>
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
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Command Center</div>
        <h1 className="font-serif text-4xl">Admin Dashboard</h1>
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
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="users" data-testid="admin-tab-users">Users</TabsTrigger>
          <TabsTrigger value="books" data-testid="admin-tab-books">Books</TabsTrigger>
          <TabsTrigger value="orders" data-testid="admin-tab-orders">Orders</TabsTrigger>
          <TabsTrigger value="posts" data-testid="admin-tab-posts">Posts</TabsTrigger>
          <TabsTrigger value="store_content" data-testid="admin-tab-store-content">Store Content</TabsTrigger>
        </TabsList>

        <TabsContent value="store_content" className="mt-4 space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-serif">Book Labels</h2>
              <LabelDialog />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {labels.map(l => (
                <Card key={l.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className={`bg-${l.color}-500 text-white hover:bg-${l.color}-600`}>{l.name}</Badge>
                      <span className="text-xs text-muted-foreground">Priority: {l.priority}</span>
                      {!l.enabled && <Badge variant="outline" className="text-muted-foreground">Disabled</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {l.bookIds?.length || 0} books assigned
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <LabelDialog label={l} />
                    <Button size="sm" variant="outline" onClick={() => toggleLabel(l.id)}>{l.enabled ? "Disable" : "Enable"}</Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteLabel(l.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </Card>
              ))}
              {labels.length === 0 && <div className="text-muted-foreground text-sm col-span-2">No labels configured.</div>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-serif">Promotional Content</h2>
              <BannerDialog />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {banners.map(b => (
                <Card key={b.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="uppercase text-[10px]">{b.type?.replace("_", " ")}</Badge>
                        <Badge className={
                          b.status === "active" ? "bg-emerald-500 hover:bg-emerald-600" :
                          b.status === "scheduled" ? "bg-amber-500 hover:bg-amber-600" :
                          b.status === "expired" ? "bg-destructive hover:bg-destructive" :
                          "bg-muted text-muted-foreground"
                        }>
                          {b.status?.toUpperCase()}
                        </Badge>
                      </div>
                      <h3 className="font-semibold">{b.title}</h3>
                      {b.subtitle && <div className="text-sm text-muted-foreground">{b.subtitle}</div>}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-1">
                        <BannerDialog banner={b} />
                        <Button size="icon" variant="ghost" onClick={() => deleteBanner(b.id)} className="text-destructive h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => toggleBanner(b.id)} className="h-8">{b.enabled ? "Disable" : "Enable"}</Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {b.startAt && <div>Start: {new Date(b.startAt).toLocaleString()}</div>}
                    {b.endAt && <div>End: {new Date(b.endAt).toLocaleString()}</div>}
                  </div>
                </Card>
              ))}
              {banners.length === 0 && <div className="text-muted-foreground text-sm col-span-2">No promotional content configured.</div>}
            </div>
          </div>
        </TabsContent>

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
              <Button size="sm" variant="outline" onClick={() => resetUserPassword(u)} data-testid={`reset-pass-${u.id}`}>
                <Key className="w-3 h-3 mr-1" /> Reset Pass
              </Button>
              <Button size="sm" variant="outline" onClick={() => suspendUser(u.id)} data-testid={`suspend-${u.id}`}>
                <Ban className="w-3 h-3 mr-1" /> {u.suspended ? "Unsuspend" : "Suspend"}
              </Button>
              {u.role !== "admin" && (
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
              <div className="font-mono text-primary w-24 text-right">
                {b.condition === "New" && b.originalPrice > (b.offerPrice || b.originalPrice) && (b.offerPrice || 0) > 0 ? (
                  <div className="flex flex-col items-end">
                    <span className="font-bold">₹{b.offerPrice}</span>
                    <strike className="text-muted-foreground text-[10px]">₹{b.originalPrice}</strike>
                    <span className="text-green-600 dark:text-green-400 text-[10px]">
                      {Math.floor(((b.originalPrice - b.offerPrice) / b.originalPrice) * 100)}% off
                    </span>
                  </div>
                ) : (
                  <span className="font-bold">₹{b.price}</span>
                )}
              </div>
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
            <Card key={o.id} className="p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b">
                <div><div className="text-xs text-muted-foreground">Order ID</div><div className="font-mono font-semibold">{o.order_no}</div></div>
                <div><div className="text-xs text-muted-foreground">Customer Name</div><div className="text-sm">{o.user_name}</div></div>
                <div><div className="text-xs text-muted-foreground">Total Paid</div><div className="font-mono text-primary font-bold">₹{o.total}</div></div>
                <div className="flex items-center gap-2">
                  <Select value={o.status} onValueChange={(v) => updateOrder(o.id, v)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" onClick={() => deleteOrder(o.id)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-muted/50 p-4 rounded-xl border border-border/50">
                  <div className="text-xs font-bold mb-3 uppercase text-primary tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4" /> Customer & Shipping
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm flex justify-between"><span className="font-medium text-muted-foreground">Name:</span> <span className="font-semibold">{o.user_name || "N/A"}</span></div>
                    <div className="text-sm flex justify-between"><span className="font-medium text-muted-foreground">Mobile:</span> <span className="font-mono">{o.phone || "N/A"}</span></div>
                    <div className="text-sm flex flex-col gap-1 mt-2">
                      <span className="font-medium text-muted-foreground">Delivery Address:</span>
                      <span className="bg-background/50 p-2 rounded text-sm border">{o.address || "No address provided"}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-muted/50 p-4 rounded-xl border border-border/50">
                  <div className="text-xs font-bold mb-3 uppercase text-primary tracking-wider flex items-center gap-2">
                    <Package className="w-4 h-4" /> Order Items
                  </div>
                  <div className="space-y-3">
                    {o.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start text-sm bg-background/50 p-2 rounded border">
                        <div className="flex flex-col">
                          <span className="font-semibold line-clamp-1">{item.book_title || item.title || "Unknown Book"}</span>
                          <span className="text-xs text-muted-foreground">Qty: {item.quantity || 1}</span>
                        </div>
                        <span className="font-mono font-semibold text-primary">₹{item.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="posts" className="mt-4 space-y-2">
          {posts.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No community posts found.
            </Card>
          ) : (
            posts.map((p) => (
              <Card key={p.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4" data-testid={`admin-post-${p.id}`}>
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Avatar className="w-9 h-9 border">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {(p.author?.name || p.user_name || "U")[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{p.author?.name || p.user_name || "Community Member"}</span>
                      {p.created_at && (
                        <span className="text-xs text-muted-foreground">
                          · {typeof p.created_at === "string" ? new Date(p.created_at).toLocaleDateString() : "Recently"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground/90 line-clamp-2">{p.text}</p>
                    {p.image_url && (
                      <div className="mt-2 w-16 h-16 rounded overflow-hidden border bg-muted">
                        <img src={p.image_url} alt="Post media" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end md:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deletePost(p.id)}
                    className="text-destructive hover:bg-destructive/10 border-destructive/30"
                    data-testid={`delete-post-${p.id}`}
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Delete Post
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
