"use client";

import { ArrowRight, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ClientApiError } from "@/lib/client/api";
import { formatMoney, toMajor } from "@/lib/format";
import { ImageInput } from "./image-input";
import { Card, ErrorBox, Loading, PageHeader, Toggle, useAdminData, useToast } from "./ui";

type F = {
  name: string; slug: string; description: string; images: string[]; categoryId: string; sku: string; stock: string; lowStockThreshold: string;
  isActive: boolean; isFeatured: boolean; costPrice: string; pricingMode: "margin" | "fixed"; marginPercent: string; price: string; compareAtPrice: string;
  supplier: "manual" | "taager"; supplierProductId: string; supplierUrl: string;
};

const EMPTY: F = { name: "", slug: "", description: "", images: [], categoryId: "", sku: "", stock: "0", lowStockThreshold: "5", isActive: true, isFeatured: false, costPrice: "", pricingMode: "fixed", marginPercent: "30", price: "", compareAtPrice: "", supplier: "manual", supplierProductId: "", supplierUrl: "" };

type Product = { name: string; slug: string; description: string; images: string[]; categoryId: number | null; sku: string; stock: number; lowStockThreshold: number; isActive: boolean; isFeatured: boolean; costPrice: number; marginPercent: number | null; price: number; compareAtPrice: number | null; supplier: string; supplierProductId: string | null; supplierUrl: string | null };

