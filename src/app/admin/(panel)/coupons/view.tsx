"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Empty, ErrorBox, Loading, Modal, PageHeader, Table, Toggle, useAdminData, useToast } from "@/components/admin/ui";
import { api } from "@/lib/client/api";
import { formatDate, formatMoney, toMajor } from "@/lib/format";

type Coupon = { id: number; code: string; type: "percent" | "fixed"; value: number; minSubtotal: number; maxUses: number | null; usedCount: number; startsAt: string | null; endsAt: string | null; isActive: boolean };
type Form = { code: string; type: "percent" | "fixed"; value: string; minSubtotal: string; maxUses: string; startsAt: string; endsAt: string; isActive: boolean };
const EMPTY: Form = { code: "", type: "percent", value: "", minSubtotal: "0", maxUses: "", startsAt: "", endsAt: "", isActive: true };

export function CouponsView() {
  const { data, error, loading, reload } = useAdminData<{ items: Coupon[] }>("/api/admin/coupons");
  const toast = useToast();
  const [edit, setEdit] = useState<{ id?: number; form: Form } | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    const f = edit.form;
    const json = { code: f.code, type: f.type, value: Number(f.value), minSubtotal: Number(f.minSubtotal) || 0, maxUses: f.maxUses ? Number(f.maxUses) : null, startsAt: f.startsAt || null, endsAt: f.endsAt || null, isActive: f.isActive };
    try {
      if (edit.id) await api(`/api/admin/coupons/${edit.id}`, { method: "PUT", json });
      else await api("/api/admin/coupons", { method: "POST", json });
      toast.show("تم الحفظ");
      setEdit(null);
      reload();
    } catch (err) {
      toast.show((err as Error).message, "err");
    }
  };

  const remove = async (c: Coupon) => {
    if (!confirm(`حذف الكوبون ${c.code}؟`)) return;
    try {
      await api(`/api/admin/coupons/${c.id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      toast.show((err as Error).message, "err");
    }
  };

  const setF = (patch: Partial<Form>) => edit && setEdit({ ...edit, form: { ...edit.form, ...patch } });

  return (
    <div>
      {toast.node}
      <PageHeader title="الخصومات والكوبونات" actions={<button onClick={() => setEdit({ form: EMPTY })} className="btn-primary !py-2.5 text-sm"><Plus className="h-4 w-4" /> كوبون جديد</button>} />
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (data.items.length === 0 ? (
        <div className="glass rounded-2xl"><Empty text="لا توجد كوبونات" /></div>
      ) : (
        <Table head={["الكود", "الخصم", "الحد الأدنى", "الاستخدام", "الصلاحية", "الحالة", ""]}>
          {data.items.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3 font-display font-bold" dir="ltr">{c.code}</td>
              <td className="px-4 py-3">{c.type === "percent" ? `${c.value}%` : formatMoney(c.value)}</td>
              <td className="px-4 py-3">{formatMoney(c.minSubtotal)}</td>
              <td className="px-4 py-3">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
              <td className="px-4 py-3 text-xs text-white/50">{c.endsAt ? `حتى ${formatDate(c.endsAt)}` : "بدون انتهاء"}</td>
              <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${c.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/50"}`}>{c.isActive ? "فعّال" : "متوقف"}</span></td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button
                    onClick={() => setEdit({ id: c.id, form: { code: c.code, type: c.type, value: String(c.type === "percent" ? c.value : toMajor(c.value)), minSubtotal: String(toMajor(c.minSubtotal)), maxUses: c.maxUses ? String(c.maxUses) : "", startsAt: c.startsAt ? c.startsAt.slice(0, 16) : "", endsAt: c.endsAt ? c.endsAt.slice(0, 16) : "", isActive: c.isActive } })}
                    className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10"
                    aria-label="تعديل"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(c)} className="grid h-8 w-8 place-items-center rounded-lg text-rose-300 hover:bg-rose-500/10" aria-label="حذف"><Trash2 className="h-4 w-4" /></button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ))}
      <Modal open={edit !== null} onClose={() => setEdit(null)} title={edit?.id ? "تعديل الكوبون" : "كوبون جديد"}>
        {edit && (
          <form onSubmit={save} className="space-y-4">
            <div><label className="label" htmlFor="cp-code">الكود *</label><input id="cp-code" required value={edit.form.code} onChange={(e) => setF({ code: e.target.value.toUpperCase() })} className="input" dir="ltr" maxLength={30} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="cp-type">النوع</label><select id="cp-type" value={edit.form.type} onChange={(e) => setF({ type: e.target.value as Form["type"] })} className="input"><option value="percent">نسبة %</option><option value="fixed">مبلغ ثابت</option></select></div>
              <div><label className="label" htmlFor="cp-val">القيمة *</label><input id="cp-val" required type="number" min={0} step="0.01" value={edit.form.value} onChange={(e) => setF({ value: e.target.value })} className="input" dir="ltr" /></div>
              <div><label className="label" htmlFor="cp-min">حد أدنى للطلب (ج.م)</label><input id="cp-min" type="number" min={0} value={edit.form.minSubtotal} onChange={(e) => setF({ minSubtotal: e.target.value })} className="input" dir="ltr" /></div>
              <div><label className="label" htmlFor="cp-max">أقصى استخدام</label><input id="cp-max" type="number" min={1} value={edit.form.maxUses} onChange={(e) => setF({ maxUses: e.target.value })} className="input" dir="ltr" placeholder="غير محدود" /></div>
              <div><label className="label" htmlFor="cp-s">يبدأ</label><input id="cp-s" type="datetime-local" value={edit.form.startsAt} onChange={(e) => setF({ startsAt: e.target.value })} className="input text-sm" /></div>
              <div><label className="label" htmlFor="cp-e">ينتهي</label><input id="cp-e" type="datetime-local" value={edit.form.endsAt} onChange={(e) => setF({ endsAt: e.target.value })} className="input text-sm" /></div>
            </div>
            <Toggle label="فعّال" checked={edit.form.isActive} onChange={(v) => setF({ isActive: v })} />
            <button className="btn-primary w-full">حفظ</button>
          </form>
        )}
      </Modal>
    </div>
  );
}
