import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs, coupons, orderItems, orderStatusHistory, orders, products, sessions } from "@/db/schema";
import { sendTelegramText } from "@/lib/server/integrations/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date();
  const expiredSessions = await db.delete(sessions).where(lt(sessions.expiresAt, now)).returning({ id: sessions.id });
  const candidates = await db.select({ id: orders.id }).from(orders).where(and(inArray(orders.status, ["pending", "payment_review"]), lt(orders.paymentExpiresAt, now))).limit(100);
  const expiredReferences: string[] = [];

  for (const candidate of candidates) {
    await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, candidate.id)).for("update").limit(1);
      if (!order || !["pending", "payment_review"].includes(order.status) || !order.paymentExpiresAt || order.paymentExpiresAt > now) return;
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      for (const item of items) {
        if (item.productId) {
          await tx.update(products).set({ stock: sql`${products.stock} + ${item.quantity}`, updatedAt: now }).where(eq(products.id, item.productId));
        }
      }
      if (order.couponCode) {
        await tx.update(coupons).set({ usedCount: sql`greatest(${coupons.usedCount} - 1, 0)` }).where(eq(coupons.code, order.couponCode));
      }
      await tx.update(orders).set({ status: "cancelled", updatedAt: now }).where(eq(orders.id, order.id));
      await tx.insert(orderStatusHistory).values({ orderId: order.id, fromStatus: order.status, toStatus: "cancelled", note: "إلغاء تلقائي لانتهاء مهلة الدفع" });
      await tx.insert(auditLogs).values({ userEmail: "system:cron", action: "auto_cancel_expired_order", entity: "order", entityId: String(order.id), details: { reference: order.reference } });
      expiredReferences.push(order.reference);
    });
  }

  if (expiredReferences.length) {
    await sendTelegramText(`⏰ تم إلغاء ${expiredReferences.length} طلب تلقائيًا لانتهاء مهلة الدفع:\n${expiredReferences.join("\n")}`);
  }
  return NextResponse.json({ ok: true, expiredSessions: expiredSessions.length, expiredOrders: expiredReferences.length });
}
