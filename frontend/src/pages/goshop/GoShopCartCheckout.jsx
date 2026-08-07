import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShoppingBag, Trash2, MapPin, Plus, Check, Phone, ArrowRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

export const GoShopCartCheckout = () => {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [loading, setLoading] = useState(true);

  // 10-field Address Form
  const [addrForm, setAddrForm] = useState({
    full_name: "",
    mobile_number: "",
    house_name_no: "",
    street: "",
    landmark: "",
    place: "",
    post_office: "",
    district: "",
    state: "Kerala",
    pin_code: ""
  });

  const { user } = useAuth();
  const navigate = useNavigate();

  const loadCartAndAddresses = async () => {
    if (!user) {
      navigate("/goshop/auth");
      return;
    }
    try {
      setLoading(true);
      const [cartRes, addrRes] = await Promise.all([
        api.get("/goshop/cart"),
        api.get("/goshop/addresses")
      ]);
      setCart(cartRes.data);
      setAddresses(addrRes.data);

      if (addrRes.data.length > 0) {
        const def = addrRes.data.find(a => a.is_default) || addrRes.data[0];
        setSelectedAddressId(def.id);
      }
    } catch (e) {
      toast.error("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCartAndAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleRemoveItem = async (productId) => {
    try {
      await api.delete(`/goshop/cart/${productId}`);
      toast.success("Removed from cart");
      loadCartAndAddresses();
    } catch (e) {
      toast.error("Failed to remove item");
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!addrForm.full_name || !addrForm.mobile_number || !addrForm.pin_code) {
      return toast.error("Full Name, Mobile Number, and PIN Code are required");
    }
    try {
      const { data } = await api.post("/goshop/addresses", addrForm);
      toast.success("Delivery address saved!");
      setAddresses([...addresses, data]);
      setSelectedAddressId(data.id);
      setAddressModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save address");
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      return toast.error("Please select or add a delivery address");
    }
    setPlacingOrder(true);
    try {
      const { data } = await api.post("/goshop/orders", {
        address_id: selectedAddressId
      });

      toast.success(`Order placed successfully! Order #${data.order_no}`);
      
      // Auto open WhatsApp contact notice if available
      if (data.whatsapp_url) {
        window.open(data.whatsapp_url, "_blank");
      }

      navigate("/goshop/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Order placement failed");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 text-zinc-400 py-20 text-center">Loading cart...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-amber-400 font-bold">Checkout</div>
          <h1 className="font-outfit text-4xl font-extrabold text-white">Your Cart & Delivery</h1>
        </div>

        {cart.items.length === 0 ? (
          <Card className="p-12 text-center bg-zinc-900/40 border-zinc-800 text-zinc-400 rounded-2xl">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
            <p className="font-outfit text-lg font-medium text-zinc-300">Your cart is currently empty.</p>
            <Link to="/goshop/catalog" className="inline-block mt-4">
              <Button className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-full">
                Browse Products
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Left: Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="font-outfit text-xl font-bold text-zinc-200">Cart Items ({cart.items.length})</h2>
              
              {cart.items.map((item) => {
                const p = item.product || {};
                const effectivePrice = (p.price || 0) - (p.discount || 0);
                return (
                  <Card key={item.id} className="p-4 bg-zinc-900/60 border-zinc-800 rounded-2xl flex gap-4 items-center">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-zinc-950 shrink-0">
                      <img src={(p.images || [""])[0]} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-outfit font-semibold text-white truncate">{p.name}</h3>
                      <div className="text-xs text-zinc-400 mt-0.5">Category: {p.category}</div>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="font-outfit font-extrabold text-amber-400 text-base">₹{effectivePrice}</span>
                        <span className="text-xs text-zinc-500">× {item.quantity}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(item.product_id)}
                      className="text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-full"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </Card>
                );
              })}

              {/* Order Workflow Info Card */}
              <Card className="p-4 bg-amber-500/5 border-amber-500/20 rounded-2xl flex items-center gap-3 text-xs text-amber-300">
                <MessageSquare className="w-5 h-5 shrink-0 text-amber-400" />
                <div>
                  <span className="font-bold">WhatsApp Order Flow: </span>
                  After placing order, Admin will contact you on your mobile number via WhatsApp to confirm order & verify payment.
                </div>
              </Card>
            </div>

            {/* Right: Address Selector & Order Summary */}
            <div className="space-y-6">
              
              {/* Address Manager */}
              <Card className="p-6 bg-zinc-900/60 border-zinc-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-outfit text-lg font-bold text-zinc-200 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-400" /> Delivery Address
                  </h2>
                  <Button size="sm" variant="ghost" onClick={() => setAddressModalOpen(true)} className="text-xs text-amber-400 hover:bg-amber-500/10 rounded-full">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add New
                  </Button>
                </div>

                {addresses.length === 0 ? (
                  <div className="text-xs text-zinc-500 text-center py-4">No address saved. Click "Add New" to add delivery details.</div>
                ) : (
                  <div className="space-y-2">
                    {addresses.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => setSelectedAddressId(a.id)}
                        className={`p-3 rounded-xl border cursor-pointer text-xs space-y-1 transition-all ${
                          selectedAddressId === a.id ? "bg-amber-500/10 border-amber-500 text-zinc-200" : "bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <div className="font-bold text-white flex justify-between">
                          <span>{a.full_name} ({a.mobile_number})</span>
                          {selectedAddressId === a.id && <Check className="w-4 h-4 text-amber-400" />}
                        </div>
                        <div>{a.house_name_no}, {a.street}, {a.place}</div>
                        <div>{a.district}, {a.state} - {a.pin_code}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Summary */}
              <Card className="p-6 bg-zinc-900/60 border-zinc-800 rounded-2xl space-y-4">
                <h2 className="font-outfit text-lg font-bold text-zinc-200">Order Summary</h2>
                <div className="space-y-2 text-xs border-b border-zinc-800 pb-3">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal</span>
                    <span className="font-mono">₹{cart.total}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Shipping</span>
                    <span className="text-emerald-400 font-medium">Free</span>
                  </div>
                </div>
                <div className="flex justify-between text-base font-bold text-white pt-1">
                  <span>Total Amount</span>
                  <span className="font-outfit text-amber-400 font-extrabold text-xl">₹{cart.total}</span>
                </div>

                <Button
                  onClick={handlePlaceOrder}
                  disabled={placingOrder || cart.items.length === 0}
                  className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-zinc-950 font-bold rounded-full h-11 text-sm shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-transform"
                >
                  {placingOrder ? "Placing Order..." : "Confirm & Place Order"} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Card>

            </div>

          </div>
        )}

      </div>

      {/* ── 10-FIELD ADDRESS CREATION MODAL ──────────────────────────── */}
      <Dialog open={addressModalOpen} onOpenChange={setAddressModalOpen}>
        <DialogContent className="max-w-md bg-zinc-900 border-zinc-800 text-zinc-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-outfit text-xl font-bold">Add Delivery Address</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAddress} className="space-y-3 pt-2 text-xs">
            <div>
              <Label>Full Name *</Label>
              <Input value={addrForm.full_name} onChange={(e) => setAddrForm({ ...addrForm, full_name: e.target.value })} className="bg-zinc-950 border-zinc-800 text-zinc-200" placeholder="John Doe" />
            </div>
            <div>
              <Label>Mobile Number *</Label>
              <Input value={addrForm.mobile_number} onChange={(e) => setAddrForm({ ...addrForm, mobile_number: e.target.value })} className="bg-zinc-950 border-zinc-800 text-zinc-200" placeholder="+91 90000 00000" />
            </div>
            <div>
              <Label>House Name / Number *</Label>
              <Input value={addrForm.house_name_no} onChange={(e) => setAddrForm({ ...addrForm, house_name_no: e.target.value })} className="bg-zinc-950 border-zinc-800 text-zinc-200" placeholder="Villa 12A" />
            </div>
            <div>
              <Label>Street *</Label>
              <Input value={addrForm.street} onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })} className="bg-zinc-950 border-zinc-800 text-zinc-200" placeholder="Main Street" />
            </div>
            <div>
              <Label>Landmark</Label>
              <Input value={addrForm.landmark} onChange={(e) => setAddrForm({ ...addrForm, landmark: e.target.value })} className="bg-zinc-950 border-zinc-800 text-zinc-200" placeholder="Near Temple" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Place *</Label>
                <Input value={addrForm.place} onChange={(e) => setAddrForm({ ...addrForm, place: e.target.value })} className="bg-zinc-950 border-zinc-800 text-zinc-200" placeholder="City / Town" />
              </div>
              <div>
                <Label>Post Office *</Label>
                <Input value={addrForm.post_office} onChange={(e) => setAddrForm({ ...addrForm, post_office: e.target.value })} className="bg-zinc-950 border-zinc-800 text-zinc-200" placeholder="P.O. Name" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>District *</Label>
                <Input value={addrForm.district} onChange={(e) => setAddrForm({ ...addrForm, district: e.target.value })} className="bg-zinc-950 border-zinc-800 text-zinc-200" placeholder="District" />
              </div>
              <div>
                <Label>State *</Label>
                <Input value={addrForm.state} onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })} className="bg-zinc-950 border-zinc-800 text-zinc-200" />
              </div>
              <div>
                <Label>PIN Code *</Label>
                <Input value={addrForm.pin_code} onChange={(e) => setAddrForm({ ...addrForm, pin_code: e.target.value })} className="bg-zinc-950 border-zinc-800 text-zinc-200" placeholder="600000" />
              </div>
            </div>

            <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-full mt-4">
              Save Address
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
