import { BadgeCheck, Box, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/store/add-to-cart";
import { ProductGrid } from "@/components/store/product-card";
import { ProductGallery } from "@/components/store/product-gallery";
import { ReviewForm } from "@/components/store/review-form";
import { Stars } from "@/components/ui/stars";
import { discountPercent, formatDate, formatMoney } from "@/lib/format";
import { getProductBySlug, getProductReviews, getRelatedProducts } from "@/lib/server/catalog";
import { getSettings } from "@/lib/server/settings";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(decodeURIComponent(slug));
  if (!p) return { title: "المنتج غير موجود" };
  const description = p.description.slice(0, 160) || `${p.name} من RIVO`;
  const images = p.images.length ? p.images.map((src) => ({ url: src, alt: p.name })) : [{ url: "/images/hero.jpg", alt: p.name }];
  return {
    title: p.name,
    description,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { type: "website", title: p.name, description, url: `/products/${p.slug}`, images },
    twitter: { card: "summary_large_image", title: p.name, description, images: images.map((i) => i.url) },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(decodeURIComponent(slug));
  if (!product) notFound();
  const [reviews, related, settings] = await Promise.all([getProductReviews(product.id), getRelatedProducts(product), getSettings()]);
  const off = discountPercent(product.price, product.compareAtPrice);
  const lowStock = product.stock > 0 && product.stock <= 5;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: product.description,
    image: product.images.map((i) => (i.startsWith("http") ? i : `${SITE_URL}${i}`)),
    brand: { "@type": "Brand", name: "RIVO" },
    offers: {
      "@type": "Offer",
      priceCurrency: "EGP",
      price: (product.price / 100).toFixed(2),
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${SITE_URL}/products/${product.slug}`,
    },
    ...(product.reviewCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviewCount } } : {}),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="مسار التنقل" className="mb-6 flex flex-wrap items-center gap-1 text-xs text-white/45">
        <Link href="/" className="hover:text-white">الرئيسية</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-white">المتجر</Link>
        {product.categorySlug && (
          <>
            <span>/</span>
            <Link href={`/products?category=${product.categorySlug}`} className="hover:text-white">{product.categoryName}</Link>
          </>
        )}
        <span>/</span>
        <span className="line-clamp-1 text-white/70">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <ProductGallery images={product.images} name={product.name} />
        <div className="flex flex-col gap-6">
          <div>
            {product.categoryName && <p className="text-sm font-semibold text-electric-300">{product.categoryName}</p>}
            <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-4xl">{product.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/55">
              {product.reviewCount > 0 ? (
                <a href="#reviews" className="flex items-center gap-2 hover:text-white">
                  <Stars value={product.rating} /> {product.rating} ({product.reviewCount} تقييم)
                </a>
              ) : (
                <span>لا توجد تقييمات بعد</span>
              )}
              <span className="text-white/20">|</span>
              <span dir="ltr">SKU: {product.sku}</span>
            </div>
          </div>

          <div className="glass rounded-3xl p-5">
            <div className="flex flex-wrap items-end gap-3">
              <span className="text-3xl font-extrabold sm:text-4xl">{formatMoney(product.price)}</span>
              {off > 0 && (
                <>
                  <span className="pb-1 text-lg text-white/40 line-through">{formatMoney(product.compareAtPrice)}</span>
                  <span className="mb-1 rounded-full bg-electric-500 px-2.5 py-1 text-xs font-bold">وفّر {off}%</span>
                </>
              )}
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              {product.inStock ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-emerald-300">متوفر</span>
                  <span className="text-white/45">— {lowStock ? `تبقّى ${product.stock} قطع فقط` : `${product.stock} قطعة متاحة`}</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  <span className="text-rose-300">نفد من المخزون</span>
                </>
              )}
            </div>
          </div>

          <AddToCart
            product={{ id: product.id, name: product.name, slug: product.slug, image: product.images[0] ?? null, price: product.price, stock: product.stock, maxPerItem: settings.maxQuantityPerItem }}
          />

          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { icon: Truck, t: "توصيل لجميع المحافظات" },
              { icon: ShieldCheck, t: "دفع آمن بتأكيد يدوي" },
              { icon: BadgeCheck, t: "منتج أصلي مضمون" },
              { icon: RotateCcw, t: "سياسة استرجاع واضحة" },
            ].map((f) => (
              <div key={f.t} className="glass flex items-center gap-2.5 rounded-2xl p-3">
                <f.icon className="h-4 w-4 shrink-0 text-electric-400" aria-hidden />
                <span className="text-white/70">{f.t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-14 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass rounded-3xl p-6 sm:p-8">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold"><Box className="h-5 w-5 text-electric-400" /> وصف المنتج</h2>
          {product.description ? (
            <div className="whitespace-pre-line text-[15px] leading-8 text-white/70">{product.description}</div>
          ) : (
            <p className="text-white/45">لا يوجد وصف لهذا المنتج.</p>
          )}
        </div>
        <div id="reviews" className="space-y-4">
          <h2 className="text-xl font-extrabold">آراء العملاء</h2>
          {reviews.length === 0 && <p className="text-sm text-white/50">كن أول من يقيّم هذا المنتج.</p>}
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{r.name}</span>
                  <Stars value={r.rating} size={12} />
                </div>
                <p className="mt-2 text-sm leading-7 text-white/70">{r.comment}</p>
                <p className="mt-2 text-xs text-white/35">{formatDate(r.createdAt)}</p>
              </li>
            ))}
          </ul>
          <ReviewForm productId={product.id} />
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-extrabold">منتجات ذات صلة</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
