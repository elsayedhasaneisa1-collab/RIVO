import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { products, reviews } from "@/db/schema";
import { ApiError, ok, parseBody, route } from "@/lib/server/api";
import { cleanText, limitByIp } from "@/lib/server/security";

export const dynamic = "force-dynamic";

const schema = z.object({
  productId: z.number().int().positive(),
  name: z.string().transform(cleanText).pipe(z.string().min(2, "الاسم مطلوب").max(60)),
  rating: z.number().int().min(1).max(5),
  comment: z.string().transform(cleanText).pipe(z.string().min(3, "اكتب تعليقًا قصيرًا").max(1000)),
});

export const POST = route(async (req) => {
  await limitByIp(req, "review", 5, 3600);
  const body = await parseBody(req, schema);
  const [p] = await db.select({ id: products.id }).from(products).where(and(eq(products.id, body.productId), eq(products.isActive, true))).limit(1);
  if (!p) throw new ApiError(404, "المنتج غير موجود", "not_found");
  await db.insert(reviews).values({ ...body, isApproved: false });
  return ok({ submitted: true }, { status: 201 });
});
