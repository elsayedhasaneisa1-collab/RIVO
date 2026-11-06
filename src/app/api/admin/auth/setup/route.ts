import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ApiError, ok, parseBody, route } from "@/lib/server/api";
import { logAudit } from "@/lib/server/audit";
import { createSession } from "@/lib/server/auth";
import { cleanText, hashPassword, limitByIp } from "@/lib/server/security";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().transform(cleanText).pipe(z.string().min(2).max(60)),
  email: z.string().trim().toLowerCase().email("بريد غير صالح").max(120),
  password: z.string().min(10, "كلمة المرور 10 أحرف على الأقل").max(200),
  setupToken: z.string().min(1, "رمز الإعداد مطلوب").max(200),
});

async function needsSetup() {
  const r = await db.select({ c: sql<number>`count(*)::int` }).from(users);
  return Number(r[0]?.c ?? 0) === 0;
}

export const GET = route(async () => ok({ needsSetup: await needsSetup(), requiresToken: Boolean(process.env.ADMIN_SETUP_TOKEN) }));

export const POST = route(async (req) => {
  await limitByIp(req, "setup", 5, 900);
  const body = await parseBody(req, schema);
  if (!process.env.ADMIN_SETUP_TOKEN) throw new ApiError(503, "يجب ضبط ADMIN_SETUP_TOKEN في إعدادات الاستضافة أولًا", "setup_token_missing");
  if (body.setupToken !== process.env.ADMIN_SETUP_TOKEN) throw new ApiError(403, "رمز الإعداد غير صحيح", "forbidden");
  const passwordHash = await hashPassword(body.password);
  const created = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(424242)`);
    const r = await tx.select({ c: sql<number>`count(*)::int` }).from(users);
    if (Number(r[0]?.c ?? 0) > 0) throw new ApiError(403, "تم إعداد المتجر مسبقًا", "already_setup");
    const [u] = await tx.insert(users).values({ name: body.name, email: body.email, passwordHash, role: "owner" }).returning();
    return u;
  });
  await createSession(created.id);
  await logAudit({ user: { id: created.id, email: created.email, name: created.name, role: "owner" }, action: "owner_setup", entity: "user", entityId: created.id, req });
  return ok({ ok: true }, { status: 201 });
});
