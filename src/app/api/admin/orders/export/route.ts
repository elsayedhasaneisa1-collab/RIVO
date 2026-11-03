import { desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { route } from "@/lib/server/api";
import { logAudit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { orderFilters } from "@/lib/server/order-filters";

export const dynamic = "force-dynamic";

function cell(v: unknown) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export const GET = route(async (req) => {
  const user = await requireAdmin("orders");
  const rows = await db.select().from(orders).where(orderFilters(req.nextUrl.searchParams)).orderBy(desc(orders.createdAt)).limit(5000);
  const items = rows.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, rows.map((r) => r.id))) : [];
  const byOrder = new Map<number, typeof items>();
  for (const it of items) byOrder.set(it.orderId, [...(byOrder.get(it.orderId) ?? []), it]);
  const header = ["Reference", "Date", "Status", "Name", "Phone", "Alt Phone", "Governorate", "City", "Area", "Address", "Items", "Subtotal", "Discount", "Shipping", "Total", "Supplier Ref", "Notes"];
  const lines = rows.map((o) =>
    [
      o.reference,
      o.createdAt.toISOString(),
      STATUS_LABELS[o.status as OrderStatus] ?? o.status,
      o.name,
      o.phone,
      o.altPhone,
      o.governorate,
      o.city,
      o.area,
      o.address,
      (byOrder.get(o.id) ?? []).map((i) => `${i.sku} x${i.quantity}`).join(" | "),
      o.subtotal / 100,
      o.discount / 100,
      o.shippingFee / 100,
      o.total / 100,
      o.supplierOrderRef,
      o.notes,
    ]
      .map(cell)
      .join(","),
  );
  await logAudit({ user, action: "export", entity: "order", details: { count: rows.length }, req });
  return new Response("\uFEFF" + [header.map(cell).join(","), ...lines].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rivo-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
