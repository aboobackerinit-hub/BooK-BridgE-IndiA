import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, ShoppingBag, MapPin, Phone, CreditCard } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const CartPage = () => {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [payment, setPayment] = useState("cod");
  const [placing, setPlacing] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const load = async () => {
    const { data } = await api.get("/cart");
    setCart(data);
  };
  useEffect(() => {
    load();
    if (user?.address) setAddress(user.address);
    if (user?.phone) setPhone(user.phone);
  }, [user]);

  const remove = async (bookId) => {
    await api.delete(`/cart/${bookId}`);
    toast.success("Removed");
    load();
  };

  const placeOrder = async () => {
    if (!address.trim() || !phone.trim()) return toast.error("Address and phone required");
    setPlacing(true);
    try {
      const { data } = await api.post("/orders", { address, phone, payment_method: payment });
      toast.success(`Order placed! ${data.order_no}`);
      navigate("/orders");
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    setPlacing(false);
  };

  const hasInsufficientStock = cart.items.some((item) => (item.book?.stock || 0) < item.quantity);

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Checkout</div>
          <h1 className="font-serif text-4xl">Your Cart</h1>
        </div>
        {cart.items.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">Your cart is empty.</p>
            <Link to="/store"><Button className="rounded-full">Browse books</Button></Link>
          </Card>
        ) : (
          cart.items.map((item) => (
            <Card key={item.id} className="p-4 flex gap-4" data-testid={`cart-item-${item.book_id}`}>
              <div className="w-20 h-28 rounded-lg overflow-hidden bg-muted shrink-0">
                {item.book?.image_url && <img src={item.book.image_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1">
                <h3 className="font-serif font-semibold">{item.book?.title}</h3>
                <p className="text-sm text-muted-foreground">by {item.book?.author}</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="font-mono text-primary font-semibold">₹{item.book?.price}</span>
                  <span className="text-xs text-muted-foreground">× {item.quantity}</span>
                </div>
                {(item.book?.stock || 0) < item.quantity && (
                  <div className="text-xs text-destructive mt-1">
                    {item.book?.stock === 0 ? "Out of stock" : `Only ${item.book?.stock} available`}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(item.book_id)} className="text-destructive" data-testid={`remove-${item.book_id}`}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </Card>
          ))
        )}
      </div>

      <div className="space-y-4">
        <Card className="p-6 space-y-4 sticky top-24">
          <h2 className="font-serif text-xl">Delivery details</h2>
          <div>
            <Label htmlFor="addr"><MapPin className="w-3 h-3 inline mr-1" /> Address</Label>
            <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, State, Pincode" data-testid="checkout-address" />
          </div>
          <div>
            <Label htmlFor="ph"><Phone className="w-3 h-3 inline mr-1" /> Phone</Label>
            <Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 90000 00000" data-testid="checkout-phone" />
          </div>
          <div>
            <Label><CreditCard className="w-3 h-3 inline mr-1" /> Payment</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[{ v: "cod", l: "Cash on Delivery" }, { v: "upi", l: "UPI (Demo)" }].map((p) => (
                <button key={p.v} onClick={() => setPayment(p.v)} data-testid={`payment-${p.v}`}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    payment === p.v ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}>{p.l}</button>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">₹{cart.total?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery</span>
              <span className="font-mono text-secondary">Free</span>
            </div>
            <div className="flex justify-between text-lg font-semibold pt-2 border-t border-border">
              <span>Total</span>
              <span className="font-mono text-primary">₹{cart.total?.toFixed(2)}</span>
            </div>
          </div>
          <Button onClick={placeOrder} disabled={placing || cart.items.length === 0 || hasInsufficientStock} className="w-full rounded-full h-11" data-testid="place-order-btn">
            {placing ? "Placing..." : hasInsufficientStock ? "Insufficient Stock" : "Place Order"}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default CartPage;
