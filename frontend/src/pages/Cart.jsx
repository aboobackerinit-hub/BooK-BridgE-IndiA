import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, ShoppingBag, MapPin, Phone, CreditCard, Minus, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const CartPage = () => {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [payment, setPayment] = useState("razorpay");
  const [placing, setPlacing] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const load = async () => {
    try {
      const { data } = await api.get("/cart");
      setCart(data);
    } catch (e) {
      console.error("Cart load error", e);
    }
  };
  useEffect(() => {
    load();
    const t1 = setTimeout(() => load(), 500);
    const t2 = setTimeout(() => load(), 1200);
    if (user?.address) setAddress(user.address);
    if (user?.phone) setPhone(user.phone);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [user]);

  const remove = async (bookId) => {
    await api.delete(`/cart/${bookId}`);
    toast.success("Removed");
    load();
  };

  const [updatingIds, setUpdatingIds] = useState([]);

  const updateQuantity = async (bookId, newQty, maxStock) => {
    if (newQty < 1) return;
    if (updatingIds.includes(bookId)) return; // Prevent duplicate rapid taps
    if (maxStock && newQty > maxStock) {
      toast.error(`Only ${maxStock} copy(ies) available in stock`);
      return;
    }

    setUpdatingIds((prev) => [...prev, bookId]);

    // Optimistic UI update for immediate total recalculation
    setCart((prev) => {
      const updatedItems = prev.items.map((i) => {
        if (i.book_id === bookId) {
          return { ...i, quantity: newQty };
        }
        return i;
      });
      const newTotal = updatedItems.reduce((acc, i) => acc + ((parseFloat(i.book?.price) || 0) * i.quantity), 0);
      return { items: updatedItems, total: newTotal };
    });

    try {
      await api.put(`/cart/${bookId}`, { quantity: newQty });
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to update quantity");
      await load();
    } finally {
      setUpdatingIds((prev) => prev.filter((id) => id !== bookId));
    }
  };

  const placeOrder = async () => {
    if (!address.trim() || !phone.trim()) return toast.error("Address and phone required");
    setPlacing(true);
    try {
      // 1. Place order in BookBridge backend
      const { data: orderData } = await api.post("/orders", { address, phone, payment_method: payment });

      if (payment === "razorpay") {
        try {
          // Ensure Razorpay SDK is loaded dynamically
          const isRzpLoaded = await loadRazorpayScript();
          if (!isRzpLoaded) {
            toast.error("Unable to load Razorpay Checkout. Please check your internet connection.");
            setPlacing(false);
            return;
          }

          // 2. Create Razorpay Payment order
          const { data: rzpOrder } = await api.post("/payments/create-order", {
            order_id: orderData.id,
            amount: cart.total
          });

          const options = {
            key: rzpOrder.key_id,
            amount: rzpOrder.amount,
            currency: rzpOrder.currency || "INR",
            name: "BookBridge India",
            description: `Order #${orderData.order_no}`,
            order_id: rzpOrder.razorpay_order_id,
            handler: async (response) => {
              try {
                // 3. Verify Payment Signature
                await api.post("/payments/verify", {
                  order_id: orderData.id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                });
                toast.success(`Payment verified! Order #${orderData.order_no} placed.`);
              } catch (err) {
                toast.error("Payment verification failed. Please contact support.");
              } finally {
                navigate("/orders");
              }
            },
            prefill: {
              name: user?.name || "",
              email: user?.email || "",
              contact: phone
            },
            theme: {
              color: "#16a34a"
            },
            modal: {
              ondismiss: () => {
                toast.info("Payment cancelled. Order placed with pending payment.");
                navigate("/orders");
              }
            }
          };

          const rzp = new window.Razorpay(options);
          rzp.open();
          setPlacing(false);
          return;
        } catch (rzpErr) {
          toast.error("Razorpay initialization error: " + (rzpErr.response?.data?.detail || rzpErr.message));
          navigate("/orders");
          return;
        }
      }

      toast.success(`Order placed! ${orderData.order_no}`);
      navigate("/orders");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to place order");
    }
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
          cart.items.map((item) => {
            const itemPrice = parseFloat(item.book?.price) || 0;
            const itemSubtotal = itemPrice * item.quantity;
            const stock = item.book?.stock || 0;

            return (
              <Card key={item.id} className="p-4 flex gap-4 items-start" data-testid={`cart-item-${item.book_id}`}>
                <div className="w-20 h-28 rounded-lg overflow-hidden bg-muted shrink-0">
                  {item.book?.image_url && <img src={item.book.image_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-serif font-semibold text-base leading-snug">{item.book?.title}</h3>
                      <p className="text-xs text-muted-foreground">by {item.book?.author}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => remove(item.book_id)} className="text-destructive h-8 w-8 shrink-0" data-testid={`remove-${item.book_id}`} title="Remove item">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-primary font-bold text-base">₹{itemSubtotal.toFixed(2)}</div>
                      <div className="text-[11px] text-muted-foreground">₹{itemPrice} × {item.quantity}</div>
                    </div>

                    {/* Touch-Friendly Quantity Control Selector */}
                    <div className="flex items-center border border-border rounded-lg bg-background overflow-hidden shadow-sm" data-testid={`qty-control-${item.book_id}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-none text-foreground hover:bg-muted"
                        onClick={() => updateQuantity(item.book_id, item.quantity - 1, stock)}
                        disabled={item.quantity <= 1}
                        data-testid={`qty-minus-${item.book_id}`}
                        title="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                      <span className="w-8 text-center font-mono text-xs font-bold select-none" data-testid={`qty-val-${item.book_id}`}>
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-none text-foreground hover:bg-muted"
                        onClick={() => updateQuantity(item.book_id, item.quantity + 1, stock)}
                        disabled={item.quantity >= stock}
                        data-testid={`qty-plus-${item.book_id}`}
                        title={item.quantity >= stock ? `Max stock reached (${stock})` : "Increase quantity"}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {stock < item.quantity && (
                    <div className="text-xs text-destructive font-medium mt-1">
                      {stock === 0 ? "Out of stock" : `Only ${stock} copy(ies) available in stock`}
                    </div>
                  )}
                </div>
              </Card>
            );
          })
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
            <Label><CreditCard className="w-3 h-3 inline mr-1" /> Payment Method</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[
                { v: "razorpay", l: "Razorpay (Online)" },
                { v: "upi", l: "UPI (Demo)" }
              ].map((p) => (
                <button key={p.v} onClick={() => setPayment(p.v)} data-testid={`payment-${p.v}`}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    payment === p.v ? "border-primary bg-primary/5 font-bold text-primary" : "border-border hover:border-primary/40"
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
            {placing ? "Placing..." : hasInsufficientStock ? "Insufficient Stock" : payment === "razorpay" ? "Pay with Razorpay" : "Place Order"}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default CartPage;
