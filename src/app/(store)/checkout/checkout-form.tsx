"use client";

import { Loader2, Lock, ShoppingBag, Tag, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/store/cart-context";
import { ProductImage } from "@/components/store/product-image";
import { EmptyState } from "@/components/ui/empty";
import { api, ClientApiError, newIdempotencyKey } from "@/lib/client/api";
import { useQuote } from "@/lib/client/use-quote";
import { GOVERNORATES } from "@/lib/constants";
import { formatMoney } from "@/lib/format";

type Form = { name: string; phone: string; altPhone: string; governorate: string; city: string; area: string; address: string; notes: string; website: string };

type OrderResponse = {
  order: { reference: string; total: number; subtotal: number; discount: number; shippingFee: number; createdAt: string };
  payment: { methods: { label: string; details: string }[]; instructions: string; whatsappNumber: string };
};

export function CheckoutForm({ paymentMethods }: { paymentMethods: { label: string; details: string }[] }) {
  const router = useRouter();
  const { items, ready, clear } = useCart();
  const [form, setForm] = useState<Form>({ name: "", phone: "", altPhone: "", governorate: "", city: "", area: "", address: "", notes: "", website: "" });
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idemKey, setIdemKey] = useState(() => newIdempotencyKey());

  const { quote, loading } = useQuote(items, { couponCode: coupon, governorate: form.governorate || null });

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: "" }));
  };

  const validate = () => {
    const er: Record<string, string> = {};
    if (form.name.trim().length < 3) er.name = "الاسم يجب أن يكون 3 أحرف على الأقل";
    if (!/^01[0125]\d{8}$/.test(form.phone.trim())) er.phone = "رقم هاتف مصري صحيح مثل 01012345678";
    if (form.altPhone && !/^01[0125]\d{8}$/.test(form.altPhone.trim())) er.altPhone = "الرقم البديل غير صحيح";
    if (!form.governorate) er.governorate = "اختر المحافظة";
    if (form.city.trim().length < 2) er.city = "المدينة مطلوبة";
    if (form.area.trim().length < 2) er.area = "المنطقة مطلوبة";
    if (form.address.trim().length < 8) er.address = "اكتب العنوان بالتفصيل (8 أحرف على الأقل)";
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);
    if (!validate()) return;
    if (quote?.issues.length) {
      setSubmitError(quote.issues[0]);
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<OrderResponse>("/api/orders", {
        method: "POST",
        json: {
          idempotencyKey: idemKey,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          couponCode: quote?.coupon?.valid ? coupon : null,
          name: form.name,
          phone: form.phone.trim(),
          altPhone: form.altPhone.trim() || null,
          governorate: form.governorate,
          city: form.city,
          area: form.area,
          address: form.address,
          notes: form.notes || null,
          website: form.website,
        },
      });
      sessionStorage.setItem("rivo_last_order", JSON.stringify({ ...res, phone: form.phone.trim(), name: form.name }));
      clear();
      setIdemKey(newIdempotencyKey());
      router.replace("/order/success");
    } catch (err) {
      if (err instanceof ClientApiError && err.issues?.length) {
        const er: Record<string, string> = {};
        err.issues.forEach((i) => (er[i.path] = i.message));
        setErrors(er);
      }
      setSubmitError((err as Error).message);
      setSubmitting(false);
    }
  };

  if (!ready) return <div className="mx-auto max-w-7xl px-4 py-16"><div className="skeleton h-96 rounded-3xl" /></div>;
  if (!items.length && !submitting) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState icon={ShoppingBag} title="لا توجد منتجات لإتمام الطلب" action={<Link href="/products" className="btn-primary">تسوق الآن</Link>} />
      </div>
    );
  }

  const field = (k: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`f-${k}`} className="label">{label}</label>
      <input id={`f-${k}`} value={form[k]} onChange={set(k)} aria-invalid={Boolean(errors[k])} aria-describedby={errors[k] ? `e-${k}` : undefined} className={`input ${errors[k] ? "!border-rose-400/70" : ""}`} {...props} />
      {errors[k] && <p id={`e-${k}`} className="mt-1 text-xs text-rose-300">{errors[k]}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-3xl font-extrabold">إتمام الطلب</h1>
      <p className="mt-2 flex items-center gap-2 text-sm text-white/50"><Lock className="h-4 w-4" /> بياناتك محمية ولا تتم مشاركتها.</p>
      <form onSubmit={submit} noValidate className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <section className="glass rounded-3xl p-6">
            <h2 className="mb-5 text-lg font-bold">بيانات المستلم</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">{field("name", "الاسم بالكامل *", { autoComplete: "name", maxLength: 80 })}</div>
              {field("phone", "رقم الهاتف *", { inputMode: "tel", autoComplete: "tel", maxLength: 11, dir: "ltr", placeholder: "01xxxxxxxxx" })}
              {field("altPhone", "رقم بديل (اختياري)", { inputMode: "tel", maxLength: 11, dir: "ltr", placeholder: "01xxxxxxxxx" })}
            </div>
          </section>
          <section className="glass rounded-3xl p-6">
            <h2 className="mb-5 text-lg font-bold">عنوان التوصيل</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="f-governorate" className="label">المحافظة *</label>
                <select id="f-governorate" value={form.governorate} onChange={set("governorate")} className={`input ${errors.governorate ? "!border-rose-400/70" : ""}`}>
                  <option value="">اختر المحافظة</option>
                  {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                {errors.governorate && <p className="mt-1 text-xs text-rose-300">{errors.governorate}</p>}
              </div>
              {field("city", "المدينة *", { maxLength: 60, autoComplete: "address-level2" })}
              {field("area", "المنطقة *", { maxLength: 80 })}
              <div className="sm:col-span-3">{field("address", "العنوان التفصيلي *", { maxLength: 300, placeholder: "الشارع، رقم العقار، الدور، الشقة، علامة مميزة", autoComplete: "street-address" })}</div>
              <div className="sm:col-span-3">
                <label htmlFor="f-notes" className="label">ملاحظات الطلب (اختياري)</label>
                <textarea id="f-notes" value={form.notes} onChange={set("notes")} maxLength={500} rows={3} className="input resize-none" />
              </div>
              <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} className="hidden" aria-hidden />
            </div>
          </section>
          <section className="glass rounded-3xl p-6">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Wallet className="h-5 w-5 text-electric-400" /> طريقة الدفع</h2>
            <div className="rounded-2xl border border-electric-500/40 bg-electric-500/10 p-4">
              <p className="font-bold">تحويل مالي يدوي</p>
              <p className="mt-1 text-sm leading-7 text-white/65">بعد إنشاء الطلب ستحصل على رقم مرجعي وبيانات التحويل. حوّل المبلغ وأرسل صورة الإثبات عبر واتساب مع رقم الطلب. يتم تأكيد الدفع يدويًا من فريقنا.</p>
              {paymentMethods.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {paymentMethods.map((m) => <span key={m.label} className="rounded-full bg-white/10 px-3 py-1 text-xs">{m.label}</span>)}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="glass h-fit space-y-4 rounded-3xl p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">ملخص الطلب</h2>
          <ul className="max-h-64 space-y-3 overflow-y-auto">
            {(quote?.lines ?? []).map((l) => (
              <li key={l.productId} className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                  <ProductImage src={l.image} alt={l.name} sizes="56px" />
                  <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-electric-500 px-1 text-[10px] font-bold">{l.quantity}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm">{l.name}</p>
                  {l.issue && <p className="text-xs text-amber-300">{l.issue}</p>}
                </div>
                <span className="text-sm font-bold">{formatMoney(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input aria-label="كود الخصم" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="كود الخصم" maxLength={30} className="input !py-2.5 !pr-9 text-sm" dir="ltr" />
            </div>
            <button type="button" onClick={() => setCoupon(couponInput.trim() || null)} className="btn-ghost !px-4 !py-2.5 text-sm">تطبيق</button>
          </div>
          {quote?.coupon && <p className={`text-xs ${quote.coupon.valid ? "text-emerald-300" : "text-rose-300"}`}>{quote.coupon.message}</p>}
          <dl className="space-y-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-white/60">الإجمالي الفرعي</dt><dd>{formatMoney(quote?.subtotal)}</dd></div>
            {quote && quote.discount > 0 && <div className="flex justify-between text-emerald-300"><dt>الخصم</dt><dd>- {formatMoney(quote.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-white/60">الشحن</dt><dd>{!form.governorate ? <span className="text-white/40">اختر المحافظة</span> : quote?.shippingFee === 0 ? <span className="text-emerald-300">مجاني</span> : formatMoney(quote?.shippingFee)}</dd></div>
            <div className="flex justify-between border-t border-white/10 pt-3 text-lg font-extrabold"><dt>الإجمالي</dt><dd>{loading && !quote ? "…" : formatMoney(quote?.total)}</dd></div>
          </dl>
          {submitError && <p className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300" role="alert">{submitError}</p>}
          <button type="submit" disabled={submitting || !quote || loading} className="btn-primary w-full !py-3.5">
            {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> جارٍ إنشاء الطلب…</> : "تأكيد الطلب"}
          </button>
          <p className="text-center text-xs leading-6 text-white/40">بالضغط على تأكيد الطلب سيتم حجز المنتجات وإنشاء رقم مرجعي لطلبك. لن يُعتبر الطلب مدفوعًا إلا بعد مراجعة التحويل.</p>
        </aside>
      </form>
    </div>
  );
}
