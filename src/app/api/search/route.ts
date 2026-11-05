import { ok, route } from "@/lib/server/api";
import { searchSuggestions } from "@/lib/server/catalog";
import { limitByIp } from "@/lib/server/security";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await limitByIp(req, "search", 120, 60);
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return ok({ products: [], categories: [] });
  return ok(await searchSuggestions(q));
});
