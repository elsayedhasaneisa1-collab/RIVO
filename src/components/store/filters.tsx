"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { SORT_OPTIONS } from "@/lib/constants";

type Cat = { name: string; slug: string; productCount: number };

export function Filters({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [min, setMin] = useState(sp.get("min") ?? "");
  const [max, setMax] = useState(sp.get("max") ?? "");

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  const active = sp.get("category") ?? "";

  const panel = (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-bold">التصنيف</h3>
        <div className="flex flex-col gap-1">
          <button onClick={() => update({ category: null })} className={`rounded-xl px-3 py-2 text-right text-sm transition ${!active ? "bg-electric-500/15 font-bold text-electric-300" : "text-white/65 hover:bg-white/5"}`}>
            الكل
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              onClick={() => update({ category: c.slug })}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-right text-sm transition ${active === c.slug ? "bg-electric-500/15 font-bold text-electric-300" : "text-white/65 hover:bg-white/5"}`}
            >
              <span>{c.name}</span>
              <span className="text-xs text-white/35">{c.productCount}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-bold">السعر (ج.م)</h3>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ min: min || null, max: max || null });
          }}
        >
          <input aria-label="أقل سعر" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} placeholder="من" className="input !py-2 text-sm" />
          <input aria-label="أعلى سعر" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} placeholder="إلى" className="input !py-2 text-sm" />
          <button className="btn-ghost !px-3 !py-2 text-sm">تطبيق</button>
        </form>
      </div>
      <div className="space-y-3">
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={sp.get("inStock") === "1"} onChange={(e) => update({ inStock: e.target.checked ? "1" : null })} className="h-4 w-4 accent-[#2f6bff]" />
          المتوفر فقط
        </label>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={sp.get("sale") === "1"} onChange={(e) => update({ sale: e.target.checked ? "1" : null })} className="h-4 w-4 accent-[#2f6bff]" />
          عليها خصم
        </label>
      </div>
      {(active || sp.get("min") || sp.get("max") || sp.get("inStock") || sp.get("sale") || sp.get("q")) && (
        <button
          onClick={() => {
            setMin("");
            setMax("");
            start(() => router.push(pathname));
          }}
          className="w-full rounded-xl border border-white/10 py-2 text-sm text-white/60 hover:bg-white/5"
        >
          مسح كل الفلاتر
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <button onClick={() => setOpen(true)} className="btn-ghost !py-2.5 text-sm lg:hidden">
          <SlidersHorizontal className="h-4 w-4" /> الفلاتر
        </button>
        <div className="mr-auto flex items-center gap-2">
          {pending && <span className="text-xs text-white/40">جارٍ التحديث…</span>}
          <label htmlFor="sort" className="sr-only">الترتيب</label>
          <select id="sort" value={sp.get("sort") ?? "newest"} onChange={(e) => update({ sort: e.target.value })} className="input !w-auto !py-2.5 text-sm">
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      <aside className="glass sticky top-24 hidden h-fit rounded-3xl p-5 lg:block" aria-label="الفلاتر">{panel}</aside>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.div
              className="glass-strong fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl p-6 lg:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold">الفلاتر</h2>
                <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/5" aria-label="إغلاق"><X className="h-5 w-5" /></button>
              </div>
              {panel}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
