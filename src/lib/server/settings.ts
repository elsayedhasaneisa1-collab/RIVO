import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { settings } from "@/db/schema";

export const storeSettingsSchema = z.object({
  storeName: z.string().trim().min(1).max(60),
  tagline: z.string().trim().max(120),
  announcement: z.string().trim().max(200),
  whatsappNumber: z.string().trim().regex(/^\d{0,15}$/, "رقم واتساب يجب أن يكون أرقامًا فقط بالصيغة الدولية"),
  supportPhone: z.string().trim().max(20),
  supportEmail: z.union([z.literal(""), z.string().trim().email()]),
  paymentMethods: z
    .array(z.object({ label: z.string().trim().min(1).max(60), details: z.string().trim().min(1).max(300) }))
    .max(10),
  paymentInstructions: z.string().trim().max(1000),
  defaultShippingFee: z.number().int().min(0).max(10_000_00),
  freeShippingThreshold: z.number().int().min(0).max(100_000_000).nullable(),
  governorateFees: z.record(z.string(), z.number().int().min(0).max(10_000_00)),
  socialFacebook: z.union([z.literal(""), z.string().trim().url()]),
  socialInstagram: z.union([z.literal(""), z.string().trim().url()]),
  socialTiktok: z.union([z.literal(""), z.string().trim().url()]),
  maxQuantityPerItem: z.number().int().min(1).max(100),
});

export type StoreSettings = z.infer<typeof storeSettingsSchema>;

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "RIVO",
  tagline: "Everything You Need.",
  announcement: "",
  whatsappNumber: "",
  supportPhone: "",
  supportEmail: "",
  paymentMethods: [],
  paymentInstructions: "",
  defaultShippingFee: 0,
  freeShippingThreshold: null,
  governorateFees: {},
  socialFacebook: "",
  socialInstagram: "",
  socialTiktok: "",
  maxQuantityPerItem: 10,
};

export async function getSettings(): Promise<StoreSettings> {
  try {
    const rows = await db.select().from(settings).where(eq(settings.key, "store")).limit(1);
    const value = (rows[0]?.value ?? {}) as Partial<StoreSettings>;
    return { ...DEFAULT_SETTINGS, ...value };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(value: StoreSettings) {
  await db
    .insert(settings)
    .values({ key: "store", value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

export function shippingFeeFor(s: StoreSettings, governorate: string | undefined, subtotal: number): number {
  if (s.freeShippingThreshold != null && s.freeShippingThreshold > 0 && subtotal >= s.freeShippingThreshold) return 0;
  if (governorate && typeof s.governorateFees[governorate] === "number") return s.governorateFees[governorate];
  return s.defaultShippingFee;
}

export function publicSettings(s: StoreSettings) {
  return {
    storeName: s.storeName,
    tagline: s.tagline,
    announcement: s.announcement,
    whatsappNumber: s.whatsappNumber,
    supportPhone: s.supportPhone,
    supportEmail: s.supportEmail,
    paymentMethods: s.paymentMethods,
    paymentInstructions: s.paymentInstructions,
    defaultShippingFee: s.defaultShippingFee,
    freeShippingThreshold: s.freeShippingThreshold,
    governorateFees: s.governorateFees,
    socialFacebook: s.socialFacebook,
    socialInstagram: s.socialInstagram,
    socialTiktok: s.socialTiktok,
    maxQuantityPerItem: s.maxQuantityPerItem,
  };
}
