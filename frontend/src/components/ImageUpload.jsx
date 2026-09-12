import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Camera, CloudCheck } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const ImageUpload = ({ value, onChange, maxWidth = 800, aspect = "cover", testId = "image-upload" }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = () => inputRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
      return toast.error("Please select a valid image");
    }
    if (file.size > 15 * 1024 * 1024) {
      return toast.error("Image too large (max 15 MB)");
    }
    
    setBusy(true);
    try {
      // 1. Efficient loading using URL.createObjectURL (mobile safe)
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image decode failed"));
        img.src = objectUrl;
      });

      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      
      const resizedBase64 = canvas.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(objectUrl);

      onChange(resizedBase64);
      toast.success("Photo attached successfully!");
    } catch (err) {
      // Fallback for devices restricting objectURL
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        onChange(dataUrl);
        toast.success("Photo attached successfully!");
      } catch (fallbackErr) {
        toast.error("Failed to process image on device");
      }
    } finally {
      setBusy(false);
      if (e.target) e.target.value = "";
    }
  };

  const clear = () => onChange("");

  return (
    <div className="space-y-2" data-testid={testId}>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/*" onChange={handleFile} className="hidden" />

      {value ? (
        <div className="relative group aspect-square max-w-[200px] rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-lg">
          <img src={value} alt="Product Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-zinc-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={pick} className="rounded-full text-xs">
              Change
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={clear} className="rounded-full text-xs">
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          className="w-full h-32 rounded-2xl border-2 border-dashed border-zinc-800 hover:border-amber-500/50 bg-zinc-950/50 hover:bg-zinc-900/50 transition-all flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-amber-400 group"
        >
          {busy ? (
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          ) : (
            <>
              <Upload className="w-6 h-6 text-zinc-500 group-hover:text-amber-400 transition-colors" />
              <span className="text-xs font-medium">Click or tap to upload photo</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ImageUpload;
