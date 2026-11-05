import { ok, parseBody, route } from "@/lib/server/api";
import { logAudit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { listSuppliers } from "@/lib/server/integrations/supplier";
import { getSettings, saveSettings, storeSettingsSchema } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireAdmin("settings");
  return ok({ settings: await getSettings(), suppliers: listSuppliers() });
});

export const PUT = route(async (req) => {
  const user = await requireAdmin("settings");
  const value = await parseBody(req, storeSettingsSchema);
  await saveSettings(value);
  await logAudit({ user, action: "update", entity: "settings", details: { keys: Object.keys(value) }, req });
  return ok({ settings: value });
});
