"use client";

import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, ErrorBox, Loading, PageHeader, useAdminData, useToast } from "@/components/admin/ui";
import { api } from "@/lib/client/api";
import { GOVERNORATES } from "@/lib/constants";
import { toMajor, toMinor } from "@/lib/format";

type S = {
  storeName: string; tagline: string; announcement: string; whatsappNumber: string; supportPhone: string; supportEmail: string;
  paymentMethods: { label: string; details: string }[]; paymentInstructions: string; defaultShippingFee: number; freeShippingThreshold: number | null;
  governorateFees: Record<string, number>; socialFacebook: string; socialInstagram: string; socialTiktok: string; maxQuantityPerItem: number;
};
type Supplier = { id: string; name: string; mode: "api" | "manual"; message: string };

export function SettingsView() {
  const { data, error, loading, reload } = useAdminData<{ settings: S; suppliers: Supplier[] }>("/api/admin/settings");
  const [s, setS] = useState<S | null>(null);
  const [fees, setFees] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (data) {
      setS(data.settings);
      setFees(Object.fromEntries(Object.entries(data.settings.governorateFees).map(([k, v]) => [k, String(toMajor(v))])));
    }
  }, [data]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!s) return null;

  const set = <K extends keyof S>(k: K, v: S[K]) => setS({ ...s, [k]: v });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const governorateFees: Record<string, number> = {};
    for (const [k, v] of Object.entries(fees)) if (v !== "" && !Number.isNaN(Number(v))) governorateFees[k] = toMinor(Number(v));
    try {
      await api("/api/admin/settings", { method: "PUT", json: { ...s, governorateFees } });
      toast.show("تم حفظ الإعدادات");
      reload();
    } catch (err) {
      toast.show((err as Error).message, "err");
    } finally {
      setSaving(false);
    }
  };

  const text = (k: keyof S, label: string, opts: { dir?: "ltr"; placeholder?: string; max?: number } = {}) => (
    <div>
      <label className="label" htmlFor={`s-${k}`}>{label}</label>
      <input id={`s-${k}`} value={String(s[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} className="input" dir={opts.dir} placeholder={opts.placeholder} maxLength={opts.max ?? 200} />
    </div>
  );

  return (
    <form onSubmit={save}>
      {toast.node}
      <PageHeader title="إعدادات المتجر" actions={<button disabled={saving} className="btn-primary !py-2.5 text-sm">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ</button>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-bold">الهوية والتواصل</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {text("storeName", "اسم المتجر", { max: 60 })}
            {text("tagline", "الشعار", { dir: "ltr", max: 120 })}
            <div className="sm:col-span-2">{text("announcement", "شريط الإعلان العلوي (اتركه فارغًا للإخفاء)", { max: 200 })}</div>
            {text("whatsappNumber", "رقم واتساب (دولي بدون +)", { dir: "ltr", placeholder: "201xxxxxxxxx", max: 15 })}
            {text("supportPhone", "هاتف الدعم", { dir: "ltr", max: 20 })}
            <div className="sm:col-span-2">{text("supportEmail", "بريد الدعم", { dir: "ltr", max: 120 })}</div>
            {text("socialFacebook", "فيسبوك", { dir: "ltr", placeholder: "https://" })}
            {text("socialInstagram", "إنستجرام", { dir: "ltr", placeholder: "https://" })}
            {text("socialTiktok", "تيك توك", { dir: "ltr", placeholder: "https://" })}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 font-bold">الدفع بالتحويل اليدوي</h2>
          <div className="space-y-3">
            {s.paymentMethods.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.5fr_auto] gap-2">
                <input value={m.label} onChange={(e) => set("paymentMethods", s.paymentMethods.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="الوسيلة (InstaPay، فودافون كاش…)" className="input text-sm" maxLength={60} aria-label="اسم الوسيلة" />
                <input value={m.details} onChange={(e) => set("paymentMethods", s.paymentMethods.map((x, j) => (j === i ? { ...x, details: e.target.value } : x)))} placeholder="رقم الحساب / المحفظة" className="input text-sm" dir="ltr" maxLength={300} aria-label="بيانات الحساب" />
                <button type="button" onClick={() => set("paymentMethods", s.paymentMethods.filter((_, j) => j !== i))} className="grid h-11 w-11 place-items-center rounded-xl text-rose-300 hover:bg-rose-500/10" aria-label="حذف"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {s.paymentMethods.length < 10 && <button type="button" onClick={() => set("paymentMethods", [...s.paymentMethods, { label: "", details: "" }])} className="btn-ghost !py-2 text-sm"><Plus className="h-4 w-4" /> إضافة وسيلة دفع</button>}
            <div>
              <label className="label" htmlFor="s-pi">تعليمات الدفع للعميل</label>
              <textarea id="s-pi" value={s.paymentInstructions} onChange={(e) => set("paymentInstructions", e.target.value)} rows={4} maxLength={1000} className="input resize-none text-sm" />
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 font-bold">الشحن</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="label" htmlFor="s-ship">رسوم الشحن الافتراضية</label><input id="s-ship" type="number" min={0} value={toMajor(s.defaultShippingFee)} onChange={(e) => set("defaultShippingFee", toMinor(Number(e.target.value) || 0))} className="input" dir="ltr" /></div>
            <div><label className="label" htmlFor="s-free">شحن مجاني فوق</label><input id="s-free" type="number" min={0} value={s.freeShippingThreshold != null ? toMajor(s.freeShippingThreshold) : ""} onChange={(e) => set("freeShippingThreshold", e.target.value ? toMinor(Number(e.target.value)) : null)} className="input" dir="ltr" placeholder="معطّل" /></div>
            <div><label className="label" htmlFor="s-maxq">أقصى كمية لكل منتج</label><input id="s-maxq" type="number" min={1} max={100} value={s.maxQuantityPerItem} onChange={(e) => set("maxQuantityPerItem", Math.max(1, Math.min(100, Number(e.target.value) || 1)))} className="input" dir="ltr" /></div>
          </div>
          <p className="mb-2 mt-5 text-sm font-semibold text-white/70">رسوم مخصصة لكل محافظة (اتركها فارغة لاستخدام الافتراضي)</p>
          <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {GOVERNORATES.map((g) => (
              <label key={g} className="flex items-center gap-2 rounded-xl bg-white/5 px-2 py-1.5 text-xs">
                <span className="flex-1 truncate">{g}</span>
                <input type="number" min={0} value={fees[g] ?? ""} onChange={(e) => setFees({ ...fees, [g]: e.target.value })} className="w-20 rounded-lg border border-white/10 bg-transparent px-2 py-1 text-xs outline-none focus:border-electric-500" dir="ltr" aria-label={`رسوم ${g}`} />
              </label>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 font-bold">تكامل الموردين</h2>
          <ul className="space-y-3">
            {data?.suppliers.map((sp) => (
              <li key={sp.id} className="rounded-xl bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{sp.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${sp.mode === "api" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{sp.mode === "api" ? "ربط API مفعّل" : "إدارة يدوية"}</span>
                </div>
                <p className="mt-2 text-xs leading-6 text-white/55">{sp.message}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-6 text-white/40">لا يتم استخدام أي واجهات غير رسمية. لتفعيل الربط بعد الحصول على وصول API رسمي من Taager اضبط متغيرات البيئة TAAGER_API_BASE_URL و TAAGER_ORDERS_PATH و TAAGER_API_KEY من إعدادات الاستضافة.</p>
        </Card>
      </div>
    </form>
  );
}
