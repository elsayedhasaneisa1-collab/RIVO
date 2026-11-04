import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Filters } from "@/components/store/filters";
import { ProductGrid } from "@/components/store/product-card";
import { EmptyState } from "@/components/ui/empty";
import { getCategoriesWithCounts, listProducts } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const q = one(sp.q);
  return {
    title: q ? `نتائج البحث عن “${q.slice(0, 50)}”` : "تسوق كل المنتجات",
    description: "تصفح كل منتجات RIVO مع فلاتر ذكية حسب التصنيف والسعر والتوفر.",
    alternates: { canonical: "/products" },
  };
}

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const num = (k: string) => {
    const v = one(sp[k]);
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const q = one(sp.q)?.slice(0, 100);
  const category = one(sp.category)?.slice(0, 100);
  const [categories, result] = await Promise.all([
    getCategoriesWithCounts(),
    listProducts({ q, category, min: num("min"), max: num("max"), inStock: one(sp.inStock) === "1", sale: one(sp.sale) === "1", sort: one(sp.sort), page: num("page") }),
  ]);
  const activeCat = categories.find((c) => c.slug === category);
  const title = q ? `نتائج البحث: “${q}”` : activeCat ? activeCat.name : one(sp.sale) === "1" ? "العروض والخصومات" : "كل المنتجات";

  const pageHref = (p: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      const val = one(v);
      if (val && k !== "page") next.set(k, val);
    }
    next.set("page", String(p));
    return `/products?${next.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <nav aria-label="مسار التنقل" className="mb-4 text-xs text-white/45">
        <Link href="/" className="hover:text-white">الرئيسية</Link> <span className="mx-1">/</span> <span className="text-white/70">المتجر</span>
      </nav>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-white/50">{result.total} منتج</p>
        {activeCat?.description && <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">{activeCat.description}</p>}
      </div>
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <Suspense fallback={<div className="skeleton h-80 rounded-3xl" />}>
          <div className="contents lg:block">
            <Filters categories={categories.map((c) => ({ name: c.name, slug: c.slug, productCount: Number(c.productCount) }))} />
          </div>
        </Suspense>
        <div className="min-w-0 lg:col-start-2 lg:row-start-1">
          {result.items.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="لا توجد منتجات مطابقة"
              description="جرّب تعديل كلمات البحث أو إزالة بعض الفلاتر."
              action={<Link href="/products" className="btn-primary">عرض كل المنتجات</Link>}
            />
          ) : (
            <>
              <ProductGrid products={result.items} />
              {result.pages > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-2" aria-label="الصفحات">
                  {result.page > 1 && (
                    <Link href={pageHref(result.page - 1)} className="btn-ghost !px-3 !py-2" aria-label="السابق"><ChevronRight className="h-4 w-4" /></Link>
                  )}
                  {Array.from({ length: result.pages }, (_, i) => i + 1)
                    .filter((p) => Math.abs(p - result.page) <= 2 || p === 1 || p === result.pages)
                    .map((p) => (
                      <Link
                        key={p}
                        href={pageHref(p)}
                        aria-current={p === result.page ? "page" : undefined}
                        className={`grid h-10 min-w-10 place-items-center rounded-xl px-3 text-sm font-bold ${p === result.page ? "bg-electric-500" : "glass hover:bg-white/10"}`}
                      >
                        {p}
                      </Link>
                    ))}
                  {result.page < result.pages && (
                    <Link href={pageHref(result.page + 1)} className="btn-ghost !px-3 !py-2" aria-label="التالي"><ChevronLeft className="h-4 w-4" /></Link>
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
