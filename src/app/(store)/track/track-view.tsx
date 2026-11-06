"use client";

import { motion } from "framer-motion";
import { Check, Loader2, PackageSearch, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ProductImage } from "@/components/store/product-image";
import { api } from "@/lib/client/api";
import { STATUS_LABELS, STATUS_STYLES, type OrderStatus } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";

type Tracked = {
  reference: string;
  status: OrderStatus;
  governorate: string;
  city: string;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  trackingNumber: string | null;
  createdAt: string;
  items: { name: string; quantity: number; unitPrice: number; lineTotal: number; image: string | null }[];
  history: { toStatus: OrderStatus; createdAt: string }[];
};

const FLOW: OrderStatus[] = ["pending", "payment_review", "paid", "sent_to_supplier", "shipping", "delivered"];

export function TrackView() {
  const sp = useSearchParams();
  const [reference, setReference] = useState(sp.get("ref") ?? "");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Tracked | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ order: Tracked }>("/api/orders/track", { method: "POST", json: { reference: reference.trim().toUpperCase(), phone: phone.trim() } });
      setOrder(res.order);
    } catch (err) {
      setOrder(null);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const terminal = order && (order.status === "cancelled" || order.status === "returned");
  const currentIdx = order ? FLOW.indexOf(order.status) : -1;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-electric-500/15 text-electric-300"><PackageSearch className="h-8 w-8" /></div>
        <h1 className="mt-5 text-3xl font-extrabold">تتبع طلبك</h1>
        <p className="mt-2 text-white/55">أدخل رقم الطلب ورقم الهاتف المستخدم عند الطلب.</p>
      </div>
      <form onSubmit={submit} className="glass mt-8 grid gap-4 rounded-3xl p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="t-ref" className="label">رقم الطلب</label>
          <input id="t-ref" required value={reference} onChange={(e) => setReference(e.target.value)} placeholder="RV-XXXXXX-XXXXXX" className="input" dir="ltr" maxLength={20} />
        </div>
        <div>
          <label htmlFor="t-phone" className="label">رقم الهاتف</label>
          <input id="t-phone" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" inputMode="tel" className="input" dir="ltr" maxLength={11} />
        </div>
        <button disabled={loading} className="btn-primary h-[46px]">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "تتبع"}</button>
      </form>
      {error && <p className="mt-4 rounded-2xl bg-rose-500/10 p-4 text-center text-sm text-rose-300" role="alert">{error}</p>}

      {order && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-4">
          <div className="glass rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-white/45">رقم الطلب</p>
                <p className="font-display text-xl font-bold" dir="ltr">{order.reference}</p>
              </div>
              <span className={`rounded-full px-3 py-1.5 text-sm font-bold ring-1 ${STATUS_STYLES[order.status]}`}>{STATUS_LABELS[order.status]}</span>
            </div>
            <p className="mt-2 text-xs text-white/45">تاريخ الطلب: {formatDate(order.createdAt)} — {order.governorate}، {order.city}</p>
            {order.trackingNumber && <p className="mt-2 text-sm">رقم الشحنة: <span dir="ltr" className="font-bold">{order.trackingNumber}</span></p>}

            {terminal ? (
              <div className="mt-6 flex items-center gap-3 rounded-2xl bg-rose-500/10 p-4 text-rose-200">
                <X className="h-5 w-5" /> {order.status === "cancelled" ? "تم إلغاء هذا الطلب." : "تم تسجيل هذا الطلب كمرتجع."}
              </div>
            ) : (
              <ol className="mt-8 space-y-0">
                {FLOW.map((s, i) => {
                  const done = i <= currentIdx;
                  const when = order.history.find((h) => h.toStatus === s)?.createdAt;
                  return (
                    <li key={s} className="relative flex gap-4 pb-6 last:pb-0">
                      {i < FLOW.length - 1 && <span className={`absolute right-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${i < currentIdx ? "bg-electric-500" : "bg-white/10"}`} />}
                      <span className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ${done ? "bg-electric-500" : "bg-white/10"}`}>
                        {done ? <Check className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-white/30" />}
                      </span>
                      <div className="pt-1">
                        <p className={`font-semibold ${done ? "" : "text-white/40"}`}>{STATUS_LABELS[s]}</p>
                        {when && <p className="text-xs text-white/45">{formatDate(when)}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
          <div className="glass rounded-3xl p-6">
            <h2 className="mb-4 font-bold">المنتجات</h2>
            <ul className="space-y-3">
              {order.items.map((it, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl"><ProductImage src={it.image} alt={it.name} sizes="56px" /></div>
                  <p className="flex-1 text-sm">{it.name} <span className="text-white/45">× {it.quantity}</span></p>
                  <span className="text-sm font-bold">{formatMoney(it.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-white/10 pt-4 text-sm">
              {order.discount > 0 && <div className="flex justify-between text-emerald-300"><dt>الخصم</dt><dd>- {formatMoney(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-white/55">الشحن</dt><dd>{formatMoney(order.shippingFee)}</dd></div>
              <div className="flex justify-between text-base font-extrabold"><dt>الإجمالي</dt><dd>{formatMoney(order.total)}</dd></div>
            </dl>
          </div>
        </motion.div>
      )}
    </div>
  );
}
