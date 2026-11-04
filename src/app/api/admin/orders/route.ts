import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { hasPermission } from "@/lib/constants";
import { orderFilters } from "@/lib/server/order-filters";
import { ok, route } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  const user = await requireAdmin("orders");
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const where = orderFilters(sp);
  const showProfit = hasPermission(user.role, "profits");
  const [rows, count, statusCounts] = await Promise.all([
    db
      .select({
        id: orders.id,
        reference: orders.reference,
        name: orders.name,
        phone: orders.phone,
        governorate: orders.governorate,
        status: orders.status,
        total: orders.total,
        profit: orders.profit,
        paymentConfirmedAt: orders.paymentConfirmedAt,
        createdAt: orders.createdAt,
        itemsCount: sql<number>`(select coalesce(sum(quantity),0)::int from order_items oi where oi.order_id = ${orders.id})`,
      })
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(20)
      .offset((page - 1) * 20),
    db.select({ c: sql<number>`count(*)::int` }).from(orders).where(where),
    db.select({ status: orders.status, c: sql<number>`count(*)::int` }).from(orders).groupBy(orders.status),
  ]);
  const total = Number(count[0]?.c ?? 0);
  return ok({
    items: rows.map((r) => (showProfit ? r : { ...r, profit: null })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / 20)),
    statusCounts: Object.fromEntries(statusCounts.map((s) => [s.status, Number(s.c)])),
  });
});
