import { ArrowLeft, Headphones, LayoutGrid, PackageSearch, ShieldCheck, Sparkles, Tag, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { Hero } from "@/components/store/hero";
import { ProductGrid } from "@/components/store/product-card";
import { ProductImage } from "@/components/store/product-image";
import { Section } from "@/components/store/section";
import { EmptyState } from "@/components/ui/empty";
import { Reveal } from "@/components/ui/reveal";
import { getBestSellers, getCategoriesWithCounts, getFeaturedProducts, getLatestProducts, getOnSaleProducts } from "@/lib/server/catalog";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: Truck, title: "توصيل لكل المحافظات", text: "شحن سريع وآمن حتى باب منزلك" },
  { icon: ShieldCheck, title: "دفع آمن وموثّق", text: "كل تحويل يُراجع ويؤكَّد يدويًا" },
  { icon: Wallet, title: "أسعار واضحة", text: "بدون رسوم خفية، والسعر النهائي قبل الطلب" },
  { icon: Headphones, title: "دعم حقيقي", text: "فريق خدمة عملاء عبر واتساب" },
];

export default async function HomePage() {
  const [categories, featured, latest, onSale, bestSellers] = await Promise.all([
    getCategoriesWithCounts(),
    getFeaturedProducts(8),
    getLatestProducts(8),
    getOnSaleProducts(4),
    getBestSellers(4),
  ]);
  const productCount = categories.reduce((a, c) => a + Number(c.productCount), 0);
  const hasProducts = latest.length > 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/products?q={search_term_string}`, "query-input": "required name=search_term_string" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Hero productCount={Math.max(productCount, latest.length)} categoryCount={categories.length} />

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06} className="glass flex items-start gap-3 rounded-2xl p-4 sm:p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-electric-500/15 text-electric-300">
                <f.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-bold sm:text-base">{f.title}</h3>
                <p className="mt-1 text-xs leading-6 text-white/50 sm:text-sm">{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {categories.length > 0 && (
        <Section eyebrow="Categories" title="تسوق حسب التصنيف" href="/categories">
          <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
            {categories.slice(0, 12).map((c, i) => (
              <Reveal key={c.id} delay={i * 0.04} className="w-36 shrink-0 snap-start sm:w-auto">
                <Link href={`/products?category=${c.slug}`} className="group glass relative block overflow-hidden rounded-2xl">
                  <div className="relative aspect-square">
                    {c.image ? (
                      <ProductImage src={c.image} alt={c.name} sizes="200px" className="opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100" />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-electric-500/20 to-ink-800">
                        <LayoutGrid className="h-8 w-8 text-electric-300/60" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="font-bold">{c.name}</p>
                      <p className="text-xs text-white/55">{c.productCount} منتج</p>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {!hasProducts && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <EmptyState icon={PackageSearch} title="المتجر قيد التجهيز" description="نعمل حاليًا على إضافة تشكيلة مميزة من المنتجات. تابعنا قريبًا لاكتشاف كل ما تحتاجه." />
        </section>
      )}

      {featured.length > 0 && (
        <Section eyebrow="Featured" title="منتجات مميزة" href="/products">
          <ProductGrid products={featured} />
        </Section>
      )}

      {onSale.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <Reveal className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-electric-600 via-electric-700 to-ink-900 p-6 sm:p-10">
            <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_2fr]">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur"><Tag className="h-3.5 w-3.5" /> عروض لفترة محدودة</span>
                <h2 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">خصومات حقيقية على منتجات مختارة</h2>
                <p className="mt-3 text-white/75">وفّر أكثر مع أفضل العروض المتاحة الآن قبل نفاد الكمية.</p>
                <Link href="/products?sale=1&sort=discount" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-ink-950 transition hover:bg-white/90">
                  تسوق العروض <ArrowLeft className="h-4 w-4" />
                </Link>
              </div>
              <ProductGrid products={onSale} />
            </div>
          </Reveal>
        </section>
      )}

      {hasProducts && (
        <Section eyebrow="New Arrivals" title="وصل حديثًا" href="/products?sort=newest">
          <ProductGrid products={latest} />
        </Section>
      )}

      {bestSellers.length > 0 && (
        <Section eyebrow="Best Sellers" title="الأكثر مبيعًا" href="/products?sort=best_selling">
          <ProductGrid products={bestSellers} />
        </Section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Reveal className="glass relative overflow-hidden rounded-[2rem] p-8">
            <Sparkles className="h-8 w-8 text-electric-400" />
            <h3 className="mt-4 text-2xl font-extrabold">كيف يتم الطلب؟</h3>
            <ol className="mt-4 space-y-2 text-sm leading-7 text-white/65">
              <li>1. أضف المنتجات للسلة وأكمل بيانات التوصيل.</li>
              <li>2. احصل على رقم مرجعي فريد لطلبك.</li>
              <li>3. حوّل المبلغ وأرسل الإثبات عبر واتساب مع رقم الطلب.</li>
              <li>4. نؤكد الدفع ونجهز طلبك للشحن فورًا.</li>
            </ol>
          </Reveal>
          <Reveal delay={0.1} className="relative overflow-hidden rounded-[2rem] bg-white p-8 text-ink-950">
            <PackageSearch className="h-8 w-8 text-electric-600" />
            <h3 className="mt-4 text-2xl font-extrabold">تتبع طلبك لحظة بلحظة</h3>
            <p className="mt-3 text-sm leading-7 text-ink-700/80">أدخل رقم الطلب ورقم هاتفك لمعرفة حالة طلبك الحالية وكل مراحل التنفيذ.</p>
            <Link href="/track" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink-950 px-6 py-3 font-bold text-white transition hover:bg-electric-600">
              تتبع الآن <ArrowLeft className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
