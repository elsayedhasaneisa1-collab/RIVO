import { desc } from "drizzle-orm";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { ok, parseBody, route } from "@/lib/server/api";
import { logAudit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { couponInputSchema, couponValues } from "@/lib/server/coupon-input";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireAdmin("coupons");
  return ok({ items: await db.select().from(coupons).orderBy(desc(coupons.createdAt)) });
});

export const POST = route(async (req) => {
  const user = await requireAdmin("coupons");
  const input = await parseBody(req, couponInputSchema);
  const [c] = await db.insert(coupons).values(couponValues(input)).returning();
  await logAudit({ user, action: "create", entity: "coupon", entityId: c.id, details: { code: c.code, type: c.type, value: c.value }, req });
  return ok({ coupon: c }, { status: 201 });
});
