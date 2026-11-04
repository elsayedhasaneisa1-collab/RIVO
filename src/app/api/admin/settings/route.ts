import { z } from "zod";
import { ApiError, ok, parseBody, route } from "@/lib/server/api";
import { logAudit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { listSuppliers } from "@/lib/server/integrations/supplier";
import {
  getAdminRegistrationEnabled,
  getSettings,
  saveAdminRegistrationEnabled,
  saveSettings,
  storeSettingsSchema,
} from "@/lib/server/settings";

export const dynamic = "force-dynamic";

const updateSchema = storeSettingsSchema.extend({
  adminRegistrationEnabled: z.boolean().optional(),
});

export const GET = route(async () => {
  const user = await requireAdmin("settings");
  return ok({
    settings: await getSettings(),
    suppliers: listSuppliers(),
    adminRegistrationEnabled: await getAdminRegistrationEnabled(),
    userRole: user.role,
  });
});

export const PUT = route(async (req) => {
  const user = await requireAdmin("settings");
  const body = await parseBody(req, updateSchema);
  const { adminRegistrationEnabled, ...storeValue } = body;

  if (adminRegistrationEnabled !== undefined && user.role !== "owner") {
    throw new ApiError(403, "المالك فقط يستطيع التحكم في إنشاء حسابات المديرين", "forbidden");
  }

  await saveSettings(storeValue);

  if (adminRegistrationEnabled !== undefined) {
    await saveAdminRegistrationEnabled(adminRegistrationEnabled);
  }

  await logAudit({
    user,
    action: "update",
    entity: "settings",
    details: {
      keys: Object.keys(storeValue),
      adminRegistrationEnabledChanged: adminRegistrationEnabled !== undefined,
    },
    req,
  });

  return ok({
    settings: storeValue,
    adminRegistrationEnabled: await getAdminRegistrationEnabled(),
  });
});
