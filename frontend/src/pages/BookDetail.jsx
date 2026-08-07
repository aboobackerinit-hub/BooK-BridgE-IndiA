import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ShoppingBag, Heart, MessageCircle, ArrowLeft, BookOpen, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import ImageUpload from "@/components/ImageUpload";

const CATEGORIES = ["Fiction", "Non-Fiction", "Science", "History", "Biography", "Children", "Academic", "Poetry", "Regional", "General"];

const BookDetail = () => {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const loadBook = () => {
    api.get(`/books/${id}`).then((r) => {
      setBook(r.data);
      setEditForm(r.data);
    }).catch(() => toast.error("Book not found"));
  };

  useEffect(() => {
    loadBook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addToCart = async () => {
    try {
      await api.post("/cart", { book_id: id, quantity: 1 });
      toast.success("Added to cart");
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const buyNow = async () => {
    await addToCart();
    navigate("/cart");
  };

  const startChat = () => {
    if (book?.owner) navigate(`/chat/${book.owner.id}`);
  };

  const isOwnerOrAdmin = user && book && (user.id === book.owner_id || user.id === book.owner?.id || user.role === "admin");

  const saveEdit = async () => {
    if (!editForm.title?.trim() || !editForm.author?.trim() || editForm.price === undefined) {
      return toast.error("Title, author, and price are required");
    }
    setSaving(true);
    try {
      const { data } = await api.put(`/books/${id}`, editForm);
      toast.success("Listing updated successfully!");
      setBook(data);
      setEditForm(data);
      setEditOpen(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to update listing");
    } finally {
      setSaving(false);
    }
  };

  const deleteListing = async () => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    try {
      await api.delete(`/books/${id}`);
      toast.success("Listing deleted");
      navigate("/store");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to delete listing");
    }
  };

  if (!book) return <div className="text-center py-20 text-muted-foreground">Loading book...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2" data-testid="back-btn">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        {isOwnerOrAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setEditOpen(true)} data-testid="edit-listing-btn">
              <Edit className="w-4 h-4 mr-2" /> Edit Listing
            </Button>
            <Button variant="destructive" className="rounded-full" onClick={deleteListing} data-testid="delete-listing-btn">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-5 gap-10">
        <div className="md:col-span-2">
          <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-border bg-muted sticky top-24">
            <OptimizedImage src={book.image_url} alt={book.title} fallbackType="book" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="md:col-span-3 space-y-6">
          <div>
            <div className="flex gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className="capitalize">{book.category}</Badge>
              <Badge variant="outline" className="capitalize">{book.condition}</Badge>
              {book.featured && <Badge className="bg-accent text-accent-foreground">Featured</Badge>}
              {book.stock <= 0 && <Badge variant="destructive">Out of Stock</Badge>}
            </div>
            <h1 className="font-serif text-4xl md:text-5xl leading-tight mb-2">{book.title}</h1>
            <p className="text-muted-foreground text-lg">by {book.author}</p>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="font-mono text-3xl font-bold text-primary">₹{book.price}</span>
            <span className={`text-sm font-medium ${book.stock > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
              {book.stock > 0 ? `${book.stock} in stock` : "Out of Stock"}
            </span>
          </div>

          <p className="text-foreground/80 leading-relaxed">{book.description}</p>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="border-l-2 border-border pl-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Language</div>
              <div>{book.language || "English"}</div>
            </div>
            <div className="border-l-2 border-border pl-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Edition</div>
              <div>{book.edition || "—"}</div>
            </div>
            {book.isbn && (
              <div className="border-l-2 border-border pl-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">ISBN</div>
                <div className="font-mono text-xs">{book.isbn}</div>
              </div>
            )}
            <div className="border-l-2 border-border pl-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sold by</div>
              <div className="capitalize">{book.owner_role?.replace("_", " ")}</div>
            </div>
          </div>

          <div className="flex gap-3">
            {book.owner_role === "user" ? (
              <Button onClick={async () => {
                try {
                  const [creatingToast] = [toast.loading("Initiating chat...")];
                  await api.post("/orders/chat", { book_id: id });
                  toast.dismiss(creatingToast);
                  navigate(`/chat/${book.owner.id}`);
                } catch (e) {
                  toast.error(e.response?.data?.detail || "Failed to start chat");
                }
              }} disabled={book.stock <= 0} size="lg" className="rounded-full flex-1" data-testid="chat-buy-btn">
                <MessageCircle className="w-4 h-4 mr-2" /> {book.stock > 0 ? "Contact Seller to Buy" : "Out of Stock"}
              </Button>
            ) : (
              <>
                <Button onClick={buyNow} disabled={book.stock <= 0} size="lg" className="rounded-full flex-1" data-testid="buy-now-btn">
                  <ShoppingBag className="w-4 h-4 mr-2" /> {book.stock > 0 ? "Buy Now" : "Out of Stock"}
                </Button>
                <Button onClick={addToCart} disabled={book.stock <= 0} variant="outline" size="lg" className="rounded-full" data-testid="add-to-cart-btn">
                  Add to Cart
                </Button>
              </>
            )}
          </div>

          {book.owner && (
            <Card className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <Avatar className="w-14 h-14 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-serif text-lg">
                    {book.owner.name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 sm:flex-none">
                  <div className="font-serif font-semibold">{book.owner.name}</div>
                  <div className="text-xs font-mono text-muted-foreground">{book.owner.bbid}</div>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 sm:ml-auto">
                <Button size="sm" variant="outline" className="rounded-full flex-1 sm:flex-none" onClick={() => navigate(`/profile/${book.owner.id}`)} data-testid="view-seller-btn">
                  View Profile
                </Button>
                {user?.id !== book.owner.id && (
                  <Button size="sm" className="rounded-full flex-1 sm:flex-none" onClick={startChat} data-testid="chat-seller-btn">
                    <MessageCircle className="w-3 h-3 mr-1" /> Chat
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Listing Modal */}
      {editForm && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Edit Book Listing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Book Cover Image</Label>
                  <ImageUpload
                    value={editForm.image_url}
                    onChange={(v) => setEditForm({ ...editForm, image_url: v })}
                    aspect="cover"
                    testId="edit-book-image"
                  />
                </div>
                <div className="sm:col-span-2 space-y-3">
                  <div>
                    <Label>Title *</Label>
                    <Input value={editForm.title || ""} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} data-testid="edit-title-input" />
                  </div>
                  <div>
                    <Label>Author *</Label>
                    <Input value={editForm.author || ""} onChange={(e) => setEditForm({ ...editForm, author: e.target.value })} data-testid="edit-author-input" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Price (₹) *</Label>
                      <Input type="number" min={0} value={editForm.price ?? 0} onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })} data-testid="edit-price-input" />
                    </div>
                    <div>
                      <Label>Stock Quantity *</Label>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setEditForm({ ...editForm, stock: Math.max(0, (editForm.stock || 0) - 1) })}>
                          -
                        </Button>
                        <Input type="number" min={0} value={editForm.stock ?? 0} onChange={(e) => setEditForm({ ...editForm, stock: parseInt(e.target.value) || 0 })} className="text-center" data-testid="edit-stock-input" />
                        <Button type="button" variant="outline" size="sm" onClick={() => setEditForm({ ...editForm, stock: (editForm.stock || 0) + 1 })}>
                          +
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={editForm.category || "General"} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                    <SelectTrigger data-testid="edit-category-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Condition</Label>
                  <Select value={editForm.condition || "Used"} onValueChange={(v) => setEditForm({ ...editForm, condition: v })}>
                    <SelectTrigger data-testid="edit-condition-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">Brand New</SelectItem>
                      <SelectItem value="Used">Used - Good</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea rows={4} value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} data-testid="edit-description-input" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Language</Label>
                  <Input value={editForm.language || "English"} onChange={(e) => setEditForm({ ...editForm, language: e.target.value })} />
                </div>
                <div>
                  <Label>Edition</Label>
                  <Input value={editForm.edition || ""} onChange={(e) => setEditForm({ ...editForm, edition: e.target.value })} />
                </div>
                <div>
                  <Label>ISBN</Label>
                  <Input value={editForm.isbn || ""} onChange={(e) => setEditForm({ ...editForm, isbn: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="rounded-full">
                Cancel
              </Button>
              <Button type="button" onClick={saveEdit} disabled={saving} className="rounded-full px-6" data-testid="save-edit-btn">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default BookDetail;
