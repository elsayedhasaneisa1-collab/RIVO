"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { ProductImage } from "./product-image";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const list = images.length ? images : [null];
  return (
    <div className="flex flex-col gap-3">
      <div className="glass relative aspect-square overflow-hidden rounded-[2rem]">
        <AnimatePresence mode="wait">
          <motion.div key={active} initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="absolute inset-0">
            <ProductImage src={list[active]} alt={`${name} - صورة ${active + 1}`} sizes="(max-width: 1024px) 100vw, 50vw" priority={active === 0} />
          </motion.div>
        </AnimatePresence>
      </div>
      {list.length > 1 && (
        <div className="scrollbar-none flex gap-2 overflow-x-auto" role="tablist" aria-label="صور المنتج">
          {list.map((src, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === active}
              aria-label={`عرض الصورة ${i + 1}`}
              onClick={() => setActive(i)}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl ring-2 transition ${i === active ? "ring-electric-500" : "ring-transparent opacity-60 hover:opacity-100"}`}
            >
              <ProductImage src={src} alt="" sizes="80px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
