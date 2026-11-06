import { randomBytes } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { coupons, customers, orderItems, orderStatusHistory, orders, products } from "@/db/schema";
import { canTransition, GOVERNORATES, type OrderStatus } from "@/lib/constants";
import { ApiError } from "./api";
import type { AdminUser } from "./auth";
import { cleanText } from "./security";
import { getSettings, shippingFeeFor, type StoreSettings } from "./settings";

const phoneRegex = /^01[0125]\d{8}$/;

const text = (min: number, max: number, msg: string) => z.string().transform(cleanText).pipe(z.string().min(min, msg).max(max, msg));

export const cartItemsSchema = z
  .array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(100) }))
  .min(1, "السلة فارغة")
  .max(50, "عدد المنتجات كبير جدًا");

export const quoteSchema = z.object({
  items: cartItemsSchema,
  couponCode: z.string().trim().max(40).optional().nullable(),
  governorate: z.string().max(40).optional().nullable(),
});

export const checkoutSchema = z.object({
  idempotencyKey: z.string().regex(/^[A-Za-z0-9-]{16,64}$/, "مفتاح الطلب غير صالح"),
  items: cartItemsSchema,
  couponCode: z.string().trim().max(40).optional().nullable(),
  name: text(3, 80, "الاسم يجب أن يكون بين 3 و80 حرفًا"),
  phone: z.string().trim().regex(phoneRegex, "رقم الهاتف غير صحيح، مثال: 01012345678"),
  altPhone: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((v) => !v || phoneRegex.test(v), "الرقم البديل غير صحيح"),
  governorate: z.enum(GOVERNORATES, { message: "اختر المحافظة" }),
  city: text(2, 60, "المدينة مطلوبة"),
  area: text(2, 80, "المنطقة مطلوبة"),
  address: text(8, 300, "العنوان التفصيلي يجب أن يكون 8 أحرف على الأقل"),
  notes: z.string().transform(cleanText).pipe(z.string().max(500, "الملاحظات طويلة جدًا")).optional().nullable(),
  whatsappUpdatesConsent: z.boolean().optional().default(false),
  website: z.string().max(0).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

type ProductRow = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  price: number;
  costPrice: number;
  stock: number;
  images: string[];
  isActive: boolean;
};

type CouponRow = typeof coupons.$inferSelect;

function normalizeItems(items: { productId: number; quantity: number }[]) {
  const map = new Map<number, number>();
  for (const it of items) map.set(it.productId, (map.get(it.productId) ?? 0) + it.quantity);
  return [...map.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

function evaluateCoupon(c: CouponRow | undefined, subtotal: number): { discount: number; valid: boolean; message: string } {
  if (!c || !c.isActive) return { discount: 0, valid: false, message: "كود الخصم غير صالح" };
  const now = Date.now();
  if (c.startsAt && c.startsAt.getTime() > now) return { discount: 0, valid: false, message: "كود الخصم لم يبدأ بعد" };
  if (c.endsAt && c.endsAt.getTime() < now) return { discount: 0, valid: false, message: "انتهت صلاحية كود الخصم" };
  if (c.maxUses != null && c.usedCount >= c.maxUses) return { discount: 0, valid: false, message: "تم استنفاد كود الخصم" };
  if (subtotal < c.minSubtotal) return { discount: 0, valid: false, message: `الحد الأدنى للطلب ${(c.minSubtotal / 100).toFixed(0)} ج.م` };
  const discount = c.type === "percent" ? Math.floor((subtotal * Math.min(c.value, 100)) / 100) : Math.min(c.value, subtotal);
  return { discount, valid: true, message: "تم تطبيق الخصم" };
}

function computeLines(items: { productId: number; quantity: number }[], rows: ProductRow[], s: StoreSettings) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const issues: string[] = [];
  const lines = items.map((it) => {
    const p = byId.get(it.productId);
    if (!p || !p.isActive) {
      issues.push("أحد المنتجات لم يعد متاحًا");
      return null;
    }
    const maxQ = Math.min(p.stock, s.maxQuantityPerItem);
    let issue: string | null = null;
    if (p.stock <= 0) issue = "نفد من المخزون";
    else if (it.quantity > maxQ) issue = `الحد الأقصى المتاح ${maxQ}`;
    if (issue) issues.push(`${p.name}: ${issue}`);
    return {
      productId: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      image: p.images?.[0] ?? null,
      unitPrice: p.price,
      unitCost: p.costPrice,
      quantity: it.quantity,
      lineTotal: p.price * it.quantity,
      stock: p.stock,
      maxQuantity: Math.max(0, maxQ),
      issue,
    };
  });
  return { lines: lines.filter((l): l is NonNullable<typeof l> => l !== null), issues };
}

export async function quoteCart(input: z.infer<typeof quoteSchema>) {
  const s = await getSettings();
  const items = normalizeItems(input.items);
  const rows = await db
    .select({ id: products.id, name: products.name, slug: products.slug, sku: products.sku, price: products.price, costPrice: products.costPrice, stock: products.stock, images: products.images, isActive: products.isActive })
    .from(products)
    .where(inArray(products.id, items.map((i) => i.productId)));
  const { lines, issues } = computeLines(items, rows, s);
  const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);
  let coupon: { code: string; valid: boolean; message: string } | null = null;
  let discount = 0;
  if (input.couponCode) {
    const code = input.couponCode.toUpperCase();
    const [c] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
    const ev = evaluateCoupon(c, subtotal);
    coupon = { code, valid: ev.valid, message: ev.message };
    discount = ev.discount;
  }
  const shippingFee = lines.length ? shippingFeeFor(s, input.governorate ?? undefined, subtotal - discount) : 0;
  return {
    lines: lines.map((l) => ({
      productId: l.productId,
      name: l.name,
      slug: l.slug,
      sku: l.sku,
      image: l.image,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      lineTotal: l.lineTotal,
      maxQuantity: l.maxQuantity,
      issue: l.issue,
    })),
    missing: items.filter((i) => !lines.some((l) => l.productId === i.productId)).map((i) => i.productId),
    subtotal,
    discount,
    shippingFee,
    total: subtotal - discount + shippingFee,
    coupon,
    issues,
  };
}

function generateReference() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let code = "";
  for (const b of bytes) code += alphabet[b % alphabet.length];
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `RV-${ymd}-${code}`;
}

