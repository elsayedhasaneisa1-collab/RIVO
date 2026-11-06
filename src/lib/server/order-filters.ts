import { and, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import { orders } from "@/db/schema";
import { ORDER_STATUSES } from "@/lib/constants";

export function orderFilters(sp: URLSearchParams) {
  const conds: (SQL | undefined)[] = [];
  const status = sp.get("status");
  if (status && (ORDER_STATUSES as readonly string[]).includes(status)) conds.push(eq(orders.status, status));
  const q = sp.get("q")?.trim().slice(0, 60);
  if (q) conds.push(or(ilike(orders.reference, `%${q}%`), ilike(orders.phone, `%${q}%`), ilike(orders.name, `%${q}%`)));
  const from = sp.get("from");
  const to = sp.get("to");
  if (from && !Number.isNaN(Date.parse(from))) conds.push(gte(orders.createdAt, new Date(from)));
  if (to && !Number.isNaN(Date.parse(to))) conds.push(lte(orders.createdAt, new Date(new Date(to).getTime() + 86400_000)));
  return conds.length ? and(...conds) : undefined;
}