export function ProductForm({ id }: { id?: string }) {
  const router = useRouter();
  const toast = useToast();
  const cats = useAdminData<{ items: { id: number; name: string }[] }>("/api/admin/categories");
  const existing = useAdminData<{ product: Product }>(id ? `/api/admin/products/${id}` : null);
  const [f, setF] = useState<F>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const p = existing.data?.product;
    if (!p) return;
    setF({
      name: p.name, slug: p.slug, description: p.description, images: p.images, categoryId: p.categoryId ? String(p.categoryId) : "", sku: p.sku,
      stock: String(p.stock), lowStockThreshold: String(p.lowStockThreshold), isActive: p.isActive, isFeatured: p.isFeatured,
      costPrice: String(toMajor(p.costPrice)), pricingMode: "fixed", marginPercent: p.marginPercent != null ? String(p.marginPercent) : "30",
      price: String(toMajor(p.price)), compareAtPrice: p.compareAtPrice ? String(toMajor(p.compareAtPrice)) : "",
      supplier: p.supplier === "taager" ? "taager" : "manual", supplierProductId: p.supplierProductId ?? "", supplierUrl: p.supplierUrl ?? "",
    });
  }, [existing.data]);

  const set = <K extends keyof F>(k: K, v: F[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const cost = Number(f.costPrice) || 0;
  const previewPrice = f.pricingMode === "margin" ? Math.round(cost * (1 + (Number(f.marginPercent) || 0) / 100) * 100) / 100 : Number(f.price) || 0;
  const previewProfit = previewPrice - cost;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError(null);
    const body = {
      name: f.name, slug: f.slug || null, description: f.description, images: f.images, categoryId: f.categoryId ? Number(f.categoryId) : null, sku: f.sku,
      stock: Math.floor(Number(f.stock) || 0), lowStockThreshold: Math.floor(Number(f.lowStockThreshold) || 0), isActive: f.isActive, isFeatured: f.isFeatured,
      costPrice: Number(f.costPrice) || 0, pricingMode: f.pricingMode, marginPercent: f.pricingMode === "margin" ? Number(f.marginPercent) : null,
      price: f.pricingMode === "fixed" ? Number(f.price) || null : null, compareAtPrice: f.compareAtPrice ? Number(f.compareAtPrice) : null,
      supplier: f.supplier, supplierProductId: f.supplierProductId || null, supplierUrl: f.supplierUrl || null,
    };
    try {
      if (id) await api(`/api/admin/products/${id}`, { method: "PUT", json: body });
      else await api("/api/admin/products", { method: "POST", json: body });
      toast.show("تم حفظ المنتج");
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      if (err instanceof ClientApiError && err.issues) {
        const er: Record<string, string> = {};
        err.issues.forEach((i) => (er[i.path] = i.message));
        setErrors(er);
      }
      setFormError((err as Error).message);
      setSaving(false);
    }
  };

  if (id && existing.loading && !existing.data) return <Loading />;
  if (id && existing.error) return <ErrorBox message={existing.error} />;

  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-rose-300">{errors[k]}</p>;

  return (
    <form onSubmit={submit}>
      {toast.node}
      <Link href="/admin/products" className="mb-3 inline-flex items-center gap-1 text-sm text-white/55 hover:text-white"><ArrowRight className="h-4 w-4" /> المنتجات</Link>
      <PageHeader title={id ? "تعديل المنتج" : "منتج جديد"} actions={<button disabled={saving} className="btn-primary !py-2.5 text-sm">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ المنتج</button>} />
      {formError && <p className="mb-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300" role="alert">{formError}</p>}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="p-name">اسم المنتج *</label>
                <input id="p-name" required value={f.name} onChange={(e) => set("name", e.target.value)} className="input" maxLength={150} />
                {err("name")}
              </div>
              <div>
                <label className="label" htmlFor="p-desc">الوصف التفصيلي</label>
                <textarea id="p-desc" value={f.description} onChange={(e) => set("description", e.target.value)} rows={8} className="input resize-y" maxLength={10000} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="p-slug">الرابط المختصر (Slug)</label>
                  <input id="p-slug" value={f.slug} onChange={(e) => set("slug", e.target.value)} placeholder="يُولَّد تلقائيًا من الاسم" className="input" maxLength={100} />
                </div>
                <div>
                  <label className="label" htmlFor="p-sku">SKU *</label>
                  <input id="p-sku" required value={f.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} className="input" dir="ltr" maxLength={40} />
                  {err("sku")}
                </div>
              </div>
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 font-bold">الصور</h2>
            <ImageInput value={f.images} onChange={(v) => set("images", v)} />
            {err("images")}
          </Card>
          <Card>
            <h2 className="mb-4 font-bold">التسعير والأرباح</h2>
            <div className="mb-4 flex gap-2">
              {(["fixed", "margin"] as const).map((m) => (
                <button type="button" key={m} onClick={() => set("pricingMode", m)} className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${f.pricingMode === m ? "bg-electric-500" : "bg-white/5 text-white/60"}`}>
                  {m === "fixed" ? "سعر بيع نهائي" : "حساب بهامش ربح"}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="p-cost">تكلفة المورد (ج.م)</label>
                <input id="p-cost" type="number" min={0} step="0.01" value={f.costPrice} onChange={(e) => set("costPrice", e.target.value)} className="input" dir="ltr" />
              </div>
              {f.pricingMode === "margin" ? (
                <div>
                  <label className="label" htmlFor="p-margin">هامش الربح %</label>
                  <input id="p-margin" type="number" min={0} max={1000} step="1" value={f.marginPercent} onChange={(e) => set("marginPercent", e.target.value)} className="input" dir="ltr" />
                  {err("marginPercent")}
                </div>
              ) : (
                <div>
                  <label className="label" htmlFor="p-price">سعر البيع (ج.م) *</label>
                  <input id="p-price" type="number" min={0} step="0.01" value={f.price} onChange={(e) => set("price", e.target.value)} className="input" dir="ltr" />
                  {err("price")}
                </div>
              )}
              <div>
                <label className="label" htmlFor="p-compare">السعر قبل الخصم</label>
                <input id="p-compare" type="number" min={0} step="0.01" value={f.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value)} className="input" dir="ltr" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-white/5 p-3 text-center text-sm">
              <div><p className="text-xs text-white/45">سعر البيع</p><p className="font-bold">{formatMoney(Math.round(previewPrice * 100))}</p></div>
              <div><p className="text-xs text-white/45">ربح الوحدة</p><p className={`font-bold ${previewProfit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatMoney(Math.round(previewProfit * 100))}</p></div>
              <div><p className="text-xs text-white/45">الهامش</p><p className="font-bold">{cost > 0 ? `${Math.round((previewProfit / cost) * 100)}%` : "—"}</p></div>
            </div>
            <p className="mt-2 text-xs text-white/40">معاينة فقط — يتم حساب السعر النهائي والربح وحفظهما داخل الخادم.</p>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <div className="space-y-4">
              <Toggle label="عرض المنتج في المتجر" checked={f.isActive} onChange={(v) => set("isActive", v)} />
              <Toggle label="منتج مميز (يظهر في الرئيسية)" checked={f.isFeatured} onChange={(v) => set("isFeatured", v)} />
            </div>
          </Card>
          <Card>
            <label className="label" htmlFor="p-cat">التصنيف</label>
            <select id="p-cat" value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)} className="input">
              <option value="">بدون تصنيف</option>
              {cats.data?.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Card>
          <Card>
            <h2 className="mb-4 font-bold">المخزون</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="p-stock">الكمية المتاحة</label>
                <input id="p-stock" type="number" min={0} value={f.stock} onChange={(e) => set("stock", e.target.value)} className="input" dir="ltr" />
              </div>
              <div>
                <label className="label" htmlFor="p-low">حد التنبيه</label>
                <input id="p-low" type="number" min={0} value={f.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value)} className="input" dir="ltr" />
              </div>
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 font-bold">المورد</h2>
            <div className="space-y-3">
              <select value={f.supplier} onChange={(e) => set("supplier", e.target.value as F["supplier"])} className="input" aria-label="المورد">
                <option value="manual">يدوي</option>
                <option value="taager">Taager</option>
              </select>
              <input value={f.supplierProductId} onChange={(e) => set("supplierProductId", e.target.value)} placeholder="كود المنتج لدى المورد" className="input text-sm" dir="ltr" maxLength={100} aria-label="كود المنتج لدى المورد" />
              <input value={f.supplierUrl} onChange={(e) => set("supplierUrl", e.target.value)} placeholder="رابط المنتج لدى المورد https://" className="input text-sm" dir="ltr" maxLength={500} aria-label="رابط المنتج لدى المورد" />
              {err("supplierUrl")}
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
