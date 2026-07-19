import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Camera } from "lucide-react";
import { toast } from "sonner";

/**
 * ImageUpload — file picker that reads image, resizes on canvas, and returns base64 dataURL.
 * Props:
 *   value: current dataURL or URL string
 *   onChange: (dataUrl) => void
 *   maxWidth: number (default 800)
 *   aspect: "square" | "cover" (default cover)
 *   testId
 */
const ImageUpload = ({ value, onChange, maxWidth = 800, aspect = "cover", testId = "image-upload", shape = "rect" }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = () => inputRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please select an image");
    if (file.size > 6 * 1024 * 1024) return toast.error("Image too large (max 6 MB)");
    setBusy(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      // Resize via canvas
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      const out = canvas.toDataURL("image/jpeg", 0.85);
      onChange(out);
    } catch (err) {
      toast.error("Failed to load image");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const clear = () => onChange("");

  const wrapperShape = shape === "circle" ? "rounded-full" : "rounded-2xl";

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" data-testid={`${testId}-file-input`} />
      {value ? (
        <div className={`relative overflow-hidden border border-border ${wrapperShape} ${aspect === "square" ? "aspect-square" : "aspect-[3/4]"} bg-muted`}>
          <img src={value} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 p-2 flex gap-2 bg-gradient-to-t from-black/70 to-transparent">
            <Button size="sm" type="button" variant="secondary" onClick={pick} className="rounded-full flex-1" data-testid={`${testId}-change-btn`}>
              <Camera className="w-3 h-3 mr-1" /> Change
            </Button>
            <Button size="sm" type="button" variant="destructive" onClick={clear} className="rounded-full" data-testid={`${testId}-clear-btn`}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          data-testid={`${testId}-btn`}
          className={`w-full ${aspect === "square" ? "aspect-square" : "aspect-[3/4]"} ${wrapperShape} border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground`}
        >
          {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-8 h-8" />}
          <div className="text-sm font-medium">{busy ? "Processing..." : "Click to upload"}</div>
          <div className="text-xs">JPG, PNG · max 6 MB</div>
        </button>
      )}
    </div>
  );
};

export default ImageUpload;
