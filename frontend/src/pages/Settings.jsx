import React, { useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const SettingsPage = () => {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "",
    bio: user?.bio || "",
    avatar_url: user?.avatar_url || "",
    address: user?.address || "",
    phone: user?.phone || "",
    privacy_public: user?.privacy_public ?? true,
    notifications_enabled: user?.notifications_enabled ?? true,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/users/me", form);
      setUser(data);
      toast.success("Profile updated");
    } catch { toast.error("Failed to update"); }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">App</div>
        <h1 className="font-serif text-4xl">Settings</h1>
      </div>

      <Card className="p-6 space-y-6">
        <h2 className="font-serif text-xl">Profile</h2>
        <div className="flex items-center gap-4">
          <Avatar className="w-20 h-20">
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-serif">{form.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Label>Profile picture URL</Label>
            <Input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
              placeholder="https://..." data-testid="settings-avatar" />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="settings-name" />
          </div>
          <div>
            <Label>BBID</Label>
            <Input value={user?.bbid || ""} readOnly className="font-mono bg-muted" data-testid="settings-bbid" />
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
        <div>
          <Label>Bio</Label>
          <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} data-testid="settings-bio" />
        </div>
        <div>
          <Label>Address</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} data-testid="settings-address" />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-serif text-xl">Privacy & Notifications</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Public profile</div>
            <div className="text-xs text-muted-foreground">Allow other users to view your profile</div>
          </div>
          <Switch checked={form.privacy_public} onCheckedChange={(v) => setForm({ ...form, privacy_public: v })} data-testid="settings-public" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Notifications</div>
            <div className="text-xs text-muted-foreground">Order updates, chat messages, follows</div>
          </div>
          <Switch checked={form.notifications_enabled} onCheckedChange={(v) => setForm({ ...form, notifications_enabled: v })} data-testid="settings-notifications" />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="rounded-full px-8" data-testid="settings-save-btn">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
