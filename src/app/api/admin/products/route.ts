import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { ok, parseBody, route } from "@/lib/server/api";
import { logAudit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { computeProductValues, productInputSchema } from "@/lib/server/product-input";
import { notifyTelegramNewProduct } from "@/lib/server/integrations/telegram";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin("products");
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim().slice(0, 100);
  const status = sp.get("status");
  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const conds: (SQL | undefined)[] = [];
  if (q) conds.push(or(ilike(products.name, `%${q}%`), ilike(products.sku, `%${q}%`)));
  if (status === "active") conds.push(eq(products.isActive, true));
  if (status === "hidden") conds.push(eq(products.isActive, false));
  if (status === "featured") conds.push(eq(products.isFeatured, true));
  if (status === "out") conds.push(sql`${products.stock} <= 0`);
  const cat = Number(sp.get("category"));
  if (cat) conds.push(eq(products.categoryId, cat));
  const where = conds.length ? and(...conds) : undefined;
  const [items, count] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        sku: products.sku,
        images: products.images,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        costPrice: products.costPrice,
        marginPercent: products.marginPercent,
        stock: products.stock,
        isActive: products.isActive,
        isFeatured: products.isFeatured,
        soldCount: products.soldCount,
        supplier: products.supplier,
        categoryName: categories.name,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(where)
      .orderBy(desc(products.createdAt))
      .limit(20)
      .offset((page - 1) * 20),
    db.select({ c: sql<number>`count(*)::int` }).from(products).where(where),
  ]);
  const total = Number(count[0]?.c ?? 0);
  return ok({ items: items.map((i) => ({ ...i, unitProfit: i.price - i.costPrice })), total, page, pages: Math.max(1, Math.ceil(total / 20)) });
});

export const POST = route(async (req) => {
  const user = await requireAdmin("products");
  const input = await parseBody(req, productInputSchema, 200_000);
  const values = computeProductValues(input);
  const [p] = await db.insert(products).values(values).returning({ id: products.id, slug: products.slug });
  revalidateTag("rivo-products", "max");
  await logAudit({ user, action: "create", entity: "product", entityId: p.id, details: { name: values.name, sku: values.sku, price: values.price, cost: values.costPrice }, req });
  if (values.isActive) {
    try {
      const sent = await notifyTelegramNewProduct({
        name: values.name,
        slug: values.slug,
        description: values.description,
        images: values.images,
        price: values.price,
        compareAtPrice: values.compareAtPrice,
        stock: values.stock,
      });
      if (!sent) console.error(`telegram_product_post_failed: product ${p.id}`);
    } catch (error) {
      console.error("telegram_product_post_error", error instanceof Error ? error.message : "unknown");
    }
  }
  return ok({ product: p }, { status: 201 });
});
