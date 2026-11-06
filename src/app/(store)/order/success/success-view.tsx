"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Copy, Info, Loader2, MessageCircle, PackageSearch } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty";
import { api } from "@/lib/client/api";
import { formatMoney } from "@/lib/format";

type Stored = {
  order: { reference: string; total: number; subtotal: number; discount: number; shippingFee: number; createdAt: string };
  payment: { methods: { label: string; details: string }[]; instructions: string; whatsappNumber: string };
  phone: string;
  name: string;
};

export function SuccessView() {
  const [data, setData] = useState<Stored | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [notified, setNotified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("rivo_last_order");
      if (raw) setData(JSON.parse(raw));
    } catch {
      setData(null);
    }
    setLoaded(true);
  }, []);

  if (!loaded) return <div className="mx-auto max-w-3xl px-4 py-16"><div className="skeleton h-96 rounded-3xl" /></div>;
  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState icon={PackageSearch} title="لا توجد بيانات طلب حديثة" description="يمكنك متابعة حالة أي طلب من صفحة تتبع الطلب." action={<Link href="/track" className="btn-primary">تتبع طلب</Link>} />
      </div>
    );
  }

  const { order, payment } = data;
  const message = `مرحبًا RIVO 👋\nأرسل إثبات التحويل للطلب رقم: ${order.reference}\nالاسم: ${data.name}\nالمبلغ: ${(order.total / 100).toFixed(2)} ج.م`;
  const waLink = payment.whatsappNumber ? `https://wa.me/${payment.whatsappNumber}?text=${encodeURIComponent(message)}` : null;

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  };

  const notify = async () => {
    setNotifying(true);
    setError(null);
    try {
      await api("/api/orders/payment-sent", { method: "POST", json: { reference: order.reference, phone: data.phone } });
      setNotified(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setNotifying(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }} className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        </motion.div>
        <h1 className="mt-6 text-3xl font-extrabold">تم إنشاء طلبك بنجاح</h1>
        <p className="mt-2 text-white/60">احتفظ برقم الطلب لاستخدامه في التحويل والمتابعة.</p>
      </motion.div>

      <div className="glass mt-8 rounded-3xl p-6 text-center">
        <p className="text-sm text-white/50">رقم الطلب المرجعي</p>
        <button onClick={() => copy(order.reference, "ref")} className="mt-2 inline-flex items-center gap-2 font-display text-2xl font-bold tracking-wider text-electric-300 sm:text-3xl" dir="ltr">
          {order.reference} <Copy className="h-5 w-5" />
        </button>
        {copied === "ref" && <p className="mt-1 text-xs text-emerald-300">تم النسخ</p>}
        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-5 text-sm">
          <div><p className="text-white/45">المنتجات</p><p className="font-bold">{formatMoney(order.subtotal - order.discount)}</p></div>
          <div><p className="text-white/45">الشحن</p><p className="font-bold">{formatMoney(order.shippingFee)}</p></div>
          <div><p className="text-white/45">المطلوب تحويله</p><p className="text-lg font-extrabold text-electric-300">{formatMoney(order.total)}</p></div>
        </div>
      </div>

      <div className="glass mt-4 rounded-3xl p-6">
        <h2 className="text-lg font-bold">خطوات الدفع</h2>
        <ol className="mt-4 space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-electric-500 text-xs font-bold">1</span>
            <div className="flex-1">
              <p className="font-semibold">حوّل مبلغ {formatMoney(order.total)} على إحدى الوسائل التالية:</p>
              {payment.methods.length === 0 ? (
                <p className="mt-2 text-white/55">سيتواصل معك فريقنا عبر واتساب لإرسال بيانات التحويل.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {payment.methods.map((m, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 p-3">
                      <div className="min-w-0">
                        <p className="text-xs text-white/50">{m.label}</p>
                        <p className="break-all font-bold" dir="ltr" style={{ textAlign: "right" }}>{m.details}</p>
                      </div>
                      <button onClick={() => copy(m.details, `m${i}`)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl hover:bg-white/10" aria-label={`نسخ ${m.label}`}>
                        {copied === `m${i}` ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {payment.instructions && <p className="mt-3 whitespace-pre-line leading-7 text-white/60">{payment.instructions}</p>}
            </div>
          </li>
          <li className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-electric-500 text-xs font-bold">2</span>
            <div className="flex-1">
              <p className="font-semibold">أرسل صورة إثبات التحويل عبر واتساب مع رقم الطلب.</p>
              {waLink ? (
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 font-bold text-white transition hover:brightness-110">
                  <MessageCircle className="h-5 w-5" /> إرسال الإثبات عبر واتساب
                </a>
              ) : (
                <p className="mt-2 text-white/55">سيتم التواصل معك على رقم هاتفك لاستلام الإثبات.</p>
              )}
            </div>
          </li>
          <li className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-electric-500 text-xs font-bold">3</span>
            <div className="flex-1">
              <p className="font-semibold">أبلغنا بعد إرسال الإثبات لمراجعة الدفع.</p>
              {notified ? (
                <p className="mt-2 text-emerald-300">تم استلام إشعارك، جارٍ مراجعة التحويل.</p>
              ) : (
                <button onClick={notify} disabled={notifying} className="btn-ghost mt-3">
                  {notifying && <Loader2 className="h-4 w-4 animate-spin" />} أرسلت إثبات التحويل
                </button>
              )}
              {error && <p className="mt-2 text-rose-300">{error}</p>}
            </div>
          </li>
        </ol>
        <p className="mt-5 flex items-start gap-2 rounded-2xl bg-amber-500/10 p-3 text-xs leading-6 text-amber-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" /> لن يُعتبر الطلب مدفوعًا إلا بعد مراجعة التحويل وتأكيده يدويًا من فريق RIVO. ستتغير حالة الطلب إلى “مدفوع” فور التأكيد.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href={`/track?ref=${order.reference}`} className="btn-primary">تتبع الطلب</Link>
        <Link href="/products" className="btn-ghost">متابعة التسوق</Link>
      </div>
    </div>
  );
}
