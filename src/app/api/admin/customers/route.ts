import { desc, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { ok, route } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin("customers");
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim().slice(0, 60);
  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const where = q ? or(ilike(customers.name, `%${q}%`), ilike(customers.phone, `%${q}%`)) : undefined;
  const [items, count] = await Promise.all([
    db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        altPhone: customers.altPhone,
        governorate: customers.governorate,
        city: customers.city,
        ordersCount: customers.ordersCount,
        totalSpent: customers.totalSpent,
        createdAt: customers.createdAt,
        lastOrderAt: sql<string | null>`(select max(created_at) from orders o where o.customer_id = ${customers.id})`,
      })
      .from(customers)
      .where(where)
      .orderBy(desc(customers.updatedAt))
      .limit(25)
      .offset((page - 1) * 25),
    db.select({ c: sql<number>`count(*)::int` }).from(customers).where(where),
  ]);
  const total = Number(count[0]?.c ?? 0);
  return ok({ items, total, page, pages: Math.max(1, Math.ceil(total / 25)) });
});
