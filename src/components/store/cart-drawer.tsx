"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { formatMoney } from "@/lib/format";
import { useQuote } from "@/lib/client/use-quote";
import { useCart } from "./cart-context";
import { ProductImage } from "./product-image";

export function CartDrawer() {
  const { items, drawerOpen, setDrawerOpen, setQuantity, remove } = useCart();
  const { quote, loading } = useQuote(items, { enabled: drawerOpen });

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen, setDrawerOpen]);

  const lineFor = (id: number) => quote?.lines.find((l) => l.productId === id);

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="سلة التسوق"
            className="glass-strong fixed inset-y-0 left-0 z-50 flex w-full max-w-md flex-col"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 300 }}
          >
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <ShoppingBag className="h-5 w-5 text-electric-400" /> سلة التسوق
              </h2>
              <button onClick={() => setDrawerOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white/5" aria-label="إغلاق السلة">
                <X className="h-5 w-5" />
              </button>
            </div>
            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/5">
                  <ShoppingBag className="h-7 w-7 text-white/30" />
                </div>
                <p className="text-white/60">سلتك فارغة حاليًا</p>
                <Link href="/products" onClick={() => setDrawerOpen(false)} className="btn-primary">
                  تسوق الآن
                </Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 space-y-3 overflow-y-auto p-5">
                  {items.map((it) => {
                    const line = lineFor(it.productId);
                    const missing = quote?.missing.includes(it.productId);
                    return (
                      <li key={it.productId} className="glass flex gap-3 rounded-2xl p-3">
                        <Link href={`/products/${it.slug}`} onClick={() => setDrawerOpen(false)} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                          <ProductImage src={line?.image ?? it.image} alt={it.name} sizes="80px" />
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <p className="line-clamp-2 text-sm font-semibold">{line?.name ?? it.name}</p>
                          <p className="mt-1 text-sm font-bold text-electric-300">{formatMoney(line?.unitPrice ?? it.price)}</p>
                          {(missing || line?.issue) && <p className="mt-1 text-xs text-rose-300">{missing ? "لم يعد متاحًا" : line?.issue}</p>}
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <div className="flex items-center rounded-lg border border-white/10">
                              <button className="grid h-8 w-8 place-items-center hover:bg-white/5" onClick={() => setQuantity(it.productId, it.quantity - 1)} aria-label="تقليل الكمية">
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-8 text-center text-sm font-bold">{it.quantity}</span>
                              <button
                                className="grid h-8 w-8 place-items-center hover:bg-white/5 disabled:opacity-30"
                                disabled={line ? it.quantity >= line.maxQuantity : false}
                                onClick={() => setQuantity(it.productId, it.quantity + 1)}
                                aria-label="زيادة الكمية"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <button onClick={() => remove(it.productId)} className="grid h-8 w-8 place-items-center rounded-lg text-white/40 hover:bg-rose-500/10 hover:text-rose-300" aria-label="حذف">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="space-y-3 border-t border-white/10 p-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">الإجمالي الفرعي</span>
                    <span className="text-lg font-extrabold">{loading && !quote ? "…" : formatMoney(quote?.subtotal ?? 0)}</span>
                  </div>
                  <p className="text-xs text-white/40">الشحن والخصومات تُحسب عند إتمام الطلب.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/cart" onClick={() => setDrawerOpen(false)} className="btn-ghost">
                      عرض السلة
                    </Link>
                    <Link href="/checkout" onClick={() => setDrawerOpen(false)} className="btn-primary">
                      إتمام الطلب
                    </Link>
                  </div>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
