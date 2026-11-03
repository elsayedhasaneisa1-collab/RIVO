import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { ApiError, ok, parseBody, parseId, route } from "@/lib/server/api";
import { logAudit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { hashPassword } from "@/lib/server/security";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  role: z.enum(["admin", "staff"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(10, "كلمة المرور 10 أحرف على الأقل").max(200).optional(),
});

async function target(id: number, selfId: number) {
  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!u) throw new ApiError(404, "المستخدم غير موجود", "not_found");
  if (u.role === "owner" && u.id !== selfId) throw new ApiError(403, "لا يمكن تعديل حساب المالك", "forbidden");
  return u;
}

export const PATCH = route(async (req, ctx: Ctx) => {
  const user = await requireAdmin("users");
  const id = parseId((await ctx.params).id);
  const body = await parseBody(req, schema);
  const u = await target(id, user.id);
  const patch: Partial<typeof users.$inferInsert> = {};
  if (u.role !== "owner") {
    if (body.role) patch.role = body.role;
    if (body.isActive !== undefined) patch.isActive = body.isActive;
  }
  if (body.password) patch.passwordHash = await hashPassword(body.password);
  if (!Object.keys(patch).length) throw new ApiError(400, "لا توجد تغييرات", "noop");
  await db.update(users).set(patch).where(eq(users.id, id));
  if (patch.isActive === false || patch.passwordHash) await db.delete(sessions).where(eq(sessions.userId, id));
  await logAudit({ user, action: "update", entity: "user", entityId: id, details: { email: u.email, role: patch.role, isActive: patch.isActive, passwordChanged: Boolean(patch.passwordHash) }, req });
  return ok({ ok: true });
});

export const DELETE = route(async (req, ctx: Ctx) => {
  const user = await requireAdmin("users");
  const id = parseId((await ctx.params).id);
  if (id === user.id) throw new ApiError(400, "لا يمكنك حذف حسابك", "self");
  const u = await target(id, user.id);
  await db.delete(users).where(eq(users.id, id));
  await logAudit({ user, action: "delete", entity: "user", entityId: id, details: { email: u.email }, req });
  return ok({ ok: true });
});
