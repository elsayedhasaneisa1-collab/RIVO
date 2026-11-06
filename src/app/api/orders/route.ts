import { ApiError, ok, parseBody, route } from "@/lib/server/api";
import { checkoutSchema, createOrder } from "@/lib/server/orders";
import { getClientIp, limitByIp, rateLimit, sha256 } from "@/lib/server/security";
import { getSettings } from "@/lib/server/settings";
import { notifyTelegramNewOrder } from "@/lib/server/integrations/telegram";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  await limitByIp(req, "order", 10, 600);
  const body = await parseBody(req, checkoutSchema);
  if (body.website) throw new ApiError(400, "طلب غير صالح", "spam");
  await rateLimit(`order-phone:${sha256(body.phone)}`, 5, 3600);
  const order = await createOrder(body, sha256(getClientIp(req)));
  if (!order.duplicate) await notifyTelegramNewOrder({ reference: order.reference, name: body.name, phone: body.phone, total: order.total });
  const s = await getSettings();
  return ok(
    {
      order,
      payment: { methods: s.paymentMethods, instructions: s.paymentInstructions, whatsappNumber: s.whatsappNumber },
    },
    { status: order.duplicate ? 200 : 201 },
  );
});
