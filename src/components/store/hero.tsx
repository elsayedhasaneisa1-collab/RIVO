"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function Hero({ productCount, categoryCount }: { productCount: number; categoryCount: number }) {
  return (
    <section className="relative overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-electric-500/20 blur-[120px]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-2 lg:pb-24 lg:pt-16">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-electric-300"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-electric-400" />
            تسوق ذكي. توصيل لكل المحافظات.
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
            dir="ltr"
            style={{ textAlign: "right" }}
          >
            <span className="text-gradient">Everything</span>
            <br />
            You Need.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-lg text-base leading-8 text-white/65 sm:text-lg"
          >
            كل ما تحتاجه في مكان واحد. منتجات مختارة بعناية، أسعار واضحة، ودفع آمن مع تأكيد يدوي لكل طلب.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }} className="mt-8 flex flex-wrap gap-3">
            <Link href="/products" className="btn-primary !px-7 !py-3.5">
              تسوق الآن <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link href="/products?sale=1" className="btn-ghost !px-7 !py-3.5">
              اكتشف العروض
            </Link>
          </motion.div>
          <motion.dl initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-10 flex gap-8">
            <div>
              <dt className="text-xs text-white/45">منتج متاح</dt>
              <dd className="font-display text-2xl font-bold">{productCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/45">تصنيف</dt>
              <dd className="font-display text-2xl font-bold">{categoryCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/45">محافظة نوصل لها</dt>
              <dd className="font-display text-2xl font-bold">27</dd>
            </div>
          </motion.dl>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] ring-1 ring-white/10">
            <Image src="/images/hero.jpg" alt="منتجات RIVO" fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent" />
          </div>
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="glass absolute -bottom-5 right-4 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl sm:right-8"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-electric-500/20 text-electric-300"><ShieldCheck className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-bold">دفع آمن</p>
              <p className="text-xs text-white/55">تأكيد يدوي لكل تحويل</p>
            </div>
          </motion.div>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="glass absolute -top-4 left-4 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl sm:left-8"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-electric-500/20 text-electric-300"><Truck className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-bold">توصيل سريع</p>
              <p className="text-xs text-white/55">لجميع المحافظات</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
