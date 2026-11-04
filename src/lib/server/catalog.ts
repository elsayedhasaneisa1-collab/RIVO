import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { categories, products, reviews } from "@/db/schema";
import { PAGE_SIZE } from "@/lib/constants";

export type PublicProduct = {
  id: number;
  name: string;
  slug: string;
  description: string;
  images: string[];
  price: number;
  compareAtPrice: number | null;
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  sku: string;
  stock: number;
  inStock: boolean;
  isFeatured: boolean;
  rating: number;
  reviewCount: number;
  soldCount: number;
  createdAt: string;
};

const ratingExpr = sql<number>`coalesce((select avg(r.rating)::float from reviews r where r.product_id = ${products.id} and r.is_approved), 0)`;
const reviewCountExpr = sql<number>`(select count(*)::int from reviews r where r.product_id = ${products.id} and r.is_approved)`;

const publicColumns = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  description: products.description,
  images: products.images,
  price: products.price,
  compareAtPrice: products.compareAtPrice,
  categoryId: products.categoryId,
  categoryName: categories.name,
  categorySlug: categories.slug,
  sku: products.sku,
  stock: products.stock,
  isFeatured: products.isFeatured,
  soldCount: products.soldCount,
  createdAt: products.createdAt,
  rating: ratingExpr,
  reviewCount: reviewCountExpr,
};

type Row = {
  [K in keyof typeof publicColumns]: unknown;
};

function toPublic(r: Row): PublicProduct {
  const stock = Number(r.stock);
  return {
    id: r.id as number,
    name: r.name as string,
    slug: r.slug as string,
    description: r.description as string,
    images: (r.images as string[]) ?? [],
    price: r.price as number,
    compareAtPrice: (r.compareAtPrice as number | null) ?? null,
    categoryId: (r.categoryId as number | null) ?? null,
    categoryName: (r.categoryName as string | null) ?? null,
    categorySlug: (r.categorySlug as string | null) ?? null,
    sku: r.sku as string,
    stock,
    inStock: stock > 0,
    isFeatured: Boolean(r.isFeatured),
    rating: Math.round(Number(r.rating) * 10) / 10,
    reviewCount: Number(r.reviewCount),
    soldCount: Number(r.soldCount),
    createdAt: new Date(r.createdAt as Date).toISOString(),
  };
}

function baseQuery() {
  return db
    .select(publicColumns)
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId));
}

const activeFilter = and(eq(products.isActive, true), or(sql`${products.categoryId} is null`, eq(categories.isActive, true)));

export type ProductFilters = {
  q?: string;
  category?: string;
  min?: number;
  max?: number;
  inStock?: boolean;
  sale?: boolean;
  sort?: string;
  page?: number;
};

