import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, reviews } from "@/db/schema";
import { ok, route } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin("reviews");
  const status = req.nextUrl.searchParams.get("status");
  const items = await db
    .select({ id: reviews.id, name: reviews.name, rating: reviews.rating, comment: reviews.comment, isApproved: reviews.isApproved, createdAt: reviews.createdAt, productName: products.name, productSlug: products.slug })
    .from(reviews)
    .innerJoin(products, eq(products.id, reviews.productId))
    .where(status === "pending" ? eq(reviews.isApproved, false) : status === "approved" ? eq(reviews.isApproved, true) : undefined)
    .orderBy(desc(reviews.createdAt))
    .limit(200);
  return ok({ items });
});
