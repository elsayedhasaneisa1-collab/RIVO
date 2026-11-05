"use client";

import { Link2, Plus, Star, X } from "lucide-react";
import { useState } from "react";
import { ProductImage } from "@/components/store/product-image";

export function ImageInput({ value, onChange, max = 10 }: { value: string[]; onChange: (v: string[]) => void; max?: number }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addUrl = () => {
    const u = url.trim();
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== "https:" || !/^https:\/\//i.test(u)) throw new Error();
      if (value.length >= max) return setError(`الحد الأقصى ${max} صور`);
      if (value.includes(u)) return setError("الصورة مضافة بالفعل");
      onChange([...value, u]);
      setUrl("");
      setError(null);
    } catch {
      setError("أدخل رابط صورة صحيح يبدأ بـ https://");
    }
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {value.map((src, i) => (
          <div key={`${src}-${i}`} className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-white/10">
            <ProductImage src={src} alt={`صورة المنتج ${i + 1}`} sizes="120px" />
            {i === 0 && <span className="absolute bottom-1 right-1 rounded bg-electric-500 px-1.5 text-[10px] font-bold">رئيسية</span>}
            <div className="absolute inset-x-0 top-0 flex justify-between p-1">
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid h-7 w-7 place-items-center rounded-md bg-black/75 text-white" aria-label="حذف الصورة"><X className="h-4 w-4" /></button>
              {i > 0 && <button type="button" onClick={() => onChange([src, ...value.filter((_, j) => j !== i)])} className="flex items-center gap-1 rounded-md bg-black/75 px-2 text-[10px] text-white"><Star className="h-3 w-3" /> رئيسية</button>}
            </div>
          </div>
        ))}
        {value.length < max && <div className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-white/15 text-xs text-white/40">أضف رابطًا بالأسفل</div>}
      </div>
      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }} placeholder="رابط الصورة المباشر https://" className="input !py-2 !pr-9 text-sm" dir="ltr" />
        </div>
        <button type="button" onClick={addUrl} disabled={value.length >= max} className="btn-ghost !py-2 text-sm"><Plus className="h-4 w-4" /> إضافة</button>
      </div>
      <p className="mt-2 text-xs text-white/40">أضف حتى {max} روابط صور. أول صورة هي الصورة الرئيسية، ويمكن تغييرها من زر «رئيسية».</p>
      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
    </div>
  );
}
