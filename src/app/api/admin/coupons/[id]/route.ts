import { eq } from "drizzle-orm";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { ApiError, ok, parseBody, parseId, route } from "@/lib/server/api";
import { logAudit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { couponInputSchema, couponValues } from "@/lib/server/coupon-input";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route(async (req, ctx: Ctx) => {
  const user = await requireAdmin("coupons");
  const id = parseId((await ctx.params).id);
  const input = await parseBody(req, couponInputSchema);
  const [c] = await db.update(coupons).set(couponValues(input)).where(eq(coupons.id, id)).returning();
  if (!c) throw new ApiError(404, "الكوبون غير موجود", "not_found");
  await logAudit({ user, action: "update", entity: "coupon", entityId: id, details: { code: c.code, isActive: c.isActive }, req });
  return ok({ coupon: c });
});

export const DELETE = route(async (req, ctx: Ctx) => {
  const user = await requireAdmin("coupons");
  const id = parseId((await ctx.params).id);
  const [c] = await db.delete(coupons).where(eq(coupons.id, id)).returning({ code: coupons.code });
  if (!c) throw new ApiError(404, "الكوبون غير موجود", "not_found");
  await logAudit({ user, action: "delete", entity: "coupon", entityId: id, details: c, req });
  return ok({ ok: true });
});
