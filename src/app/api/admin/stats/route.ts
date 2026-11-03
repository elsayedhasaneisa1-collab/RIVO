import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, orderItems, orders, products } from "@/db/schema";
import { EXPECTED_PROFIT_STATUSES, hasPermission, PENDING_PROFIT_STATUSES } from "@/lib/constants";
import { ok, route } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const SOLD = ["paid", "sent_to_supplier", "shipping", "delivered"];

export const GET = route(async (req) => {
  const user = await requireAdmin("orders");
  const days = Math.min(365, Math.max(7, Number(req.nextUrl.searchParams.get("days") ?? 30) || 30));
  const since = new Date(Date.now() - days * 86400_000);
  const showProfit = hasPermission(user.role, "profits");

  const [totals, statusRows, series, top, lowStock, recent, counts] = await Promise.all([
    db
      .select({
        orders: sql<number>`count(*)::int`,
        sales: sql<number>`coalesce(sum(${orders.total}) filter (where ${inArray(orders.status, SOLD)}), 0)::bigint`,
        netSales: sql<number>`coalesce(sum(${orders.subtotal} - ${orders.discount}) filter (where ${inArray(orders.status, SOLD)}), 0)::bigint`,
        realizedSales: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.status} = 'delivered' and ${orders.paymentConfirmedAt} is not null), 0)::bigint`,
        expectedProfit: sql<number>`coalesce(sum(${orders.profit}) filter (where ${inArray(orders.status, EXPECTED_PROFIT_STATUSES)}), 0)::bigint`,
        pendingProfit: sql<number>`coalesce(sum(${orders.profit}) filter (where ${inArray(orders.status, PENDING_PROFIT_STATUSES)}), 0)::bigint`,
        realizedProfit: sql<number>`coalesce(sum(${orders.profit}) filter (where ${orders.status} = 'delivered' and ${orders.paymentConfirmedAt} is not null), 0)::bigint`,
        lostProfit: sql<number>`coalesce(sum(${orders.profit}) filter (where ${orders.status} = 'returned'), 0)::bigint`,
        awaitingPayment: sql<number>`count(*) filter (where ${inArray(orders.status, ["pending", "payment_review"])})::int`,
        paymentReview: sql<number>`count(*) filter (where ${orders.status} = 'payment_review')::int`,
        deliveredCount: sql<number>`count(*) filter (where ${orders.status} = 'delivered')::int`,
        cancelledCount: sql<number>`count(*) filter (where ${inArray(orders.status, ["cancelled", "returned"])})::int`,
      })
      .from(orders)
      .where(gte(orders.createdAt, since)),
    db.select({ status: orders.status, count: sql<number>`count(*)::int` }).from(orders).where(gte(orders.createdAt, since)).groupBy(orders.status),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`,
        orders: sql<number>`count(*)::int`,
        sales: sql<number>`coalesce(sum(${orders.total}) filter (where ${inArray(orders.status, SOLD)}), 0)::bigint`,
        profit: sql<number>`coalesce(sum(${orders.profit}) filter (where ${orders.status} = 'delivered' and ${orders.paymentConfirmedAt} is not null), 0)::bigint`,
      })
      .from(orders)
      .where(gte(orders.createdAt, since))
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    db
      .select({
        productId: orderItems.productId,
        name: orderItems.name,
        sku: orderItems.sku,
        image: sql<string | null>`max(${orderItems.image})`,
        quantity: sql<number>`sum(${orderItems.quantity})::int`,
        revenue: sql<number>`sum(${orderItems.lineTotal})::bigint`,
        profit: sql<number>`sum(${orderItems.lineTotal} - ${orderItems.unitCost} * ${orderItems.quantity})::bigint`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(inArray(orders.status, SOLD), gte(orders.createdAt, since)))
      .groupBy(orderItems.productId, orderItems.name, orderItems.sku)
      .orderBy(desc(sql`sum(${orderItems.quantity})`))
      .limit(10),
    db
      .select({ id: products.id, name: products.name, sku: products.sku, stock: products.stock, lowStockThreshold: products.lowStockThreshold })
      .from(products)
      .where(and(eq(products.isActive, true), sql`${products.stock} <= ${products.lowStockThreshold}`))
      .orderBy(products.stock)
      .limit(8),
    db
      .select({ id: orders.id, reference: orders.reference, name: orders.name, status: orders.status, total: orders.total, createdAt: orders.createdAt })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(8),
    Promise.all([
      db.select({ c: sql<number>`count(*)::int` }).from(products),
      db.select({ c: sql<number>`count(*)::int` }).from(customers),
      db.select({ c: sql<number>`count(*)::int` }).from(orders).where(isNotNull(orders.paymentConfirmedAt)),
    ]),
  ]);

  const t = totals[0];
  const num = (v: unknown) => Number(v ?? 0);
  const seriesMap = new Map(series.map((s) => [s.day, s]));
  const filled = [] as { day: string; orders: number; sales: number; profit: number | null }[];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    const s = seriesMap.get(d);
    filled.push({ day: d, orders: num(s?.orders), sales: num(s?.sales), profit: showProfit ? num(s?.profit) : null });
  }

  return ok({
    days,
    showProfit,
    totals: {
      orders: num(t.orders),
      sales: num(t.sales),
      netSales: num(t.netSales),
      realizedSales: num(t.realizedSales),
      averageOrder: num(t.orders) ? Math.round(num(t.sales) / Math.max(1, num(t.orders) - num(t.cancelledCount) - num(t.awaitingPayment))) : 0,
      awaitingPayment: num(t.awaitingPayment),
      paymentReview: num(t.paymentReview),
      deliveredCount: num(t.deliveredCount),
      cancelledCount: num(t.cancelledCount),
      products: num(counts[0][0]?.c),
      customers: num(counts[1][0]?.c),
      paidOrders: num(counts[2][0]?.c),
    },
    profits: showProfit
      ? { expected: num(t.expectedProfit), pending: num(t.pendingProfit), realized: num(t.realizedProfit), lost: num(t.lostProfit) }
      : null,
    statusBreakdown: Object.fromEntries(statusRows.map((s) => [s.status, num(s.count)])),
    series: filled,
    topProducts: top.map((p) => ({ ...p, revenue: num(p.revenue), profit: showProfit ? num(p.profit) : null })),
    lowStock,
    recentOrders: recent,
  });
});
