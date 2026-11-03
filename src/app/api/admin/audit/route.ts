import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { ok, route } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin("audit");
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const entity = sp.get("entity")?.slice(0, 40);
  const where = entity ? eq(auditLogs.entity, entity) : undefined;
  const [items, count] = await Promise.all([
    db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt)).limit(50).offset((page - 1) * 50),
    db.select({ c: sql<number>`count(*)::int` }).from(auditLogs).where(where),
  ]);
  const total = Number(count[0]?.c ?? 0);
  return ok({ items, total, page, pages: Math.max(1, Math.ceil(total / 50)) });
});
