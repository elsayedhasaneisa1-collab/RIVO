import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products } from "@/db/schema";
import { ApiError, ok, parseId, route } from "@/lib/server/api";
import { logAudit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { getSupplier } from "@/lib/server/integrations/supplier";
import { transitionOrder } from "@/lib/server/orders";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req, ctx: Ctx) => {
  const user = await requireAdmin("orders");
  const id = parseId((await ctx.params).id);
  const [o] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!o) throw new ApiError(404, "الطلب غير موجود", "not_found");
  if (o.status !== "paid") throw new ApiError(422, "يمكن إرسال الطلبات المدفوعة فقط إلى المورد", "invalid_state");
  const items = await db
    .select({ sku: orderItems.sku, name: orderItems.name, quantity: orderItems.quantity, unitPrice: orderItems.unitPrice, supplierProductId: products.supplierProductId })
    .from(orderItems)
    .leftJoin(products, eq(products.id, orderItems.productId))
    .where(eq(orderItems.orderId, id));
  const provider = getSupplier("taager");
  const result = await provider.pushOrder({
    reference: o.reference,
    customer: { name: o.name, phone: o.phone, altPhone: o.altPhone, governorate: o.governorate, city: o.city, area: o.area, address: o.address },
    items: items.map((i) => ({ ...i, supplierProductId: i.supplierProductId ?? null })),
    total: o.total,
    notes: o.notes,
  });
  if (!result.ok) return ok({ pushed: false, mode: result.mode, reason: result.reason, provider: provider.describe() });
  await db.update(orders).set({ supplierOrderRef: result.supplierOrderRef, updatedAt: new Date() }).where(eq(orders.id, id));
  await transitionOrder(id, "sent_to_supplier", user, `تم الإرسال إلى ${provider.name}`);
  await logAudit({ user, action: "supplier_push", entity: "order", entityId: id, details: { reference: o.reference, supplierOrderRef: result.supplierOrderRef }, req });
  return ok({ pushed: true, supplierOrderRef: result.supplierOrderRef });
});
