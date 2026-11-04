import { LayoutGrid } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ProductImage } from "@/components/store/product-image";
import { EmptyState } from "@/components/ui/empty";
import { Reveal } from "@/components/ui/reveal";
import { getCategoriesWithCounts } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "التصنيفات", description: "تصفح كل تصنيفات منتجات RIVO.", alternates: { canonical: "/categories" } };

export default async function CategoriesPage() {
  const categories = await getCategoriesWithCounts();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-extrabold sm:text-4xl">التصنيفات</h1>
      <p className="mt-2 text-white/55">اختر القسم الذي يناسبك واكتشف كل ما تحتاجه.</p>
      <div className="mt-8">
        {categories.length === 0 ? (
          <EmptyState icon={LayoutGrid} title="لا توجد تصنيفات بعد" description="سيتم إضافة التصنيفات قريبًا." />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {categories.map((c, i) => (
              <Reveal key={c.id} delay={Math.min(i, 8) * 0.05}>
                <Link href={`/products?category=${c.slug}`} className="group glass relative block overflow-hidden rounded-3xl">
                  <div className="relative aspect-[4/5]">
                    {c.image ? (
                      <ProductImage src={c.image} alt={c.name} sizes="(max-width: 768px) 50vw, 25vw" className="transition duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-electric-500/25 via-ink-800 to-ink-900">
                        <LayoutGrid className="h-10 w-10 text-electric-300/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <h2 className="text-lg font-extrabold">{c.name}</h2>
                      <p className="mt-1 text-xs text-white/60">{c.productCount} منتج</p>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
