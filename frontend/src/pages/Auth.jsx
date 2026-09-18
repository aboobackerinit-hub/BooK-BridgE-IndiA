import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 mr-2">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const AuthLayout = ({ children }) => (
  <div className="min-h-screen grid lg:grid-cols-2 relative overflow-hidden bg-background">
    {/* Global Animated Background Gradient for the whole screen on mobile, and right side on desktop */}
    <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-secondary/20 opacity-70 animate-pulse" style={{ animationDuration: '8s' }}></div>
    <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-accent/30 via-background to-transparent opacity-60"></div>
    
    {/* Left Side Hero (Desktop only) */}
    <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden shadow-2xl z-10"
      style={{
        backgroundImage: "url(https://images.unsplash.com/photo-1491841651911-c44c30c34548?w=1200)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}>
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/90 via-primary/70 to-primary/40 backdrop-blur-[2px]" />
      <div className="relative z-10 flex items-center gap-3 text-white fade-up">
        <img src="/pwa-192x192.png" alt="BookBridge Logo" className="w-12 h-12 rounded-2xl object-contain shadow-md" />
        <div>
          <div className="font-serif text-2xl font-bold tracking-wide text-white drop-shadow-md">BookBridge</div>
          <div className="text-xs uppercase tracking-[0.3em] text-white/80 font-medium">India</div>
        </div>
      </div>
      <div className="relative z-10 text-white fade-up" style={{ animationDelay: '150ms' }}>
        <h1 className="font-serif text-5xl lg:text-6xl leading-[1.1] mb-6 drop-shadow-lg font-bold">Stories that<br/>travel between hands.</h1>
        <p className="text-white/90 text-lg max-w-md font-medium drop-shadow leading-relaxed">Buy, sell, review and discuss books with readers across India. From street corners of Delhi to libraries in Chennai.</p>
      </div>
      <div className="relative z-10 text-xs text-white/70 uppercase tracking-[0.2em] font-semibold fade-up" style={{ animationDelay: '300ms' }}>A community for readers · Est. 2025</div>
    </div>
    
    {/* Right Side Form */}
    <div className="flex items-center justify-center p-4 md:p-12 relative z-10 min-h-screen lg:min-h-0">
      <div className="w-full max-w-md p-6 lg:p-10 rounded-[2rem] bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover-lift transition-all duration-500">
        {children}
      </div>
    </div>
  </div>
);

export const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { login, user, googleLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (user) navigate("/store", { replace: true }); }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success("Welcome back!");
      navigate("/store");
    } catch (err) {
      let msg = "Login failed";
      if (!err.response) {
        msg = "Network error: Could not connect to server. Please check your internet connection.";
      } else if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === "string") msg = err.response.data.detail;
        else if (Array.isArray(err.response.data.detail)) msg = err.response.data.detail[0].msg;
      }
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const res = await googleLogin();
      if (res.success) {
        toast.success("Welcome back!");
        navigate("/store");
      } else {
        // Redirect to register with pre-filled details and trigger OTP step
        navigate("/register", { state: { email: res.email, name: res.name, fromGoogle: true } });
      }
    } catch (err) {
      toast.error("Google sign-in was cancelled or failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { email });
      toast.success("Password reset email sent! Please check your inbox.");
      setIsResetting(false);
    } catch (err) {
      if (!err.response) {
        toast.error("Network error: Could not connect to the backend server. Is it running?");
      } else {
        toast.error(err.response?.data?.detail || "Failed to send reset email");
      }
    } finally { setLoading(false); }
  };

  if (isResetting) {
    return (
      <AuthLayout>
        <div className="mb-8 lg:hidden flex items-center gap-2">
          <img src="/pwa-192x192.png" alt="BookBridge Logo" className="w-9 h-9 rounded-xl object-contain shadow-md" />
          <div className="font-serif font-bold text-xl">BookBridge India</div>
        </div>
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Reset Password</div>
          <h2 className="font-serif text-4xl">Enter your email</h2>
        </div>
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <Label htmlFor="reset-email">Email</Label>
            <Input id="reset-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" />
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-full h-11">
            {loading ? "Sending link..." : "Send Reset Link"}
          </Button>
          <div className="mt-4 text-sm text-center">
            <button type="button" onClick={() => setIsResetting(false)} className="text-primary hover:underline">
              Back to Login
            </button>
          </div>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="mb-5 lg:mb-8 lg:hidden flex items-center gap-2">
        <img src="/pwa-192x192.png" alt="BookBridge Logo" className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl object-contain shadow-md" />
        <div className="font-serif font-bold text-lg lg:text-xl">BookBridge India</div>
      </div>
      <div className="mb-5 lg:mb-8">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1 lg:mb-2">Welcome back</div>
        <h2 className="font-serif text-3xl lg:text-4xl">Login to your account</h2>
      </div>
      <form onSubmit={submit} className="space-y-3 lg:space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            data-testid="login-email-input" placeholder="you@example.com" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button type="button" onClick={() => setIsResetting(true)} className="text-xs text-primary hover:underline">
              Forgot Password?
            </button>
          </div>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            data-testid="login-password-input" placeholder="••••••••" />
        </div>
        <Button type="submit" disabled={loading} className="w-full rounded-full h-11 lg:h-12 lg:mt-2" data-testid="login-submit-btn">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          disabled={loading} 
          onClick={handleGoogleLogin}
          className="w-full rounded-full h-11 lg:h-12"
        >
          <GoogleIcon />
          Continue with Google
        </Button>
      </form>
      <div className="mt-4 lg:mt-6 text-sm text-muted-foreground text-center">
        New to BookBridge? <Link to="/register" className="text-primary font-medium hover:underline" data-testid="link-to-register">Create an account</Link>
      </div>
    </AuthLayout>
  );
};

