import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { ApiError, ok, parseBody, route } from "@/lib/server/api";
import { transitionOrder } from "@/lib/server/orders";
import { limitByIp } from "@/lib/server/security";

export const dynamic = "force-dynamic";

const schema = z.object({
  reference: z.string().trim().toUpperCase().regex(/^RV-\d{6}-[A-Z0-9]{6}$/),
  phone: z.string().trim().regex(/^01\d{9}$/),
});

export const POST = route(async (req) => {
  await limitByIp(req, "payment-sent", 10, 600);
  const { reference, phone } = await parseBody(req, schema);
  const [o] = await db.select({ id: orders.id, status: orders.status }).from(orders).where(and(eq(orders.reference, reference), eq(orders.phone, phone))).limit(1);
  if (!o) throw new ApiError(404, "الطلب غير موجود", "not_found");
  if (o.status !== "pending") return ok({ status: o.status });
  await transitionOrder(o.id, "payment_review", null, "أبلغ العميل بإرسال إثبات التحويل عبر واتساب");
  return ok({ status: "payment_review" });
});
