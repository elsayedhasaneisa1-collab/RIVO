import { revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { ApiError, ok, parseBody, parseId, route } from "@/lib/server/api";
import { logAudit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (req, ctx: Ctx) => {
  const user = await requireAdmin("reviews");
  const id = parseId((await ctx.params).id);
  const { isApproved } = await parseBody(req, z.object({ isApproved: z.boolean() }));
  const [r] = await db.update(reviews).set({ isApproved }).where(eq(reviews.id, id)).returning({ id: reviews.id });
  if (!r) throw new ApiError(404, "التقييم غير موجود", "not_found");
  await logAudit({ user, action: isApproved ? "approve" : "unapprove", entity: "review", entityId: id, req });
  revalidateTag("rivo-reviews", "max");
  return ok({ ok: true });
});

export const DELETE = route(async (req, ctx: Ctx) => {
  const user = await requireAdmin("reviews");
  const id = parseId((await ctx.params).id);
  const [r] = await db.delete(reviews).where(eq(reviews.id, id)).returning({ id: reviews.id });
  if (!r) throw new ApiError(404, "التقييم غير موجود", "not_found");
  await logAudit({ user, action: "delete", entity: "review", entityId: id, req });
  revalidateTag("rivo-reviews", "max");
  return ok({ ok: true });
});
