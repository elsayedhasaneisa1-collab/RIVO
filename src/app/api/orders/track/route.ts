import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orderItems, orderStatusHistory, orders } from "@/db/schema";
import { ApiError, ok, parseBody, route } from "@/lib/server/api";
import { limitByIp } from "@/lib/server/security";

export const dynamic = "force-dynamic";

const schema = z.object({
  reference: z.string().trim().toUpperCase().regex(/^RV-\d{6}-[A-Z0-9]{6}$/, "رقم الطلب غير صحيح"),
  phone: z.string().trim().regex(/^01\d{9}$/, "رقم الهاتف غير صحيح"),
});

export const POST = route(async (req) => {
  await limitByIp(req, "track", 20, 600);
  const { reference, phone } = await parseBody(req, schema);
  const [o] = await db.select().from(orders).where(and(eq(orders.reference, reference), eq(orders.phone, phone))).limit(1);
  if (!o) throw new ApiError(404, "لم يتم العثور على طلب بهذه البيانات", "not_found");
  const [items, history] = await Promise.all([
    db.select({ name: orderItems.name, quantity: orderItems.quantity, unitPrice: orderItems.unitPrice, lineTotal: orderItems.lineTotal, image: orderItems.image }).from(orderItems).where(eq(orderItems.orderId, o.id)),
    db.select({ toStatus: orderStatusHistory.toStatus, createdAt: orderStatusHistory.createdAt }).from(orderStatusHistory).where(eq(orderStatusHistory.orderId, o.id)).orderBy(asc(orderStatusHistory.createdAt)),
  ]);
  return ok({
    order: {
      reference: o.reference,
      status: o.status,
      governorate: o.governorate,
      city: o.city,
      subtotal: o.subtotal,
      discount: o.discount,
      shippingFee: o.shippingFee,
      total: o.total,
      trackingNumber: o.trackingNumber,
      createdAt: o.createdAt,
      items,
      history,
    },
  });
});
