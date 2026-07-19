"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trash2, ShoppingCart, MapPin, Package, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deliveryMethod, setDeliveryMethod] = useState("pickup");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchCart = async () => {
    try {
      // In a real app this would fetch the user's cart from backend
      // const res = await apiClient.get("/cart");
      // setCartItems(res.data);
      
      // MOCK DATA for UI purposes
      setTimeout(() => {
        setCartItems([
          {
            id: "1",
            title: "Introduction to Algorithms",
            author: "Thomas H. Cormen",
            price: 450,
            image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=150&auto=format&fit=crop",
            seller: "Alex Kumar",
            location: "NIT Calicut"
          }
        ]);
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const handleRemove = async (itemId: string) => {
    try {
      // await apiClient.delete(`/cart/${itemId}`);
      setCartItems(items => items.filter(i => i.id !== itemId));
      toast.success("Item removed from cart");
    } catch (error) {
      toast.error("Failed to remove item");
    }
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      // await apiClient.post("/orders", { items: cartItems.map(i => i.id), delivery_method: deliveryMethod });
      toast.success("Order placed successfully!");
      setCartItems([]);
      router.push("/profile/orders");
    } catch (error) {
      toast.error("Checkout failed");
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center flex flex-col items-center">
        <ShoppingCart className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-2xl font-bold font-heading mb-4">Your cart is empty</h2>
        <p className="text-muted-foreground mb-6">Log in to view your cart items and checkout.</p>
        <Link href="/login">
          <Button>Sign In to Continue</Button>
        </Link>
      </div>
    );
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);
  const shippingFee = deliveryMethod === "courier" ? 50 : 0; // Flat 50 for courier
  const total = subtotal + shippingFee;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold font-heading mb-8">Your Cart</h1>
      
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-xl"></div>
          <div className="h-32 bg-muted rounded-xl"></div>
        </div>
      ) : cartItems.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
          <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h2 className="text-xl font-semibold mb-2">Cart is empty</h2>
          <p className="text-muted-foreground mb-6">Looks like you haven't added any books yet.</p>
          <Link href="/search">
            <Button>Explore Books</Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Cart Items List */}
          <div className="w-full lg:w-2/3 space-y-4">
            {cartItems.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-0 flex flex-col sm:flex-row">
                  <div className="w-full sm:w-32 h-32 bg-muted shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><BookOpen className="opacity-20" /></div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-semibold text-lg line-clamp-1">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.author}</p>
                      </div>
                      <span className="font-bold text-lg">₹{item.price}</span>
                    </div>
                    <div className="flex items-end justify-between mt-4">
                      <div className="text-sm text-muted-foreground flex flex-col gap-1">
                        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Seller: {item.seller}</span>
                        <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {item.location}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemove(item.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Checkout Summary */}
          <div className="w-full lg:w-1/3">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Delivery Options */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Delivery Method</h4>
                  <RadioGroup value={deliveryMethod} onValueChange={setDeliveryMethod} className="gap-3">
                    <div className={`flex items-center space-x-2 border p-3 rounded-lg cursor-pointer transition-colors ${deliveryMethod === 'pickup' ? 'bg-primary/5 border-primary/50' : 'hover:bg-muted/50'}`}>
                      <RadioGroupItem value="pickup" id="pickup" />
                      <Label htmlFor="pickup" className="flex-1 cursor-pointer font-medium">
                        Campus Pickup
                        <span className="block text-xs text-muted-foreground font-normal mt-0.5">Meet the seller on campus (Free)</span>
                      </Label>
                    </div>
                    <div className={`flex items-center space-x-2 border p-3 rounded-lg cursor-pointer transition-colors ${deliveryMethod === 'courier' ? 'bg-primary/5 border-primary/50' : 'hover:bg-muted/50'}`}>
                      <RadioGroupItem value="courier" id="courier" />
                      <Label htmlFor="courier" className="flex-1 cursor-pointer font-medium">
                        Courier Delivery
                        <span className="block text-xs text-muted-foreground font-normal mt-0.5">₹50 delivery charge applies</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal ({cartItems.length} items)</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Platform Fee</span>
                    <span className="text-green-600 font-medium">Free</span>
                  </div>
                  {deliveryMethod === "courier" && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Delivery Fee</span>
                      <span>₹{shippingFee}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between font-bold text-xl pt-4 border-t">
                  <span>Total</span>
                  <span className="text-primary">₹{total}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" size="lg" onClick={handleCheckout} disabled={isCheckingOut}>
                  {isCheckingOut ? "Processing..." : (
                    <>Proceed to Checkout <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}


