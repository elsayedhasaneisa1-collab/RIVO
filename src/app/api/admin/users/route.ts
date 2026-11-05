import { asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ok, parseBody, route } from "@/lib/server/api";
import { logAudit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { cleanText, hashPassword } from "@/lib/server/security";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireAdmin("users");
  const items = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt })
    .from(users)
    .orderBy(asc(users.id));
  return ok({ items });
});

const schema = z.object({
  name: z.string().transform(cleanText).pipe(z.string().min(2).max(60)),
  email: z.string().trim().toLowerCase().email("بريد غير صالح").max(120),
  password: z.string().min(10, "كلمة المرور 10 أحرف على الأقل").max(200),
  role: z.enum(["admin", "staff"]),
});

export const POST = route(async (req) => {
  const user = await requireAdmin("users");
  const body = await parseBody(req, schema);
  const [u] = await db
    .insert(users)
    .values({ name: body.name, email: body.email, role: body.role, passwordHash: await hashPassword(body.password) })
    .returning({ id: users.id, email: users.email, role: users.role });
  await logAudit({ user, action: "create", entity: "user", entityId: u.id, details: { email: u.email, role: u.role }, req });
  return ok({ user: u }, { status: 201 });
});
