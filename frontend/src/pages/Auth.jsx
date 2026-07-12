import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";

const AuthLayout = ({ children }) => (
  <div className="min-h-screen paper-bg grid lg:grid-cols-2">
    <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
      style={{
        backgroundImage: "url(https://images.unsplash.com/photo-1491841651911-c44c30c34548?w=1200)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}>
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/80 via-primary/60 to-primary/40" />
      <div className="relative z-10 flex items-center gap-3 text-white">
        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-lg flex items-center justify-center border border-white/30">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <div className="font-serif text-2xl font-bold">BookBridge</div>
          <div className="text-xs uppercase tracking-[0.3em] opacity-80">India</div>
        </div>
      </div>
      <div className="relative z-10 text-white">
        <h1 className="font-serif text-5xl leading-tight mb-4">Stories that<br/>travel between hands.</h1>
        <p className="text-white/80 text-lg max-w-md">Buy, sell, review and discuss books with readers across India. From street corners of Delhi to libraries in Chennai.</p>
      </div>
      <div className="relative z-10 text-xs text-white/60 uppercase tracking-[0.2em]">A community for readers · Est. 2025</div>
    </div>
    <div className="flex items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  </div>
);

export const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (user) navigate("/store", { replace: true }); }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/store");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout>
      <div className="mb-8 lg:hidden flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl spine flex items-center justify-center"><BookOpen className="w-5 h-5 text-white" /></div>
        <div className="font-serif font-bold text-xl">BookBridge India</div>
      </div>
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Welcome back</div>
        <h2 className="font-serif text-4xl">Login to your account</h2>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            data-testid="login-email-input" placeholder="you@example.com" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            data-testid="login-password-input" placeholder="••••••••" />
        </div>
        <Button type="submit" disabled={loading} className="w-full rounded-full h-11" data-testid="login-submit-btn">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <div className="mt-6 text-sm text-muted-foreground text-center">
        New to BookBridge? <Link to="/register" className="text-primary font-medium hover:underline" data-testid="link-to-register">Create an account</Link>
      </div>
    </AuthLayout>
  );
};

export const RegisterPage = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [loading, setLoading] = useState(false);
  const { register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (user) navigate("/store", { replace: true }); }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success("Account created! Please sign in.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed");
    } finally { setLoading(false); }
  };

  const roles = [
    { value: "user", label: "Reader", desc: "Buy, sell & review books" },
    { value: "store_owner", label: "Store Owner", desc: "Run your bookstore" },
    { value: "publisher", label: "Publisher", desc: "Publish & distribute" },
  ];

  return (
    <AuthLayout>
      <div className="mb-6 lg:hidden flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl spine flex items-center justify-center"><BookOpen className="w-5 h-5 text-white" /></div>
        <div className="font-serif font-bold text-xl">BookBridge India</div>
      </div>
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Join the community</div>
        <h2 className="font-serif text-4xl">Create your account</h2>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label>Choose your role</Label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {roles.map((r) => (
              <button type="button" key={r.value}
                data-testid={`role-${r.value}-btn`}
                onClick={() => setForm({ ...form, role: r.value })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  form.role === r.value
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/40"
                }`}>
                <div className="text-sm font-medium">{r.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            data-testid="register-name-input" placeholder="Priya Sharma" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            data-testid="register-email-input" placeholder="you@example.com" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required minLength={6} value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            data-testid="register-password-input" placeholder="Min 6 characters" />
        </div>
        <Button type="submit" disabled={loading} className="w-full rounded-full h-11" data-testid="register-submit-btn">
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
      <div className="mt-6 text-sm text-muted-foreground text-center">
        Already have an account? <Link to="/login" className="text-primary font-medium hover:underline" data-testid="link-to-login">Sign in</Link>
      </div>
    </AuthLayout>
  );
};
