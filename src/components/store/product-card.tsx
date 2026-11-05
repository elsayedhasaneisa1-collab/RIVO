"use client";

import { motion } from "framer-motion";
import { Check, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Stars } from "@/components/ui/stars";
import type { PublicProduct } from "@/lib/server/catalog";
import { discountPercent, formatMoney } from "@/lib/format";
import { useCart } from "./cart-context";
import { ProductImage } from "./product-image";

export function ProductCard({ product, index = 0 }: { product: PublicProduct; index?: number }) {
  const { add, setDrawerOpen } = useCart();
  const [added, setAdded] = useState(false);
  const off = discountPercent(product.price, product.compareAtPrice);

  const onAdd = () => {
    add({ productId: product.id, name: product.name, slug: product.slug, image: product.images[0] ?? null, price: product.price });
    setAdded(true);
    setDrawerOpen(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: Math.min(index, 8) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="group glass relative flex flex-col overflow-hidden rounded-3xl transition-colors hover:border-electric-500/40"
    >
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden" aria-label={product.name}>
        <ProductImage src={product.images[0]} alt={product.name} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          {off > 0 ? <span className="rounded-full bg-electric-500 px-2.5 py-1 text-xs font-bold shadow-lg shadow-electric-500/30">-{off}%</span> : <span />}
          {!product.inStock && <span className="rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white/80 backdrop-blur">نفد المخزون</span>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.categoryName && <span className="text-xs text-electric-300/80">{product.categoryName}</span>}
        <Link href={`/products/${product.slug}`} className="line-clamp-2 min-h-[2.75rem] text-sm font-semibold leading-snug hover:text-electric-300 sm:text-[15px]">
          {product.name}
        </Link>
        {product.reviewCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-white/50">
            <Stars value={product.rating} size={12} />
            <span>({product.reviewCount})</span>
          </div>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex flex-col">
            <span className="text-base font-extrabold sm:text-lg">{formatMoney(product.price)}</span>
            {off > 0 && <span className="text-xs text-white/40 line-through">{formatMoney(product.compareAtPrice)}</span>}
          </div>
          <button
            type="button"
            onClick={onAdd}
            disabled={!product.inStock}
            aria-label={`أضف ${product.name} إلى السلة`}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-ink-950 transition hover:bg-electric-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            {added ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export function ProductGrid({ products }: { products: PublicProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} index={i} />
      ))}
    </div>
  );
}
