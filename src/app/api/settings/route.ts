import { ok, route } from "@/lib/server/api";
import { getSettings, publicSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

export const GET = route(async () => ok({ settings: publicSettings(await getSettings()) }));