export type CreatedOrder = { reference: string; total: number; subtotal: number; discount: number; shippingFee: number; createdAt: string; duplicate: boolean };

export async function createOrder(input: CheckoutInput, ipHash: string): Promise<CreatedOrder> {
  const s = await getSettings();
  const existing = await db.select().from(orders).where(eq(orders.idempotencyKey, input.idempotencyKey)).limit(1);
  if (existing[0]) {
    if (existing[0].phone !== input.phone) throw new ApiError(409, "تعذر إنشاء الطلب، أعد المحاولة", "idempotency_conflict");
    const o = existing[0];
    return { reference: o.reference, total: o.total, subtotal: o.subtotal, discount: o.discount, shippingFee: o.shippingFee, createdAt: o.createdAt.toISOString(), duplicate: true };
  }

  const items = normalizeItems(input.items);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.idempotencyKey}))`);
    const concurrentDuplicate = await tx.select().from(orders).where(eq(orders.idempotencyKey, input.idempotencyKey)).limit(1);
    if (concurrentDuplicate[0]) {
      const o = concurrentDuplicate[0];
      if (o.phone !== input.phone) throw new ApiError(409, "تعذر إنشاء الطلب، أعد المحاولة", "idempotency_conflict");
      return { reference: o.reference, total: o.total, subtotal: o.subtotal, discount: o.discount, shippingFee: o.shippingFee, createdAt: o.createdAt.toISOString(), duplicate: true };
    }
    const ids = items.map((i) => i.productId).sort((a, b) => a - b);
    const rows = await tx
      .select({ id: products.id, name: products.name, slug: products.slug, sku: products.sku, price: products.price, costPrice: products.costPrice, stock: products.stock, images: products.images, isActive: products.isActive })
      .from(products)
      .where(inArray(products.id, ids))
      .orderBy(products.id)
      .for("update");

    const { lines, issues } = computeLines(items, rows, s);
    if (issues.length || lines.length !== items.length) throw new ApiError(409, issues[0] ?? "بعض المنتجات غير متاحة", "stock");

    const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);
    const costTotal = lines.reduce((a, l) => a + l.unitCost * l.quantity, 0);

    let discount = 0;
    let couponCode: string | null = null;
    if (input.couponCode) {
      const code = input.couponCode.toUpperCase();
      const [c] = await tx.select().from(coupons).where(eq(coupons.code, code)).for("update").limit(1);
      const ev = evaluateCoupon(c, subtotal);
      if (!ev.valid) throw new ApiError(400, ev.message, "coupon");
      discount = ev.discount;
      couponCode = code;
      await tx.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(eq(coupons.id, c!.id));
    }

    const shippingFee = shippingFeeFor(s, input.governorate, subtotal - discount);
    const total = subtotal - discount + shippingFee;
    const profit = subtotal - discount - costTotal;

    for (const l of lines) {
      const res = await tx
        .update(products)
        .set({ stock: sql`${products.stock} - ${l.quantity}`, updatedAt: new Date() })
        .where(and(eq(products.id, l.productId), sql`${products.stock} >= ${l.quantity}`))
        .returning({ id: products.id });
      if (!res.length) throw new ApiError(409, `${l.name}: الكمية غير متوفرة`, "stock");
    }

    const [customer] = await tx
      .insert(customers)
      .values({ name: input.name, phone: input.phone, altPhone: input.altPhone || null, governorate: input.governorate, city: input.city, ordersCount: 1 })
      .onConflictDoUpdate({
        target: customers.phone,
        set: { name: input.name, altPhone: input.altPhone || null, governorate: input.governorate, city: input.city, ordersCount: sql`${customers.ordersCount} + 1`, updatedAt: new Date() },
      })
      .returning({ id: customers.id });

    let reference = generateReference();
    for (let i = 0; i < 3; i++) {
      const clash = await tx.select({ id: orders.id }).from(orders).where(eq(orders.reference, reference)).limit(1);
      if (!clash.length) break;
      reference = generateReference();
    }

    const [order] = await tx
      .insert(orders)
      .values({
        reference,
        idempotencyKey: input.idempotencyKey,
        customerId: customer.id,
        name: input.name,
        phone: input.phone,
        altPhone: input.altPhone || null,
        governorate: input.governorate,
        city: input.city,
        area: input.area,
        address: input.address,
        notes: input.notes || null,
        status: "pending",
        paymentExpiresAt: new Date(Date.now() + Math.max(1, Math.min(168, Number(process.env.ORDER_PAYMENT_TIMEOUT_HOURS) || 24)) * 3600_000),
        whatsappUpdatesConsent: input.whatsappUpdatesConsent,
        subtotal,
        discount,
        shippingFee,
        total,
        costTotal,
        profit,
        couponCode,
        ipHash,
      })
      .returning();

    await tx.insert(orderItems).values(
      lines.map((l) => ({
        orderId: order.id,
        productId: l.productId,
        name: l.name,
        sku: l.sku,
        image: l.image,
        unitPrice: l.unitPrice,
        unitCost: l.unitCost,
        quantity: l.quantity,
        lineTotal: l.lineTotal,
      })),
    );
    await tx.insert(orderStatusHistory).values({ orderId: order.id, fromStatus: null, toStatus: "pending", note: "تم إنشاء الطلب" });

    return { reference, total, subtotal, discount, shippingFee, createdAt: order.createdAt.toISOString(), duplicate: false };
  });
}

const SOLD_STATUSES: OrderStatus[] = ["paid", "sent_to_supplier", "shipping", "delivered"];

export async function transitionOrder(orderId: number, to: OrderStatus, actor: AdminUser | null, note?: string | null) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update").limit(1);
    if (!order) throw new ApiError(404, "الطلب غير موجود", "not_found");
    const from = order.status as OrderStatus;
    if (!canTransition(from, to)) throw new ApiError(422, "انتقال غير مسموح بين حالات الطلب", "invalid_transition");

    const now = new Date();
    const patch: Partial<typeof orders.$inferInsert> = { status: to, updatedAt: now };
    if (to === "paid") {
      if (!actor) throw new ApiError(403, "تأكيد الدفع يتم بواسطة الإدارة فقط", "forbidden");
      patch.paymentConfirmedAt = now;
      patch.paymentConfirmedBy = actor.id;
    }
    if (to === "delivered") patch.deliveredAt = now;

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const wasSold = SOLD_STATUSES.includes(from);
    const isSold = SOLD_STATUSES.includes(to);

    if (to === "cancelled" || to === "returned") {
      for (const it of items) {
        if (it.productId) {
          await tx
            .update(products)
            .set({ stock: sql`${products.stock} + ${it.quantity}`, ...(wasSold ? { soldCount: sql`greatest(${products.soldCount} - ${it.quantity}, 0)` } : {}), updatedAt: now })
            .where(eq(products.id, it.productId));
        }
      }
      if (order.couponCode && to === "cancelled") {
        await tx.update(coupons).set({ usedCount: sql`greatest(${coupons.usedCount} - 1, 0)` }).where(eq(coupons.code, order.couponCode));
      }
    } else if (!wasSold && isSold) {
      for (const it of items) {
        if (it.productId) await tx.update(products).set({ soldCount: sql`${products.soldCount} + ${it.quantity}` }).where(eq(products.id, it.productId));
      }
    }

    if (order.customerId) {
      if (to === "delivered") {
        await tx.update(customers).set({ totalSpent: sql`${customers.totalSpent} + ${order.total}`, updatedAt: now }).where(eq(customers.id, order.customerId));
      } else if (to === "returned" && from === "delivered") {
        await tx.update(customers).set({ totalSpent: sql`greatest(${customers.totalSpent} - ${order.total}, 0)`, updatedAt: now }).where(eq(customers.id, order.customerId));
      }
    }

    await tx.update(orders).set(patch).where(eq(orders.id, orderId));
    await tx.insert(orderStatusHistory).values({ orderId, fromStatus: from, toStatus: to, note: note ?? null, userId: actor?.id ?? null });
    return { from, to, reference: order.reference };
  });
}
