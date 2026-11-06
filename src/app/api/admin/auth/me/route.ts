import { ROLE_PERMISSIONS } from "@/lib/constants";
import { ok, route } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireAdmin();
  return ok({ user, permissions: ROLE_PERMISSIONS[user.role] });
});
