import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { products } from "@/db/schema";
import { ApiError, ok, parseBody, parseId, route } from "@/lib/server/api";
import { logAudit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { computeProductValues, productInputSchema } from "@/lib/server/product-input";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req, ctx: Ctx) => {
  await requireAdmin("products");
  const id = parseId((await ctx.params).id);
  const [p] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!p) throw new ApiError(404, "المنتج غير موجود", "not_found");
  revalidateTag("rivo-products", "max");
  return ok({ product: p });
});

export const PUT = route(async (req, ctx: Ctx) => {
  const user = await requireAdmin("products");
  const id = parseId((await ctx.params).id);
  const input = await parseBody(req, productInputSchema, 200_000);
  const values = computeProductValues(input);
  const [before] = await db.select({ price: products.price, costPrice: products.costPrice, stock: products.stock }).from(products).where(eq(products.id, id)).limit(1);
  if (!before) throw new ApiError(404, "المنتج غير موجود", "not_found");
  await db.update(products).set({ ...values, updatedAt: new Date() }).where(eq(products.id, id));
  revalidateTag("rivo-products", "max");
  await logAudit({ user, action: "update", entity: "product", entityId: id, details: { name: values.name, before, after: { price: values.price, costPrice: values.costPrice, stock: values.stock } }, req });
  return ok({ ok: true });
});

export const DELETE = route(async (req, ctx: Ctx) => {
  const user = await requireAdmin("products");
  const id = parseId((await ctx.params).id);
  const [p] = await db.delete(products).where(eq(products.id, id)).returning({ name: products.name, sku: products.sku });
  if (!p) throw new ApiError(404, "المنتج غير موجود", "not_found");
  revalidateTag("rivo-products", "max");
  await logAudit({ user, action: "delete", entity: "product", entityId: id, details: p, req });
  return ok({ ok: true });
});
