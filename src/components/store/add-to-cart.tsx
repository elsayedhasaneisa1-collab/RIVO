"use client";

import { Check, Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "./cart-context";

type P = { id: number; name: string; slug: string; image: string | null; price: number; stock: number; maxPerItem: number };

export function AddToCart({ product }: { product: P }) {
  const { add, setDrawerOpen } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const max = Math.max(0, Math.min(product.stock, product.maxPerItem));
  const disabled = max === 0;

  const item = { productId: product.id, name: product.name, slug: product.slug, image: product.image, price: product.price };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-2xl border border-white/10 bg-white/5">
          <button className="grid h-12 w-12 place-items-center disabled:opacity-30" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)} aria-label="تقليل الكمية">
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-lg font-bold" aria-live="polite">{qty}</span>
          <button className="grid h-12 w-12 place-items-center disabled:opacity-30" disabled={qty >= max} onClick={() => setQty((q) => q + 1)} aria-label="زيادة الكمية">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <button
          disabled={disabled}
          onClick={() => {
            add(item, qty);
            setAdded(true);
            setDrawerOpen(true);
            setTimeout(() => setAdded(false), 1600);
          }}
          className="btn-primary h-12 flex-1 !rounded-2xl"
        >
          {added ? <Check className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
          {disabled ? "غير متوفر حاليًا" : added ? "تمت الإضافة" : "أضف إلى السلة"}
        </button>
      </div>
      {!disabled && (
        <button
          onClick={() => {
            add(item, qty);
            router.push("/checkout");
          }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white font-bold text-ink-950 transition hover:bg-white/90"
        >
          <Zap className="h-5 w-5" /> اشترِ الآن
        </button>
      )}
    </div>
  );
}
