import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import { BookOpen, Upload, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import ImageUpload from "@/components/ImageUpload";

const empty = {
  title: "", author: "", description: "", price: 0, stock: 1,
  category: "Fiction", condition: "Used", image_url: "",
  isbn: "", edition: "", language: "English",
};

const SellBookPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [f, setF] = useState(empty);
  const [cats, setCats] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get("/categories").then((r) => setCats(r.data)); }, []);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!f.title.trim() || !f.author.trim() || !f.price) {
      return toast.error("Title, author and price are required");
    }
    setSaving(true);
    try {
      const { data } = await api.post("/books", f);
      toast.success("Book listed for sale!");
      navigate(`/book/${data.id}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to list");
    }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">List a Book</div>
        <h1 className="font-serif text-4xl">Sell your book</h1>
        <p className="text-muted-foreground mt-2">
          Give your book a second life. Fill in the details below — buyers on BookBridge will see your listing right away.
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Preview */}
        <div className="md:col-span-2">
          <Card className="overflow-hidden sticky top-24">
            <div className="aspect-[3/4] relative bg-muted">
              {f.image_url ? (
                <div className="absolute inset-0 bg-muted flex items-center justify-center overflow-hidden">
                  <OptimizedImage src={f.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full h-full spine flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-white/70" />
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{f.category} · {f.condition}</div>
              <div className="font-serif text-lg font-semibold line-clamp-2">{f.title || "Book title"}</div>
              <div className="text-xs text-muted-foreground mt-1">by {f.author || "Author"}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <IndianRupee className="w-4 h-4 text-primary" />
                <span className="font-mono font-bold text-primary text-xl">{f.price || "0"}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Form */}
        <div className="md:col-span-3 space-y-5">
          <Card className="p-6 space-y-4">
            <h3 className="font-serif text-xl">Book Details</h3>
            <div>
              <Label>Title *</Label>
              <Input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. The Alchemist" data-testid="sell-title-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Author *</Label>
                <Input value={f.author} onChange={(e) => set("author", e.target.value)} placeholder="e.g. Paulo Coelho" data-testid="sell-author-input" />
              </div>
              <div>
                <Label>Language</Label>
                <Input value={f.language} onChange={(e) => set("language", e.target.value)} data-testid="sell-language-input" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={4} value={f.description} onChange={(e) => set("description", e.target.value)}
                placeholder="Tell buyers about the book — condition of pages, edition, why you loved it..." data-testid="sell-desc-input" />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-serif text-xl">Category & Condition</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={f.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger data-testid="sell-category-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cats.filter((c) => c !== "All").map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Condition</Label>
                <Select value={f.condition} onValueChange={(v) => set("condition", v)}>
                  <SelectTrigger data-testid="sell-condition-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">Brand New</SelectItem>
                    <SelectItem value="Used">Used - Good</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Edition</Label>
                <Input value={f.edition} onChange={(e) => set("edition", e.target.value)} placeholder="1st, 2nd..." data-testid="sell-edition-input" />
              </div>
              <div>
                <Label>ISBN (optional)</Label>
                <Input type="text" inputMode="numeric" value={f.isbn} onChange={(e) => set("isbn", e.target.value)} placeholder="978..." data-testid="sell-isbn-input" />
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-serif text-xl">Photo</h3>
            <p className="text-xs text-muted-foreground">Upload a photo of your book. It will be shown as the cover on the store.</p>
            <div className="max-w-xs">
              <ImageUpload
                value={f.image_url}
                onChange={(v) => set("image_url", v)}
                aspect="cover"
                testId="sell-image"
              />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-serif text-xl">Price & Stock</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Selling price (₹) *</Label>
                <Input type="number" inputMode="decimal" value={f.price} onChange={(e) => set("price", parseFloat(e.target.value) || 0)} data-testid="sell-price-input" />
              </div>
              <div>
                <Label>Available copies</Label>
                <Input type="number" inputMode="numeric" value={f.stock} onChange={(e) => set("stock", parseInt(e.target.value) || 0)} data-testid="sell-stock-input" />
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate(-1)} className="rounded-full" data-testid="sell-cancel-btn">Cancel</Button>
            <Button onClick={submit} disabled={saving} className="rounded-full px-8" data-testid="sell-submit-btn">
              {saving ? "Publishing..." : "List for Sale"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellBookPage;
