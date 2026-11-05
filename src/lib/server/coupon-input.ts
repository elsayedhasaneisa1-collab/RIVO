import { z } from "zod";

export const couponInputSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "الكود: حروف إنجليزية وأرقام فقط (3-30)"),
    type: z.enum(["percent", "fixed"]),
    value: z.number().positive("قيمة الخصم مطلوبة").max(1_000_000),
    minSubtotal: z.number().min(0).max(10_000_000).default(0),
    maxUses: z.number().int().positive().nullable().optional(),
    startsAt: z.string().nullable().optional(),
    endsAt: z.string().nullable().optional(),
    isActive: z.boolean().default(true),
  })
  .refine((v) => v.type !== "percent" || v.value <= 100, { message: "النسبة يجب ألا تتجاوز 100%", path: ["value"] });

export function couponValues(input: z.infer<typeof couponInputSchema>) {
  const date = (s?: string | null) => (s && !Number.isNaN(Date.parse(s)) ? new Date(s) : null);
  return {
    code: input.code,
    type: input.type,
    value: input.type === "percent" ? Math.round(input.value) : Math.round(input.value * 100),
    minSubtotal: Math.round(input.minSubtotal * 100),
    maxUses: input.maxUses ?? null,
    startsAt: date(input.startsAt),
    endsAt: date(input.endsAt),
    isActive: input.isActive,
  };
}
