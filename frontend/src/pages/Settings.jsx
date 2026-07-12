import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { usePrefs } from "@/context/PrefsContext";
import { toast } from "sonner";
import {
  User, Lock, Bell, Ban, Trash2, Globe, Moon, Sun, Mail, ShieldAlert
} from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

const SettingsPage = () => {
  const { user, setUser, logout } = useAuth();
  const { theme, setTheme, lang, setLang } = usePrefs();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: user?.name || "",
    bio: user?.bio || "",
    avatar_url: user?.avatar_url || "",
    address: user?.address || "",
    phone: user?.phone || "",
    privacy_public: user?.privacy_public ?? true,
    notifications_enabled: user?.notifications_enabled ?? true,
  });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [delPw, setDelPw] = useState("");
  const [blocked, setBlocked] = useState([]);
  const [emailPrefs, setEmailPrefs] = useState({
    email_orders: user?.email_prefs?.email_orders ?? true,
    email_messages: user?.email_prefs?.email_messages ?? true,
    email_follows: user?.email_prefs?.email_follows ?? true,
    email_marketing: user?.email_prefs?.email_marketing ?? false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/users/me/blocked").then((r) => setBlocked(r.data)).catch(() => {});
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/users/me", form);
      setUser(data);
      toast.success("Profile updated");
    } catch { toast.error("Failed"); }
    setSaving(false);
  };

  const changePassword = async () => {
    if (pw.next !== pw.confirm) return toast.error("Passwords don't match");
    if (pw.next.length < 6) return toast.error("Password too short");
    try {
      await api.post("/auth/change-password", {
        current_password: pw.current, new_password: pw.next,
      });
      toast.success("Password changed");
      setPw({ current: "", next: "", confirm: "" });
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const deleteAccount = async () => {
    try {
      await api.post("/auth/delete-account", { password: delPw });
      toast.success("Account deleted");
      logout();
      navigate("/login");
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const unblock = async (uid) => {
    await api.post(`/users/${uid}/block`);
    setBlocked((b) => b.filter((u) => u.id !== uid));
    toast.success("Unblocked");
  };

  const saveEmailPrefs = async () => {
    try {
      const { data } = await api.put("/users/me/email-prefs", emailPrefs);
      setUser(data);
      toast.success("Email preferences saved");
    } catch { toast.error("Failed"); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">App</div>
        <h1 className="font-serif text-4xl">Settings</h1>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 h-auto">
          <TabsTrigger value="profile" data-testid="tab-profile"><User className="w-3 h-3 mr-1" />Profile</TabsTrigger>
          <TabsTrigger value="account" data-testid="tab-account"><Lock className="w-3 h-3 mr-1" />Account</TabsTrigger>
          <TabsTrigger value="prefs" data-testid="tab-prefs"><Globe className="w-3 h-3 mr-1" />Appearance</TabsTrigger>
          <TabsTrigger value="notify" data-testid="tab-notify"><Bell className="w-3 h-3 mr-1" />Notifications</TabsTrigger>
          <TabsTrigger value="email" data-testid="tab-email"><Mail className="w-3 h-3 mr-1" />Email</TabsTrigger>
          <TabsTrigger value="blocked" data-testid="tab-blocked"><Ban className="w-3 h-3 mr-1" />Blocked</TabsTrigger>
        </TabsList>

        {/* PROFILE */}
        <TabsContent value="profile" className="mt-6 space-y-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-start gap-6">
              <div className="w-28 shrink-0">
                <ImageUpload
                  value={form.avatar_url}
                  onChange={(v) => setForm((p) => ({ ...p, avatar_url: v }))}
                  aspect="square"
                  shape="circle"
                  maxWidth={400}
                  testId="settings-avatar"
                />
                <p className="text-[10px] text-center text-muted-foreground mt-2">Profile photo</p>
              </div>
              <div className="flex-1 grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="settings-name" />
                </div>
                <div>
                  <Label>BBID</Label>
                  <Input value={user?.bbid || ""} readOnly className="font-mono bg-muted" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={user?.email || ""} readOnly className="bg-muted" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="settings-phone" />
                </div>
              </div>
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} data-testid="settings-bio" />
            </div>
            <div>
              <Label>Address (for deliveries)</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} data-testid="settings-address" />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div>
                <div className="font-medium">Public profile</div>
                <div className="text-xs text-muted-foreground">Allow others to view your profile</div>
              </div>
              <Switch checked={form.privacy_public} onCheckedChange={(v) => setForm({ ...form, privacy_public: v })} data-testid="settings-public" />
            </div>
            <div className="flex justify-end">
              <Button onClick={saveProfile} disabled={saving} className="rounded-full px-8" data-testid="save-profile-btn">
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* ACCOUNT */}
        <TabsContent value="account" className="mt-6 space-y-4">
          <Card className="p-6 space-y-4">
            <h3 className="font-serif text-xl">Change password</h3>
            <div>
              <Label>Current password</Label>
              <Input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} data-testid="cur-pw-input" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>New password</Label>
                <Input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} data-testid="new-pw-input" />
              </div>
              <div>
                <Label>Confirm new password</Label>
                <Input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} data-testid="confirm-pw-input" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={changePassword} className="rounded-full" data-testid="change-pw-btn">Update Password</Button>
            </div>
          </Card>

          <Card className="p-6 border-destructive/40 border-2">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-xl text-destructive">Delete account</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Permanently delete your account and all your books, posts, cart, and chats. This cannot be undone.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="rounded-full" data-testid="delete-account-open-btn">
                      <Trash2 className="w-4 h-4 mr-1" /> Delete my account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-serif">Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your account, books, posts, cart and messages. Enter your password to confirm.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Input type="password" placeholder="Password" value={delPw} onChange={(e) => setDelPw(e.target.value)} data-testid="del-pw-input" />
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="del-cancel">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={deleteAccount} className="bg-destructive hover:bg-destructive/90" data-testid="del-confirm">
                        Yes, delete forever
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* APPEARANCE / LANGUAGE */}
        <TabsContent value="prefs" className="mt-6 space-y-4">
          <Card className="p-6 space-y-4">
            <h3 className="font-serif text-xl">Appearance</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium flex items-center gap-2">
                  {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />} Dark mode
                </div>
                <div className="text-xs text-muted-foreground">Easier on the eyes at night</div>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} data-testid="dark-mode-toggle" />
            </div>
            <div className="border-t border-border pt-4">
              <Label>Language</Label>
              <Select value={lang} onValueChange={setLang}>
                <SelectTrigger className="mt-1" data-testid="lang-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ml">മലയാളം (Malayalam)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Navigation labels will switch language.</p>
            </div>
          </Card>
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notify" className="mt-6">
          <Card className="p-6 space-y-4">
            <h3 className="font-serif text-xl">Push notifications</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Enable notifications</div>
                <div className="text-xs text-muted-foreground">Order updates, chat messages, follows</div>
              </div>
              <Switch checked={form.notifications_enabled} onCheckedChange={(v) => { setForm({ ...form, notifications_enabled: v }); }} data-testid="settings-notifications" />
            </div>
            <div className="flex justify-end">
              <Button onClick={saveProfile} className="rounded-full">Save</Button>
            </div>
          </Card>
        </TabsContent>

        {/* EMAIL PREFS */}
        <TabsContent value="email" className="mt-6">
          <Card className="p-6 space-y-4">
            <h3 className="font-serif text-xl">Email preferences</h3>
            {[
              { k: "email_orders", label: "Order updates", desc: "Confirmations, shipping updates" },
              { k: "email_messages", label: "New messages", desc: "When someone sends you a chat" },
              { k: "email_follows", label: "New followers", desc: "When someone follows your profile" },
              { k: "email_marketing", label: "Newsletter & offers", desc: "Curated books and community news" },
            ].map((row) => (
              <div key={row.k} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="font-medium">{row.label}</div>
                  <div className="text-xs text-muted-foreground">{row.desc}</div>
                </div>
                <Switch
                  checked={!!emailPrefs[row.k]}
                  onCheckedChange={(v) => setEmailPrefs((p) => ({ ...p, [row.k]: v }))}
                  data-testid={`email-${row.k}-toggle`}
                />
              </div>
            ))}
            <div className="flex justify-end">
              <Button onClick={saveEmailPrefs} className="rounded-full" data-testid="save-email-prefs-btn">Save</Button>
            </div>
          </Card>
        </TabsContent>

        {/* BLOCKED */}
        <TabsContent value="blocked" className="mt-6">
          <Card className="p-6 space-y-3">
            <h3 className="font-serif text-xl">Blocked users</h3>
            {blocked.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Ban className="w-8 h-8 mx-auto opacity-40 mb-2" />
                You haven't blocked anyone.
              </div>
            ) : (
              blocked.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                  <Avatar><AvatarFallback className="bg-muted">{u.name?.[0]}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{u.bbid}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => unblock(u.id)} className="rounded-full" data-testid={`unblock-${u.id}`}>
                    Unblock
                  </Button>
                </div>
              ))
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
