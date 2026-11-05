"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ImageInput } from "@/components/admin/image-input";
import { Empty, ErrorBox, Loading, Modal, PageHeader, Table, Toggle, useAdminData, useToast } from "@/components/admin/ui";
import { api } from "@/lib/client/api";

type Cat = { id: number; name: string; slug: string; description: string; image: string | null; sortOrder: number; isActive: boolean; productCount: number };
const EMPTY = { name: "", slug: "", description: "", image: "", sortOrder: 0, isActive: true };

export function CategoriesView() {
  const { data, error, loading, reload } = useAdminData<{ items: Cat[] }>("/api/admin/categories");
  const toast = useToast();
  const [edit, setEdit] = useState<{ id?: number; form: typeof EMPTY } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setBusy(true);
    try {
      const json = { ...edit.form, image: edit.form.image || null, slug: edit.form.slug || null };
      if (edit.id) await api(`/api/admin/categories/${edit.id}`, { method: "PUT", json });
      else await api("/api/admin/categories", { method: "POST", json });
      toast.show("تم الحفظ");
      setEdit(null);
      reload();
    } catch (err) {
      toast.show((err as Error).message, "err");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: Cat) => {
    if (!confirm(`حذف التصنيف “${c.name}”؟ ستبقى منتجاته بدون تصنيف.`)) return;
    try {
      await api(`/api/admin/categories/${c.id}`, { method: "DELETE" });
      toast.show("تم الحذف");
      reload();
    } catch (err) {
      toast.show((err as Error).message, "err");
    }
  };

  return (
    <div>
      {toast.node}
      <PageHeader title="التصنيفات" actions={<button onClick={() => setEdit({ form: EMPTY })} className="btn-primary !py-2.5 text-sm"><Plus className="h-4 w-4" /> تصنيف جديد</button>} />
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (data.items.length === 0 ? (
        <div className="glass rounded-2xl"><Empty text="لا توجد تصنيفات بعد" /></div>
      ) : (
        <Table head={["الاسم", "الرابط", "المنتجات", "الترتيب", "الحالة", ""]}>
          {data.items.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3 font-semibold">{c.name}</td>
              <td className="px-4 py-3 text-xs text-white/50">{c.slug}</td>
              <td className="px-4 py-3">{c.productCount}</td>
              <td className="px-4 py-3">{c.sortOrder}</td>
              <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${c.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/50"}`}>{c.isActive ? "ظاهر" : "مخفي"}</span></td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button onClick={() => setEdit({ id: c.id, form: { name: c.name, slug: c.slug, description: c.description, image: c.image ?? "", sortOrder: c.sortOrder, isActive: c.isActive } })} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10" aria-label="تعديل"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(c)} className="grid h-8 w-8 place-items-center rounded-lg text-rose-300 hover:bg-rose-500/10" aria-label="حذف"><Trash2 className="h-4 w-4" /></button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ))}
      <Modal open={edit !== null} onClose={() => setEdit(null)} title={edit?.id ? "تعديل التصنيف" : "تصنيف جديد"}>
        {edit && (
          <form onSubmit={save} className="space-y-4">
            <div><label className="label" htmlFor="c-name">الاسم *</label><input id="c-name" required value={edit.form.name} onChange={(e) => setEdit({ ...edit, form: { ...edit.form, name: e.target.value } })} className="input" maxLength={60} /></div>
            <div><label className="label" htmlFor="c-slug">الرابط المختصر</label><input id="c-slug" value={edit.form.slug} onChange={(e) => setEdit({ ...edit, form: { ...edit.form, slug: e.target.value } })} className="input" placeholder="تلقائي" maxLength={80} /></div>
            <div><label className="label" htmlFor="c-desc">الوصف</label><textarea id="c-desc" value={edit.form.description} onChange={(e) => setEdit({ ...edit, form: { ...edit.form, description: e.target.value } })} className="input resize-none" rows={2} maxLength={500} /></div>
            <div><span className="label">الصورة</span><ImageInput max={1} value={edit.form.image ? [edit.form.image] : []} onChange={(v) => setEdit({ ...edit, form: { ...edit.form, image: v[0] ?? "" } })} /></div>
            <div><label className="label" htmlFor="c-sort">الترتيب</label><input id="c-sort" type="number" min={0} value={edit.form.sortOrder} onChange={(e) => setEdit({ ...edit, form: { ...edit.form, sortOrder: Number(e.target.value) || 0 } })} className="input" dir="ltr" /></div>
            <Toggle label="ظاهر في المتجر" checked={edit.form.isActive} onChange={(v) => setEdit({ ...edit, form: { ...edit.form, isActive: v } })} />
            <button disabled={busy} className="btn-primary w-full">حفظ</button>
          </form>
        )}
      </Modal>
    </div>
  );
}
