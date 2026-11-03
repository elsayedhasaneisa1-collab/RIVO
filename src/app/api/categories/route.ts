import { ok, route } from "@/lib/server/api";
import { getCategoriesWithCounts } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export const GET = route(async () => ok({ categories: await getCategoriesWithCounts() }));