export const RegisterPage = () => {
  const { register, requestOtp, verifyOtp, user } = useAuth();
  const navigate = useNavigate();
  const location = window.history.state; // using standard router state passed via navigate
  const routerState = location?.usr || {}; 

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ 
    name: routerState.name || "", 
    email: routerState.email || "", 
    password: "", 
    confirmPassword: "",
    otp: "",
    role: "user",
    verification_token: ""
  });
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => { if (user) navigate("/store", { replace: true }); }, [user, navigate]);

  useEffect(() => {
    // If redirected from Google login with email pre-filled, jump to OTP
    if (routerState.fromGoogle && routerState.email) {
      handleRequestOtp(routerState.email);
    }
  }, []);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleRequestOtp = async (emailToUse) => {
    const targetEmail = emailToUse || form.email.trim().toLowerCase();
    if (!targetEmail) return toast.error("Please enter a valid email address.");
    
    setLoading(true);
    try {
      await requestOtp(targetEmail);
      toast.success("Verification code sent!");
      setStep(2);
      setCooldown(60);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!form.otp.trim()) return toast.error("Please enter the verification code.");
    
    setLoading(true);
    try {
      const res = await verifyOtp(form.email.trim().toLowerCase(), form.otp.trim());
      if (res.verification_token) {
        setForm(f => ({ ...f, verification_token: res.verification_token }));
        toast.success("Email verified!");
        setStep(3);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Incorrect verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e) => {
    if (e) e.preventDefault();
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters.");
    if (form.password !== form.confirmPassword) return toast.error("Passwords do not match.");
    
    setLoading(true);
    try {
      const sanitizedForm = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        verification_token: form.verification_token
      };
      await register(sanitizedForm);
      toast.success("Account created successfully!");
      navigate("/store");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6 lg:hidden flex items-center gap-2">
        <img src="/pwa-192x192.png" alt="BookBridge Logo" className="w-9 h-9 rounded-xl object-contain shadow-md" />
        <div className="font-serif font-bold text-xl">BookBridge India</div>
      </div>

      {step === 1 && (
        <>
          <div className="mb-6">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Join the community</div>
            <h2 className="font-serif text-4xl">Create your account</h2>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleRequestOtp(); }} className="space-y-4">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Priya Sharma" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com" />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-full h-11">
              {loading ? "Sending code..." : "Continue"}
            </Button>
          </form>
          <div className="mt-6 text-sm text-muted-foreground text-center">
            Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="mb-6">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Step 2 of 3</div>
            <h2 className="font-serif text-4xl">Verify your email</h2>
            <p className="text-sm text-muted-foreground mt-2">
              We sent a verification code to:<br/>
              <span className="font-medium text-foreground">{form.email}</span>
            </p>
          </div>
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <Label htmlFor="otp">Verification Code</Label>
              <Input id="otp" type="text" required maxLength={6} value={form.otp} onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, '') })}
                className="tracking-[0.5em] text-center font-mono text-lg" placeholder="••••••" />
            </div>
            <Button type="submit" disabled={loading || form.otp.length < 6} className="w-full rounded-full h-11">
              {loading ? "Verifying..." : "Verify OTP"}
            </Button>
            <div className="mt-4 text-center">
              <button 
                type="button" 
                disabled={cooldown > 0 || loading} 
                onClick={() => handleRequestOtp(form.email)}
                className="text-sm text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend OTP"}
              </button>
            </div>
          </form>
        </>
      )}

      {step === 3 && (
        <>
          <div className="mb-6">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Final Step</div>
            <h2 className="font-serif text-4xl">Create your BookBridge password</h2>
          </div>
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 6 characters" />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" required minLength={6} value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Retype password" />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-full h-11">
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
};
