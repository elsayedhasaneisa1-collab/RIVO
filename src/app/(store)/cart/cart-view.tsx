"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/components/store/cart-context";
import { ProductImage } from "@/components/store/product-image";
import { EmptyState } from "@/components/ui/empty";
import { formatMoney } from "@/lib/format";
import { useQuote } from "@/lib/client/use-quote";

export function CartView() {
  const { items, ready, setQuantity, remove } = useCart();
  const { quote, loading, error } = useQuote(items);

  useEffect(() => {
    if (quote?.missing.length) quote.missing.forEach((id) => remove(id));
  }, [quote, remove]);

  if (!ready) return <div className="mx-auto max-w-7xl px-4 py-16"><div className="skeleton h-64 rounded-3xl" /></div>;

  if (!items.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState icon={ShoppingBag} title="سلتك فارغة" description="لم تضف أي منتجات بعد. اكتشف تشكيلتنا وابدأ التسوق." action={<Link href="/products" className="btn-primary">تسوق الآن</Link>} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-8 text-3xl font-extrabold">سلة التسوق</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {items.map((it) => {
              const line = quote?.lines.find((l) => l.productId === it.productId);
              return (
                <motion.li key={it.productId} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }} className="glass flex gap-4 rounded-3xl p-4">
                  <Link href={`/products/${it.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl sm:h-28 sm:w-28">
                    <ProductImage src={line?.image ?? it.image} alt={it.name} sizes="112px" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/products/${it.slug}`} className="line-clamp-2 font-semibold hover:text-electric-300">{line?.name ?? it.name}</Link>
                      <button onClick={() => remove(it.productId)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/40 hover:bg-rose-500/10 hover:text-rose-300" aria-label="حذف المنتج">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-white/50">{formatMoney(line?.unitPrice ?? it.price)} للقطعة</p>
                    {line?.issue && <p className="mt-1 flex items-center gap-1 text-xs text-amber-300"><AlertTriangle className="h-3.5 w-3.5" /> {line.issue}</p>}
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="flex items-center rounded-xl border border-white/10">
                        <button className="grid h-9 w-9 place-items-center disabled:opacity-30" disabled={it.quantity <= 1} onClick={() => setQuantity(it.productId, it.quantity - 1)} aria-label="تقليل">
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-9 text-center font-bold">{it.quantity}</span>
                        <button className="grid h-9 w-9 place-items-center disabled:opacity-30" disabled={line ? it.quantity >= line.maxQuantity : false} onClick={() => setQuantity(it.productId, it.quantity + 1)} aria-label="زيادة">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="font-extrabold">{line ? formatMoney(line.lineTotal) : "…"}</span>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
        <aside className="glass h-fit space-y-4 rounded-3xl p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">ملخص الطلب</h2>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <div className="flex justify-between text-sm"><span className="text-white/60">الإجمالي الفرعي</span><span className="font-bold">{loading && !quote ? "…" : formatMoney(quote?.subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-white/60">الشحن</span><span className="text-white/50">يُحسب حسب المحافظة</span></div>
          <div className="border-t border-white/10 pt-4">
            <Link href="/checkout" aria-disabled={!quote || quote.issues.length > 0} className={`btn-primary w-full ${!quote || quote.issues.length > 0 ? "pointer-events-none opacity-50" : ""}`}>
              متابعة لإتمام الطلب <ArrowLeft className="h-4 w-4" />
            </Link>
            {quote && quote.issues.length > 0 && <p className="mt-2 text-xs text-amber-300">عدّل الكميات المميزة قبل المتابعة.</p>}
          </div>
          <Link href="/products" className="block text-center text-sm text-white/55 hover:text-white">متابعة التسوق</Link>
        </aside>
      </div>
    </div>
  );
}
