import { ApiError, ok, route } from "@/lib/server/api";
import { getProductBySlug, getProductReviews, getRelatedProducts } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export const GET = route(async (_req, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  const product = await getProductBySlug(decodeURIComponent(slug).slice(0, 200));
  if (!product) throw new ApiError(404, "المنتج غير موجود", "not_found");
  const [reviews, related] = await Promise.all([getProductReviews(product.id), getRelatedProducts(product)]);
  return ok({ product, reviews, related });
});
