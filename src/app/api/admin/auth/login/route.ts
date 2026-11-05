import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ApiError, ok, parseBody, route } from "@/lib/server/api";
import { logAudit } from "@/lib/server/audit";
import { createSession } from "@/lib/server/auth";
import { limitByIp, rateLimit, sha256, verifyPassword } from "@/lib/server/security";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().trim().toLowerCase().email("بريد غير صالح").max(120), password: z.string().min(1).max(200) });

export const POST = route(async (req) => {
  await limitByIp(req, "login", 10, 900);
  const { email, password } = await parseBody(req, schema);
  await rateLimit(`login-email:${sha256(email)}`, 8, 900);
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const valid = u ? await verifyPassword(password, u.passwordHash) : await verifyPassword(password, "scrypt$00$00");
  if (!u || !valid || !u.isActive) {
    await logAudit({ user: null, action: "login_failed", entity: "auth", details: { email }, req });
    throw new ApiError(401, "بيانات الدخول غير صحيحة", "invalid_credentials");
  }
  await createSession(u.id);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, u.id));
  await logAudit({ user: { id: u.id, email: u.email, name: u.name, role: u.role as "owner" }, action: "login", entity: "auth", req });
  return ok({ user: { id: u.id, email: u.email, name: u.name, role: u.role } });
});
