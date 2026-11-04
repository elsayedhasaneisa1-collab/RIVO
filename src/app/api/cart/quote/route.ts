import { ok, parseBody, route } from "@/lib/server/api";
import { quoteCart, quoteSchema } from "@/lib/server/orders";
import { limitByIp } from "@/lib/server/security";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  await limitByIp(req, "quote", 120, 60);
  const body = await parseBody(req, quoteSchema);
  return ok(await quoteCart(body));
});
