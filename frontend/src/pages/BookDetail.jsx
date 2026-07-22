import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ShoppingBag, Heart, MessageCircle, ArrowLeft, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const BookDetail = () => {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    api.get(`/books/${id}`).then((r) => setBook(r.data)).catch(() => toast.error("Book not found"));
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

  if (!book) return <div className="text-center py-20 text-muted-foreground">Loading book...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 -ml-2" data-testid="back-btn">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>
      <div className="grid md:grid-cols-5 gap-10">
        <div className="md:col-span-2">
          <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-border bg-muted sticky top-24">
            {book.image_url ? (
              <img src={book.image_url} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full spine flex items-center justify-center">
                <BookOpen className="w-24 h-24 text-white/70" />
              </div>
            )}
          </div>
        </div>
        <div className="md:col-span-3 space-y-6">
          <div>
            <div className="flex gap-2 mb-2">
              <Badge variant="outline" className="capitalize">{book.category}</Badge>
              <Badge variant="outline" className="capitalize">{book.condition}</Badge>
              {book.featured && <Badge className="bg-accent text-accent-foreground">Featured</Badge>}
            </div>
            <h1 className="font-serif text-4xl md:text-5xl leading-tight mb-2">{book.title}</h1>
            <p className="text-muted-foreground text-lg">by {book.author}</p>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="font-mono text-3xl font-bold text-primary">₹{book.price}</span>
            <span className="text-sm text-muted-foreground">
              {book.stock > 0 ? `${book.stock} in stock` : "Out of stock"}
            </span>
          </div>

          <p className="text-foreground/80 leading-relaxed">{book.description}</p>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="border-l-2 border-border pl-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Language</div>
              <div>{book.language}</div>
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
              }} disabled={book.stock === 0} size="lg" className="rounded-full flex-1" data-testid="chat-buy-btn">
                <MessageCircle className="w-4 h-4 mr-2" /> Contact Seller to Buy
              </Button>
            ) : (
              <>
                <Button onClick={buyNow} disabled={book.stock === 0} size="lg" className="rounded-full flex-1" data-testid="buy-now-btn">
                  <ShoppingBag className="w-4 h-4 mr-2" /> Buy Now
                </Button>
                <Button onClick={addToCart} disabled={book.stock === 0} variant="outline" size="lg" className="rounded-full" data-testid="add-to-cart-btn">
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
    </div>
  );
};

export default BookDetail;
