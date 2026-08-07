import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShoppingBag, Mail, Lock, User, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export const GoShopAuth = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Please enter email and password");
    if (isRegister && !name) return toast.error("Please enter your full name");

    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, name, "customer");
        toast.success("Welcome to GOSHOP STORE! Account created successfully.");
      } else {
        await login(email, password);
        toast.success("Signed in successfully to GOSHOP STORE");
      }
      navigate("/goshop");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Authentication failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] bg-zinc-950 text-zinc-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md p-8 bg-zinc-900/80 border-zinc-800 backdrop-blur-xl rounded-3xl shadow-2xl space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Link to="/goshop" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-0.5 shadow-xl shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-outfit font-extrabold text-2xl tracking-tight text-white leading-none">
                GOSHOP
              </span>
              <span className="font-outfit font-bold text-xs tracking-[0.25em] text-amber-400 leading-tight">
                STORE
              </span>
            </div>
          </Link>

          <div>
            <h2 className="font-outfit text-2xl font-bold text-white tracking-tight">
              {isRegister ? "Create Luxury Account" : "Welcome Back"}
            </h2>
            <p className="text-xs text-zinc-400 mt-1 font-light">
              {isRegister ? "Sign up to track orders & curate your wishlist" : "Sign in to access your GOSHOP STORE orders"}
            </p>
          </div>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {isRegister && (
            <div className="space-y-1">
              <Label className="text-zinc-300 font-medium">Full Name</Label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-zinc-200 rounded-full pl-10 h-10 focus:border-amber-500/50"
                />
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-zinc-300 font-medium">Email Address</Label>
            <div className="relative">
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-zinc-200 rounded-full pl-10 h-10 focus:border-amber-500/50"
              />
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-zinc-300 font-medium">Password</Label>
            <div className="relative">
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-zinc-200 rounded-full pl-10 h-10 focus:border-amber-500/50"
              />
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-zinc-950 font-bold rounded-full h-11 text-sm shadow-xl shadow-amber-500/20 hover:scale-[1.02] transition-transform mt-2"
          >
            {loading ? "Processing..." : isRegister ? "Create GOSHOP Account" : "Sign In to GOSHOP"}
            {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>

        </form>

        {/* Toggle between Register & Sign In */}
        <div className="pt-2 text-center text-xs text-zinc-400 border-t border-zinc-800/60">
          {isRegister ? (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className="font-bold text-amber-400 hover:underline"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              New to GOSHOP STORE?{" "}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                className="font-bold text-amber-400 hover:underline"
              >
                Create Account
              </button>
            </p>
          )}
        </div>

      </Card>
    </div>
  );
};

export default GoShopAuth;
