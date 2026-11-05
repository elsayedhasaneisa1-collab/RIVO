"use client";

import { ArrowRight, Copy, Loader2, MapPin, MessageCircle, Phone, Send, Truck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Card, ErrorBox, Loading, Modal, StatusBadge, useAdminData, useToast } from "@/components/admin/ui";
import { ProductImage } from "@/components/store/product-image";
import { api } from "@/lib/client/api";
import { STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";

type Detail = {
  order: {
    id: number; reference: string; name: string; phone: string; altPhone: string | null; governorate: string; city: string; area: string; address: string; notes: string | null;
    status: OrderStatus; subtotal: number; discount: number; shippingFee: number; total: number; costTotal: number | null; profit: number | null; couponCode: string | null;
    paymentConfirmedAt: string | null; deliveredAt: string | null; supplierOrderRef: string | null; trackingNumber: string | null; adminNotes: string | null; createdAt: string;
  };
  items: { id: number; name: string; sku: string; image: string | null; unitPrice: number; unitCost: number | null; quantity: number; lineTotal: number; productId: number | null }[];
  history: { id: number; fromStatus: string | null; toStatus: string; note: string | null; createdAt: string; userName: string | null }[];
  allowedTransitions: OrderStatus[];
};

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  payment_review: "نقل لمراجعة الدفع",
  paid: "تأكيد استلام التحويل",
  pending: "إرجاع لانتظار الدفع",
  sent_to_supplier: "تم الإرسال للمورد",
  shipping: "بدء الشحن",
  delivered: "تم التسليم والتحصيل",
  cancelled: "إلغاء الطلب",
  returned: "تسجيل كمرتجع",
};

