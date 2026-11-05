import { z } from "zod";
import { cleanText } from "./security";
import { slugify } from "@/lib/format";

const imageUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^\/api\/images\/[0-9a-f-]{36}$/i.test(v) || /^https:\/\/[^\s<>"']+$/i.test(v), "رابط صورة غير صالح");

export const productInputSchema = z.object({
  name: z.string().transform(cleanText).pipe(z.string().min(2, "اسم المنتج مطلوب").max(150)),
  slug: z.string().trim().max(100).optional().nullable(),
  description: z.string().transform(cleanText).pipe(z.string().max(10000)),
  images: z.array(imageUrl).max(10),
  categoryId: z.number().int().positive().nullable(),
  sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9-_.]{2,40}$/, "SKU يجب أن يحتوي على حروف إنجليزية وأرقام فقط"),
  stock: z.number().int().min(0).max(1_000_000),
  lowStockThreshold: z.number().int().min(0).max(10000).default(5),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  costPrice: z.number().min(0).max(10_000_000),
  pricingMode: z.enum(["margin", "fixed"]),
  marginPercent: z.number().min(0).max(1000).nullable().optional(),
  price: z.number().min(0).max(10_000_000).nullable().optional(),
  compareAtPrice: z.number().min(0).max(10_000_000).nullable().optional(),
  supplier: z.enum(["manual", "taager"]).default("manual"),
  supplierProductId: z.string().trim().max(100).nullable().optional(),
  supplierUrl: z.union([z.literal(""), z.string().trim().url().max(500)]).nullable().optional(),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export function computeProductValues(input: ProductInput) {
  const cost = Math.round(input.costPrice * 100);
  let price: number;
  if (input.pricingMode === "margin") {
    if (input.marginPercent == null) throw new z.ZodError([{ code: "custom", path: ["marginPercent"], message: "أدخل هامش الربح", input: null }]);
    price = Math.round(cost * (1 + input.marginPercent / 100));
  } else {
    if (input.price == null) throw new z.ZodError([{ code: "custom", path: ["price"], message: "أدخل سعر البيع", input: null }]);
    price = Math.round(input.price * 100);
  }
  if (price <= 0) throw new z.ZodError([{ code: "custom", path: ["price"], message: "سعر البيع يجب أن يكون أكبر من صفر", input: null }]);
  const marginPercent = cost > 0 ? Math.round(((price - cost) / cost) * 100) : null;
  const compare = input.compareAtPrice != null ? Math.round(input.compareAtPrice * 100) : null;
  const slug = slugify(input.slug || input.name) || `p-${Date.now()}`;
  return {
    name: input.name,
    slug,
    description: input.description,
    images: input.images,
    categoryId: input.categoryId,
    sku: input.sku,
    stock: input.stock,
    lowStockThreshold: input.lowStockThreshold,
    isActive: input.isActive,
    isFeatured: input.isFeatured,
    costPrice: cost,
    marginPercent,
    price,
    compareAtPrice: compare && compare > price ? compare : null,
    supplier: input.supplier,
    supplierProductId: input.supplierProductId || null,
    supplierUrl: input.supplierUrl || null,
  };
}