function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export async function listProducts(f: ProductFilters) {
  const conds: (SQL | undefined)[] = [activeFilter];
  if (f.q && f.q.trim()) {
    const term = `%${escapeLike(f.q.trim().slice(0, 100))}%`;
    conds.push(or(ilike(products.name, term), ilike(products.sku, term), ilike(products.description, term), ilike(categories.name, term)));
  }
  if (f.category) conds.push(eq(categories.slug, f.category));
  if (f.min != null && Number.isFinite(f.min)) conds.push(gte(products.price, Math.round(f.min * 100)));
  if (f.max != null && Number.isFinite(f.max)) conds.push(lte(products.price, Math.round(f.max * 100)));
  if (f.inStock) conds.push(sql`${products.stock} > 0`);
  if (f.sale) conds.push(and(isNotNull(products.compareAtPrice), sql`${products.compareAtPrice} > ${products.price}`));
  const where = and(...conds);

  let order: SQL[];
  switch (f.sort) {
    case "price_asc":
      order = [asc(products.price)];
      break;
    case "price_desc":
      order = [desc(products.price)];
      break;
    case "best_selling":
      order = [desc(products.soldCount), desc(products.createdAt)];
      break;
    case "discount":
      order = [sql`coalesce((${products.compareAtPrice} - ${products.price})::float / nullif(${products.compareAtPrice}, 0), 0) desc`];
      break;
    default:
      order = [desc(products.createdAt)];
  }

  const page = Math.max(1, Math.min(1000, Math.floor(f.page ?? 1)));
  const [rows, countRows] = await Promise.all([
    baseQuery().where(where).orderBy(...order, desc(products.id)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ count: sql<number>`count(*)::int` }).from(products).leftJoin(categories, eq(categories.id, products.categoryId)).where(where),
  ]);
  const total = Number(countRows[0]?.count ?? 0);
  return { items: rows.map(toPublic), total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getFeaturedProducts(limit = 8) {
  return unstable_cache(async () => {
    const rows = await baseQuery().where(and(activeFilter, eq(products.isFeatured, true))).orderBy(desc(products.updatedAt)).limit(limit);
    return rows.map(toPublic);
  }, ["rivo-featured-products", String(limit)], { revalidate: 60, tags: ["rivo-products"] })();
}

export async function getLatestProducts(limit = 8) {
  return unstable_cache(async () => {
    const rows = await baseQuery().where(activeFilter).orderBy(desc(products.createdAt)).limit(limit);
    return rows.map(toPublic);
  }, ["rivo-latest-products", String(limit)], { revalidate: 60, tags: ["rivo-products"] })();
}

export async function getOnSaleProducts(limit = 8) {
  return unstable_cache(async () => {
    const rows = await baseQuery()
      .where(and(activeFilter, isNotNull(products.compareAtPrice), sql`${products.compareAtPrice} > ${products.price}`))
      .orderBy(sql`(${products.compareAtPrice} - ${products.price})::float / nullif(${products.compareAtPrice}, 0) desc`)
      .limit(limit);
    return rows.map(toPublic);
  }, ["rivo-sale-products", String(limit)], { revalidate: 60, tags: ["rivo-products"] })();
}

export async function getBestSellers(limit = 8) {
  return unstable_cache(async () => {
    const rows = await baseQuery().where(and(activeFilter, sql`${products.soldCount} > 0`)).orderBy(desc(products.soldCount)).limit(limit);
    return rows.map(toPublic);
  }, ["rivo-best-selling-products", String(limit)], { revalidate: 60, tags: ["rivo-products"] })();
}

export async function getProductBySlug(slug: string) {
  const rows = await baseQuery().where(and(activeFilter, eq(products.slug, slug))).limit(1);
  return rows[0] ? toPublic(rows[0]) : null;
}

export async function getRelatedProducts(p: PublicProduct, limit = 4) {
  const conds = [activeFilter, ne(products.id, p.id)];
  if (p.categoryId) conds.push(eq(products.categoryId, p.categoryId));
  let rows = await baseQuery().where(and(...conds)).orderBy(desc(products.soldCount), desc(products.createdAt)).limit(limit);
  if (rows.length < limit) {
    const exclude = [p.id, ...rows.map((r) => r.id as number)];
    const more = await baseQuery()
      .where(and(activeFilter, sql`${products.id} not in (${sql.join(exclude.map((id) => sql`${id}`), sql`, `)})`))
      .orderBy(desc(products.createdAt))
      .limit(limit - rows.length);
    rows = [...rows, ...more];
  }
  return rows.map(toPublic);
}

export async function getProductReviews(productId: number) {
  return db
    .select({ id: reviews.id, name: reviews.name, rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.isApproved, true)))
    .orderBy(desc(reviews.createdAt))
    .limit(50);
}

export async function getCategoriesWithCounts() {
  return unstable_cache(async () => db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      image: categories.image,
      productCount: sql<number>`(select count(*)::int from products p where p.category_id = ${categories.id} and p.is_active)`,
    })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder), asc(categories.name)), ["rivo-categories"], { revalidate: 300, tags: ["rivo-categories"] })();
}

export async function searchSuggestions(q: string) {
  const term = `%${escapeLike(q.trim().slice(0, 100))}%`;
  const rows = await db
    .select({ id: products.id, name: products.name, slug: products.slug, price: products.price, image: sql<string | null>`${products.images}->>0` })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(and(activeFilter, or(ilike(products.name, term), ilike(products.sku, term), ilike(categories.name, term))))
    .orderBy(desc(products.soldCount))
    .limit(6);
  const cats = await db
    .select({ name: categories.name, slug: categories.slug })
    .from(categories)
    .where(and(eq(categories.isActive, true), ilike(categories.name, term)))
    .limit(3);
  return { products: rows, categories: cats };
}

export async function getActiveProductSlugs() {
  return db.select({ slug: products.slug, updatedAt: products.updatedAt }).from(products).where(eq(products.isActive, true));
}

export async function getProductsByIds(ids: number[]) {
  if (!ids.length) return [];
  const rows = await baseQuery().where(and(activeFilter, inArray(products.id, ids)));
  return rows.map(toPublic);
}
