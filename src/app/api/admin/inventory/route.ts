import { and, asc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { products } from "@/db/schema";
import { ApiError, ok, parseBody, route } from "@/lib/server/api";
import { logAudit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { cleanText } from "@/lib/server/security";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin("inventory");
  const sp = req.nextUrl.searchParams;
  const filter = sp.get("filter");
  const q = sp.get("q")?.trim().slice(0, 60);
  const conds: (SQL | undefined)[] = [];
  if (filter === "low") conds.push(and(sql`${products.stock} > 0`, sql`${products.stock} <= ${products.lowStockThreshold}`));
  if (filter === "out") conds.push(sql`${products.stock} <= 0`);
  if (q) conds.push(or(ilike(products.name, `%${q}%`), ilike(products.sku, `%${q}%`)));
  const where = conds.length ? and(...conds) : undefined;
  const [items, summary] = await Promise.all([
    db
      .select({ id: products.id, name: products.name, sku: products.sku, images: products.images, stock: products.stock, lowStockThreshold: products.lowStockThreshold, soldCount: products.soldCount, isActive: products.isActive })
      .from(products)
      .where(where)
      .orderBy(asc(products.stock), asc(products.name))
      .limit(200),
    db
      .select({
        total: sql<number>`count(*)::int`,
        low: sql<number>`count(*) filter (where ${products.stock} > 0 and ${products.stock} <= ${products.lowStockThreshold})::int`,
        out: sql<number>`count(*) filter (where ${products.stock} <= 0)::int`,
        units: sql<number>`coalesce(sum(${products.stock}),0)::int`,
      })
      .from(products),
  ]);
  return ok({ items, summary: summary[0] });
});

const schema = z.object({
  productId: z.number().int().positive(),
  mode: z.enum(["set", "adjust"]),
  value: z.number().int().min(-1_000_000).max(1_000_000),
  reason: z.string().transform(cleanText).pipe(z.string().max(200)).optional(),
});

export const PATCH = route(async (req) => {
  const user = await requireAdmin("inventory");
  const body = await parseBody(req, schema);
  const expr = body.mode === "set" ? sql`${Math.max(0, body.value)}` : sql`greatest(${products.stock} + ${body.value}, 0)`;
  const [before] = await db.select({ stock: products.stock, name: products.name }).from(products).where(eq(products.id, body.productId)).limit(1);
  if (!before) throw new ApiError(404, "المنتج غير موجود", "not_found");
  const [p] = await db.update(products).set({ stock: expr, updatedAt: new Date() }).where(eq(products.id, body.productId)).returning({ stock: products.stock });
  await logAudit({ user, action: "stock_update", entity: "product", entityId: body.productId, details: { name: before.name, from: before.stock, to: p.stock, reason: body.reason ?? null }, req });
  return ok({ stock: p.stock });
});
