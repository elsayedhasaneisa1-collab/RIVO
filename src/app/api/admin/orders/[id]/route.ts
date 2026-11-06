import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orderItems, orderStatusHistory, orders, users } from "@/db/schema";
import { hasPermission, ORDER_STATUSES, STATUS_TRANSITIONS, type OrderStatus } from "@/lib/constants";
import { ApiError, ok, parseBody, parseId, route } from "@/lib/server/api";
import { logAudit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { transitionOrder } from "@/lib/server/orders";
import { cleanText } from "@/lib/server/security";
import { notifyTelegramOrderStatus } from "@/lib/server/integrations/telegram";
import { notifyWhatsappOrderStatus } from "@/lib/server/integrations/whatsapp";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req, ctx: Ctx) => {
  const user = await requireAdmin("orders");
  const id = parseId((await ctx.params).id);
  const [o] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!o) throw new ApiError(404, "الطلب غير موجود", "not_found");
  const showProfit = hasPermission(user.role, "profits");
  const [items, history] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db
      .select({ id: orderStatusHistory.id, fromStatus: orderStatusHistory.fromStatus, toStatus: orderStatusHistory.toStatus, note: orderStatusHistory.note, createdAt: orderStatusHistory.createdAt, userName: users.name })
      .from(orderStatusHistory)
      .leftJoin(users, eq(users.id, orderStatusHistory.userId))
      .where(eq(orderStatusHistory.orderId, id))
      .orderBy(asc(orderStatusHistory.createdAt)),
  ]);
  const { ipHash: _ip, idempotencyKey: _k, ...safe } = o;
  void _ip;
  void _k;
  return ok({
    order: showProfit ? safe : { ...safe, costTotal: null, profit: null },
    items: items.map((i) => (showProfit ? i : { ...i, unitCost: null })),
    history,
    allowedTransitions: STATUS_TRANSITIONS[o.status as OrderStatus] ?? [],
  });
});

const patchSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  note: z.string().transform(cleanText).pipe(z.string().max(500)).optional().nullable(),
  supplierOrderRef: z.string().transform(cleanText).pipe(z.string().max(100)).optional().nullable(),
  trackingNumber: z.string().transform(cleanText).pipe(z.string().max(100)).optional().nullable(),
  adminNotes: z.string().transform(cleanText).pipe(z.string().max(2000)).optional().nullable(),
});

export const PATCH = route(async (req, ctx: Ctx) => {
  const user = await requireAdmin("orders");
  const id = parseId((await ctx.params).id);
  const body = await parseBody(req, patchSchema);
  if (body.status) {
    const r = await transitionOrder(id, body.status, user, body.note);
    await logAudit({ user, action: "status_change", entity: "order", entityId: id, details: { reference: r.reference, from: r.from, to: r.to, note: body.note ?? null }, req });
    await notifyTelegramOrderStatus(r.reference, r.from, r.to);
    const [orderForNotice] = await db.select({ name: orders.name, phone: orders.phone, whatsappUpdatesConsent: orders.whatsappUpdatesConsent }).from(orders).where(eq(orders.id, id)).limit(1);
    if (orderForNotice?.whatsappUpdatesConsent) await notifyWhatsappOrderStatus(orderForNotice.phone, orderForNotice.name, r.reference, r.to);
  }
  const fields: Partial<typeof orders.$inferInsert> = {};
  if (body.supplierOrderRef !== undefined) fields.supplierOrderRef = body.supplierOrderRef || null;
  if (body.trackingNumber !== undefined) fields.trackingNumber = body.trackingNumber || null;
  if (body.adminNotes !== undefined) fields.adminNotes = body.adminNotes || null;
  if (Object.keys(fields).length) {
    const [o] = await db.update(orders).set({ ...fields, updatedAt: new Date() }).where(eq(orders.id, id)).returning({ reference: orders.reference });
    if (!o) throw new ApiError(404, "الطلب غير موجود", "not_found");
    await logAudit({ user, action: "update", entity: "order", entityId: id, details: { reference: o.reference, ...fields }, req });
  }
  return ok({ ok: true });
});
