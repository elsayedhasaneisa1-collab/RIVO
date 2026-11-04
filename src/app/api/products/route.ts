import { route, ok } from "@/lib/server/api";
import { listProducts } from "@/lib/server/catalog";
import { limitByIp } from "@/lib/server/security";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await limitByIp(req, "products", 240, 60);
  const sp = req.nextUrl.searchParams;
  const num = (k: string) => {
    const v = sp.get(k);
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const data = await listProducts({
    q: sp.get("q")?.slice(0, 100) ?? undefined,
    category: sp.get("category")?.slice(0, 100) ?? undefined,
    min: num("min"),
    max: num("max"),
    inStock: sp.get("inStock") === "1",
    sale: sp.get("sale") === "1",
    sort: sp.get("sort") ?? undefined,
    page: num("page"),
  });
  return ok(data);
});
