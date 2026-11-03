import type { MetadataRoute } from "next";
import { getActiveProductSlugs, getCategoriesWithCounts } from "@/lib/server/catalog";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/categories`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/track`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];
  try {
    const [products, categories] = await Promise.all([getActiveProductSlugs(), getCategoriesWithCounts()]);
    return [
      ...base,
      ...categories.map((c) => ({ url: `${SITE_URL}/products?category=${encodeURIComponent(c.slug)}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })),
      ...products.map((p) => ({ url: `${SITE_URL}/products/${encodeURIComponent(p.slug)}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ];
  } catch {
    return base;
  }
}
