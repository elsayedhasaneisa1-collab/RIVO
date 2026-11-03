import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { ApiError, ok, parseBody, parseId, route } from "@/lib/server/api";
import { logAudit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { categoryInputSchema, categoryValues } from "@/lib/server/category-input";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route(async (req, ctx: Ctx) => {
  const user = await requireAdmin("categories");
  const id = parseId((await ctx.params).id);
  const input = await parseBody(req, categoryInputSchema);
  const [c] = await db.update(categories).set(categoryValues(input)).where(eq(categories.id, id)).returning();
  if (!c) throw new ApiError(404, "التصنيف غير موجود", "not_found");
  await logAudit({ user, action: "update", entity: "category", entityId: id, details: { name: c.name }, req });
  return ok({ category: c });
});

export const DELETE = route(async (req, ctx: Ctx) => {
  const user = await requireAdmin("categories");
  const id = parseId((await ctx.params).id);
  const [c] = await db.delete(categories).where(eq(categories.id, id)).returning({ name: categories.name });
  if (!c) throw new ApiError(404, "التصنيف غير موجود", "not_found");
  await logAudit({ user, action: "delete", entity: "category", entityId: id, details: c, req });
  return ok({ ok: true });
});
