import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { products } from "@/db/schema";
import { ApiError, ok, parseBody, parseId, route } from "@/lib/server/api";
import { logAudit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { computeProductValues, productInputSchema } from "@/lib/server/product-input";
import {
  deleteTelegramProductPost,
  notifyTelegramNewProduct,
  updateTelegramProductPost,
} from "@/lib/server/integrations/telegram";

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
  const [before] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!before) throw new ApiError(404, "المنتج غير موجود", "not_found");
  let telegramMessageId = before.telegramMessageId;
  const telegramProduct = {
    name: values.name,
    slug: values.slug,
    description: values.description,
    images: values.images,
    price: values.price,
    compareAtPrice: values.compareAtPrice,
    stock: values.stock,
  };

  if (values.isActive) {
    try {
      if (telegramMessageId) {
        telegramMessageId = await updateTelegramProductPost(telegramProduct, telegramMessageId);
      } else {
        telegramMessageId = await notifyTelegramNewProduct(telegramProduct);
      }
    } catch (error) {
      console.error("telegram_product_update_error", error instanceof Error ? error.message : "unknown");
    }
  } else if (telegramMessageId) {
    try {
      await deleteTelegramProductPost(telegramMessageId);
    } catch (error) {
      console.error("telegram_product_unpublish_error", error instanceof Error ? error.message : "unknown");
    }
    telegramMessageId = null;
  }

  await db.update(products).set({ ...values, telegramMessageId, updatedAt: new Date() }).where(eq(products.id, id));
  revalidateTag("rivo-products", "max");
  await logAudit({ user, action: "update", entity: "product", entityId: id, details: { name: values.name, before, after: { price: values.price, costPrice: values.costPrice, stock: values.stock } }, req });
  return ok({ ok: true });
});

export const DELETE = route(async (req, ctx: Ctx) => {
  const user = await requireAdmin("products");
  const id = parseId((await ctx.params).id);
  const [existing] = await db.select({ id: products.id, name: products.name, sku: products.sku, telegramMessageId: products.telegramMessageId }).from(products).where(eq(products.id, id)).limit(1);
  if (!existing) throw new ApiError(404, "المنتج غير موجود", "not_found");
  if (existing.telegramMessageId) {
    try {
      await deleteTelegramProductPost(existing.telegramMessageId);
    } catch (error) {
      console.error("telegram_product_delete_error", error instanceof Error ? error.message : "unknown");
    }
  }
  const [p] = await db.delete(products).where(eq(products.id, id)).returning({ name: products.name, sku: products.sku });
  revalidateTag("rivo-products", "max");
  await logAudit({ user, action: "delete", entity: "product", entityId: id, details: p, req });
  return ok({ ok: true });
});