export function OrderDetail({ id }: { id: string }) {
  const { data, error, loading, reload } = useAdminData<Detail>(`/api/admin/orders/${id}`);
  const toast = useToast();
  const [target, setTarget] = useState<OrderStatus | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<{ supplierOrderRef: string; trackingNumber: string; adminNotes: string } | null>(null);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;
  const o = data.order;
  const m = meta ?? { supplierOrderRef: o.supplierOrderRef ?? "", trackingNumber: o.trackingNumber ?? "", adminNotes: o.adminNotes ?? "" };

  const transition = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await api(`/api/admin/orders/${o.id}`, { method: "PATCH", json: { status: target, note: note || null } });
      toast.show(`تم تحديث الحالة إلى: ${STATUS_LABELS[target]}`);
      setTarget(null);
      setNote("");
      reload();
    } catch (e) {
      toast.show((e as Error).message, "err");
    } finally {
      setBusy(false);
    }
  };

  const saveMeta = async () => {
    setBusy(true);
    try {
      await api(`/api/admin/orders/${o.id}`, { method: "PATCH", json: m });
      toast.show("تم حفظ البيانات");
      setMeta(null);
      reload();
    } catch (e) {
      toast.show((e as Error).message, "err");
    } finally {
      setBusy(false);
    }
  };

  const pushSupplier = async () => {
    setBusy(true);
    try {
      const r = await api<{ pushed: boolean; reason?: string; provider?: { message: string } }>(`/api/admin/orders/${o.id}/supplier`, { method: "POST" });
      if (r.pushed) {
        toast.show("تم إرسال الطلب للمورد");
        reload();
      } else toast.show(r.provider?.message ?? r.reason ?? "التنفيذ اليدوي مفعّل", "err");
    } catch (e) {
      toast.show((e as Error).message, "err");
    } finally {
      setBusy(false);
    }
  };

  const shippingText = `${o.name}\n${o.phone}${o.altPhone ? ` / ${o.altPhone}` : ""}\n${o.governorate} - ${o.city} - ${o.area}\n${o.address}\n${data.items.map((i) => `${i.sku} x${i.quantity}`).join("\n")}\nالإجمالي: ${(o.total / 100).toFixed(2)}`;
  const wa = `https://wa.me/2${o.phone}?text=${encodeURIComponent(`مرحبًا ${o.name}، بخصوص طلبك رقم ${o.reference} من RIVO.`)}`;

  return (
    <div className="space-y-6">
      {toast.node}
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-white/55 hover:text-white"><ArrowRight className="h-4 w-4" /> كل الطلبات</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl" dir="ltr">{o.reference}</h1>
          <p className="mt-1 text-sm text-white/50">{formatDate(o.createdAt)}</p>
        </div>
        <StatusBadge status={o.status} />
      </div>

      {data.allowedTransitions.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-bold text-white/70">تحديث حالة الطلب</h2>
          <div className="flex flex-wrap gap-2">
            {data.allowedTransitions.map((s) => (
              <button
                key={s}
                onClick={() => setTarget(s)}
                className={s === "cancelled" || s === "returned" ? "btn-ghost !border-rose-500/30 !py-2 text-sm text-rose-300" : s === "pending" ? "btn-ghost !py-2 text-sm" : "btn-primary !py-2 text-sm"}
              >
                {ACTION_LABEL[s] ?? STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          {o.status === "payment_review" && <p className="mt-3 text-xs text-sky-200">تحقق من وصول التحويل فعليًا في حسابك قبل التأكيد. فتح العميل لواتساب لا يعني أن الدفع تم.</p>}
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 font-bold">المنتجات</h2>
            <ul className="divide-y divide-white/5">
              {data.items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 py-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl"><ProductImage src={it.image} alt={it.name} sizes="56px" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-semibold">{it.name}</p>
                    <p className="text-xs text-white/45" dir="ltr" style={{ textAlign: "right" }}>{it.sku} · {formatMoney(it.unitPrice)} × {it.quantity}{it.unitCost !== null ? ` · تكلفة ${formatMoney(it.unitCost)}` : ""}</p>
                  </div>
                  <span className="font-bold">{formatMoney(it.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-white/10 pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-white/55">الإجمالي الفرعي</dt><dd>{formatMoney(o.subtotal)}</dd></div>
              {o.discount > 0 && <div className="flex justify-between text-emerald-300"><dt>الخصم {o.couponCode && <span dir="ltr">({o.couponCode})</span>}</dt><dd>- {formatMoney(o.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-white/55">الشحن</dt><dd>{formatMoney(o.shippingFee)}</dd></div>
              <div className="flex justify-between text-base font-extrabold"><dt>الإجمالي</dt><dd>{formatMoney(o.total)}</dd></div>
              {o.profit !== null && (
                <>
                  <div className="flex justify-between pt-2 text-white/55"><dt>تكلفة المورد</dt><dd>{formatMoney(o.costTotal)}</dd></div>
                  <div className="flex justify-between font-bold text-emerald-300">
                    <dt>صافي الربح {o.status === "delivered" && o.paymentConfirmedAt ? "(محقق)" : o.status === "cancelled" || o.status === "returned" ? "(ملغي)" : "(غير محقق بعد)"}</dt>
                    <dd>{formatMoney(o.profit)}</dd>
                  </div>
                </>
              )}
            </dl>
          </Card>
          <Card>
            <h2 className="mb-4 flex items-center gap-2 font-bold"><Truck className="h-4 w-4 text-electric-400" /> المورد والشحن</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="sref">رقم الطلب لدى المورد</label>
                <input id="sref" value={m.supplierOrderRef} onChange={(e) => setMeta({ ...m, supplierOrderRef: e.target.value })} className="input text-sm" dir="ltr" maxLength={100} />
              </div>
              <div>
                <label className="label" htmlFor="track">رقم الشحنة</label>
                <input id="track" value={m.trackingNumber} onChange={(e) => setMeta({ ...m, trackingNumber: e.target.value })} className="input text-sm" dir="ltr" maxLength={100} />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="anotes">ملاحظات داخلية</label>
                <textarea id="anotes" value={m.adminNotes} onChange={(e) => setMeta({ ...m, adminNotes: e.target.value })} rows={3} maxLength={2000} className="input resize-none text-sm" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={saveMeta} disabled={busy || !meta} className="btn-primary !py-2 text-sm">حفظ</button>
              <button onClick={() => navigator.clipboard.writeText(shippingText).then(() => toast.show("تم نسخ بيانات الشحن"))} className="btn-ghost !py-2 text-sm"><Copy className="h-4 w-4" /> نسخ بيانات الشحن للمورد</button>
              {o.status === "paid" && <button onClick={pushSupplier} disabled={busy} className="btn-ghost !py-2 text-sm"><Send className="h-4 w-4" /> إرسال عبر ربط Taager</button>}
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 font-bold">بيانات العميل</h2>
            <p className="font-semibold">{o.name}</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-white/70" dir="ltr" style={{ justifyContent: "flex-end" }}>{o.phone}{o.altPhone ? ` / ${o.altPhone}` : ""} <Phone className="h-4 w-4" /></p>
            <p className="mt-2 flex items-start gap-2 text-sm leading-7 text-white/70"><MapPin className="mt-1 h-4 w-4 shrink-0" /> {o.governorate}، {o.city}، {o.area} — {o.address}</p>
            {o.notes && <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-white/70">ملاحظات العميل: {o.notes}</p>}
            <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#25D366]/15 px-4 py-2 text-sm font-semibold text-[#5be08f] hover:bg-[#25D366]/25"><MessageCircle className="h-4 w-4" /> مراسلة عبر واتساب</a>
            <div className="mt-4 space-y-1 border-t border-white/10 pt-3 text-xs text-white/50">
              <p>تأكيد الدفع: {o.paymentConfirmedAt ? formatDate(o.paymentConfirmedAt) : "لم يتم"}</p>
              <p>التسليم: {o.deliveredAt ? formatDate(o.deliveredAt) : "لم يتم"}</p>
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 font-bold">سجل الحالات</h2>
            <ol className="space-y-4">
              {data.history.map((h) => (
                <li key={h.id} className="relative border-r-2 border-electric-500/40 pr-4">
                  <span className="absolute -right-[7px] top-1 h-3 w-3 rounded-full bg-electric-500" />
                  <p className="text-sm font-semibold">{STATUS_LABELS[h.toStatus as OrderStatus] ?? h.toStatus}</p>
                  <p className="text-xs text-white/45">{formatDate(h.createdAt)} · {h.userName ?? "النظام / العميل"}</p>
                  {h.note && <p className="mt-1 text-xs text-white/60">{h.note}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <Modal open={target !== null} onClose={() => setTarget(null)} title={target ? ACTION_LABEL[target] ?? STATUS_LABELS[target] : ""}>
        <p className="text-sm leading-7 text-white/65">
          {target === "paid" && "سيتم تسجيل الطلب كمدفوع باسمك. تأكد من وصول المبلغ كاملًا."}
          {target === "cancelled" && "سيتم إلغاء الطلب وإعادة الكميات إلى المخزون."}
          {target === "returned" && "سيتم تسجيل الطلب كمرتجع وإعادة الكميات إلى المخزون واستبعاد الربح."}
          {target === "delivered" && "سيتم احتساب ربح هذا الطلب كربح محقق."}
          {target && !["paid", "cancelled", "returned", "delivered"].includes(target) && `تغيير الحالة إلى “${STATUS_LABELS[target]}”.`}
        </p>
        <label htmlFor="tnote" className="label mt-4">ملاحظة (اختياري)</label>
        <textarea id="tnote" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} className="input resize-none text-sm" />
        <div className="mt-5 flex gap-2">
          <button onClick={transition} disabled={busy} className="btn-primary flex-1">{busy && <Loader2 className="h-4 w-4 animate-spin" />} تأكيد</button>
          <button onClick={() => setTarget(null)} className="btn-ghost">إلغاء</button>
        </div>
      </Modal>
    </div>
  );
}
