import { ok, route } from "@/lib/server/api";
import { destroySession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const POST = route(async () => {
  await destroySession();
  return ok({ ok: true });
});
