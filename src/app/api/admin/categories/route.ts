import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { ok, parseBody, route } from "@/lib/server/api";
import { logAudit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { categoryInputSchema, categoryValues } from "@/lib/server/category-input";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireAdmin();
  const items = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      image: categories.image,
      sortOrder: categories.sortOrder,
      isActive: categories.isActive,
      productCount: sql<number>`(select count(*)::int from products p where p.category_id = ${categories.id})`,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  return ok({ items });
});

export const POST = route(async (req) => {
  const user = await requireAdmin("categories");
  const input = await parseBody(req, categoryInputSchema);
  const [c] = await db.insert(categories).values(categoryValues(input)).returning();
  await logAudit({ user, action: "create", entity: "category", entityId: c.id, details: { name: c.name }, req });
  return ok({ category: c }, { status: 201 });
});
