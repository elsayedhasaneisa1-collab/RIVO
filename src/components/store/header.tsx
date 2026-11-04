"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format";
import { useCart } from "./cart-context";
import { CartDrawer } from "./cart-drawer";
import { Logo } from "./logo";

const NAV = [
  { href: "/", label: "الرئيسية" },
  { href: "/products", label: "المتجر" },
  { href: "/categories", label: "التصنيفات" },
  { href: "/products?sale=1", label: "العروض" },
  { href: "/track", label: "تتبع طلبك" },
];

type Suggest = { products: { id: number; name: string; slug: string; price: number; image: string | null }[]; categories: { name: string; slug: string }[] };

function SearchBox({ onDone, autoFocus = false }: { onDone?: () => void; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [data, setData] = useState<Suggest | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setData(null);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setData(d))
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    setOpen(false);
    onDone?.();
    router.push(term ? `/products?q=${encodeURIComponent(term)}` : "/products");
  };

  const hasResults = data && (data.products.length > 0 || data.categories.length > 0);

  return (
    <div ref={box} className="relative w-full">
      <form onSubmit={submit} role="search">
        <label htmlFor={autoFocus ? "search-mobile" : "search-desktop"} className="sr-only">ابحث عن منتج</label>
        <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" aria-hidden />
        <input
          id={autoFocus ? "search-mobile" : "search-desktop"}
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="ابحث عن منتج، تصنيف، أو SKU…"
          className="input !rounded-full !py-2.5 !pr-10 text-sm"
          maxLength={100}
          autoComplete="off"
        />
      </form>
      <AnimatePresence>
        {open && q.trim().length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="glass-strong absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl p-2 shadow-2xl"
          >
            {loading && !data && <p className="p-4 text-center text-sm text-white/50">جارٍ البحث…</p>}
            {data && !hasResults && <p className="p-4 text-center text-sm text-white/50">لا توجد نتائج لـ “{q}”</p>}
            {data?.categories.map((c) => (
              <Link key={c.slug} href={`/products?category=${c.slug}`} onClick={() => { setOpen(false); onDone?.(); }} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/5">
                <span className="rounded-md bg-electric-500/15 px-2 py-0.5 text-xs text-electric-300">تصنيف</span>
                {c.name}
              </Link>
            ))}
            {data?.products.map((p) => (
              <Link key={p.id} href={`/products/${p.slug}`} onClick={() => { setOpen(false); onDone?.(); }} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm hover:bg-white/5">
                <span className="line-clamp-1">{p.name}</span>
                <span className="shrink-0 text-xs font-bold text-electric-300">{formatMoney(p.price)}</span>
              </Link>
            ))}
            {hasResults && (
              <button onClick={submit} className="mt-1 w-full rounded-xl px-3 py-2 text-center text-xs font-semibold text-electric-300 hover:bg-white/5">
                عرض كل النتائج
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Header({ announcement }: { announcement?: string }) {
  const { count, ready, setDrawerOpen } = useCart();
  const [menu, setMenu] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenu(false);
    setMobileSearch(false);
  }, [pathname]);

  return (
    <>
      {announcement && (
        <div className="bg-electric-500 px-4 py-2 text-center text-xs font-semibold sm:text-sm">{announcement}</div>
      )}
      <header className={`sticky top-0 z-40 transition-all ${scrolled ? "glass-strong shadow-xl shadow-black/30" : "bg-transparent"}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:h-[72px] sm:px-6">
          <button className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white/5 lg:hidden" onClick={() => setMenu(true)} aria-label="فتح القائمة">
            <Menu className="h-5 w-5" />
          </button>
          <Logo />
          <nav className="mr-6 hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={`rounded-full px-3.5 py-2 text-sm font-semibold transition hover:bg-white/5 ${pathname === n.href ? "text-white" : "text-white/65"}`}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mr-auto hidden w-full max-w-sm md:block">
            <SearchBox />
          </div>
          <div className="mr-auto flex items-center gap-1 md:mr-0">
            <button className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white/5 md:hidden" onClick={() => setMobileSearch((v) => !v)} aria-label="بحث">
              <Search className="h-5 w-5" />
            </button>
            <button onClick={() => setDrawerOpen(true)} className="relative grid h-10 w-10 place-items-center rounded-xl hover:bg-white/5" aria-label={`السلة (${count})`}>
              <ShoppingBag className="h-5 w-5" />
              {ready && count > 0 && (
                <motion.span key={count} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="absolute -left-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-electric-500 px-1 text-[10px] font-bold">
                  {count}
                </motion.span>
              )}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {mobileSearch && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 pb-3 md:hidden">
              <SearchBox autoFocus onDone={() => setMobileSearch(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <AnimatePresence>
        {menu && (
          <>
            <motion.div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenu(false)} />
            <motion.aside
              className="glass-strong fixed inset-y-0 right-0 z-50 flex w-[82%] max-w-xs flex-col p-5"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              aria-label="القائمة"
            >
              <div className="mb-8 flex items-center justify-between">
                <Logo />
                <button onClick={() => setMenu(false)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white/5" aria-label="إغلاق">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="rounded-xl px-4 py-3 font-semibold hover:bg-white/5">
                    {n.label}
                  </Link>
                ))}
              </nav>
              <p className="mt-auto font-display text-sm tracking-widest text-white/40" dir="ltr">Everything You Need.</p>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <CartDrawer />
    </>
  );
}
