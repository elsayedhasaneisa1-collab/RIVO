"use client";

import { Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Empty, ErrorBox, Loading, Modal, PageHeader, Pagination, Table, useAdminData, useToast } from "@/components/admin/ui";
import { ProductImage } from "@/components/store/product-image";
import { api } from "@/lib/client/api";
import { formatMoney } from "@/lib/format";

type Row = { id: number; name: string; slug: string; sku: string; images: string[]; price: number; compareAtPrice: number | null; costPrice: number; marginPercent: number | null; unitProfit: number; stock: number; isActive: boolean; isFeatured: boolean; soldCount: number; supplier: string; categoryName: string | null };
type Res = { items: Row[]; total: number; page: number; pages: number };

export function ProductsView() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [del, setDel] = useState<Row | null>(null);
  const toast = useToast();
  const { data, error, loading, reload } = useAdminData<Res>(`/api/admin/products?q=${encodeURIComponent(query)}&status=${status}&page=${page}`);

  const remove = async () => {
    if (!del) return;
    try {
      await api(`/api/admin/products/${del.id}`, { method: "DELETE" });
      toast.show("تم حذف المنتج");
      setDel(null);
      reload();
    } catch (e) {
      toast.show((e as Error).message, "err");
    }
  };

  return (
    <div>
      {toast.node}
      <PageHeader title="المنتجات" description={data ? `${data.total} منتج` : undefined} actions={<Link href="/admin/products/new" className="btn-primary !py-2.5 text-sm"><Plus className="h-4 w-4" /> منتج جديد</Link>} />
      <form onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); setPage(1); }} className="mb-4 grid gap-2 sm:grid-cols-[1fr_200px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو SKU" className="input !pr-9 text-sm" aria-label="بحث" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input text-sm" aria-label="الحالة">
          <option value="">كل المنتجات</option>
          <option value="active">المعروضة</option>
          <option value="hidden">المخفية</option>
          <option value="featured">المميزة</option>
          <option value="out">نفدت</option>
        </select>
        <button className="btn-primary !py-2.5 text-sm">بحث</button>
      </form>
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (data.items.length === 0 ? (
        <div className="glass rounded-2xl"><Empty text="لا توجد منتجات. ابدأ بإضافة أول منتج." /></div>
      ) : (
        <>
          <Table head={["المنتج", "التصنيف", "التكلفة", "السعر", "ربح الوحدة", "المخزون", "المبيعات", "الحالة", ""]}>
            {data.items.map((p) => (
              <tr key={p.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg"><ProductImage src={p.images[0]} alt={p.name} sizes="44px" /></div>
                    <div className="min-w-0">
                      <p className="line-clamp-1 font-semibold">{p.isFeatured && <Star className="ml-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-400" />}{p.name}</p>
                      <p className="text-xs text-white/45" dir="ltr" style={{ textAlign: "right" }}>{p.sku}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-white/65">{p.categoryName ?? "—"}</td>
                <td className="px-4 py-3 text-white/65">{formatMoney(p.costPrice)}</td>
                <td className="px-4 py-3 font-bold">{formatMoney(p.price)}{p.compareAtPrice && <span className="block text-xs font-normal text-white/40 line-through">{formatMoney(p.compareAtPrice)}</span>}</td>
                <td className={`px-4 py-3 ${p.unitProfit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatMoney(p.unitProfit)}{p.marginPercent !== null && <span className="block text-xs text-white/40">{p.marginPercent}%</span>}</td>
                <td className={`px-4 py-3 font-bold ${p.stock <= 0 ? "text-rose-300" : ""}`}>{p.stock}</td>
                <td className="px-4 py-3">{p.soldCount}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${p.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/50"}`}>{p.isActive ? "معروض" : "مخفي"}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Link href={`/admin/products/${p.id}`} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10" aria-label="تعديل"><Pencil className="h-4 w-4" /></Link>
                    <button onClick={() => setDel(p)} className="grid h-8 w-8 place-items-center rounded-lg text-rose-300 hover:bg-rose-500/10" aria-label="حذف"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          <Pagination page={data.page} pages={data.pages} onChange={setPage} />
        </>
      ))}
      <Modal open={del !== null} onClose={() => setDel(null)} title="حذف المنتج">
        <p className="text-sm text-white/65">هل أنت متأكد من حذف “{del?.name}”؟ لن يؤثر ذلك على الطلبات السابقة. يُفضّل إخفاء المنتج بدلًا من حذفه.</p>
        <div className="mt-5 flex gap-2">
          <button onClick={remove} className="btn-primary flex-1 !bg-rose-500">حذف نهائي</button>
          <button onClick={() => setDel(null)} className="btn-ghost">إلغاء</button>
        </div>
      </Modal>
    </div>
  );
}
