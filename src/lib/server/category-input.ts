import { z } from "zod";
import { slugify } from "@/lib/format";
import { cleanText } from "./security";

export const categoryInputSchema = z.object({
  name: z.string().transform(cleanText).pipe(z.string().min(2, "اسم التصنيف مطلوب").max(60)),
  slug: z.string().trim().max(80).optional().nullable(),
  description: z.string().transform(cleanText).pipe(z.string().max(500)).default(""),
  image: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^\/api\/images\/[0-9a-f-]{36}$/i.test(v) || /^https:\/\/[^\s<>"']+$/i.test(v), "رابط صورة غير صالح")
    .optional()
    .nullable(),
  sortOrder: z.number().int().min(0).max(10000).default(0),
  isActive: z.boolean().default(true),
});

export function categoryValues(input: z.infer<typeof categoryInputSchema>) {
  return {
    name: input.name,
    slug: slugify(input.slug || input.name) || `c-${Date.now()}`,
    description: input.description,
    image: input.image || null,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  };
}
