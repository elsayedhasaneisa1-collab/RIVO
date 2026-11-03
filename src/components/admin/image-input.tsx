"use client";

import { ImagePlus, Link2, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { ProductImage } from "@/components/store/product-image";

export function ImageInput({ value, onChange, max = 10 }: { value: string[]; onChange: (v: string[]) => void; max?: number }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    const next = [...value];
    for (const file of Array.from(files).slice(0, max - value.length)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd, credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "فشل رفع الصورة");
        break;
      }
      next.push(data.url);
    }
    onChange(next);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const addUrl = () => {
    const u = url.trim();
    if (!/^https:\/\/\S+$/i.test(u)) return setError("الرابط يجب أن يبدأ بـ https://");
    onChange([...value, u]);
    setUrl("");
    setError(null);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {value.map((src, i) => (
          <div key={`${src}-${i}`} className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-white/10">
            <ProductImage src={src} alt="" sizes="120px" />
            {i === 0 && <span className="absolute bottom-1 right-1 rounded bg-electric-500 px-1.5 text-[10px] font-bold">رئيسية</span>}
            <div className="absolute inset-x-0 top-0 flex justify-between p-1 opacity-0 transition group-hover:opacity-100">
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid h-6 w-6 place-items-center rounded-md bg-black/70" aria-label="حذف الصورة"><X className="h-3.5 w-3.5" /></button>
              {i > 0 && <button type="button" onClick={() => onChange([src, ...value.filter((_, j) => j !== i)])} className="rounded-md bg-black/70 px-1.5 text-[10px]">رئيسية</button>}
            </div>
          </div>
        ))}
        {value.length < max && (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-white/15 text-white/45 hover:border-electric-500 hover:text-electric-300">
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} />
      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="أو أضف رابط صورة https://" className="input !py-2 !pr-9 text-sm" dir="ltr" />
        </div>
        <button type="button" onClick={addUrl} className="btn-ghost !py-2 text-sm">إضافة</button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
    </div>
  );
}
