"use client";

import { AlertTriangle, Boxes, PackageX, Search, Warehouse } from "lucide-react";
import { useState } from "react";
import { Empty, ErrorBox, Loading, Modal, PageHeader, StatCard, Table, useAdminData, useToast } from "@/components/admin/ui";
import { ProductImage } from "@/components/store/product-image";
import { api } from "@/lib/client/api";

type Item = { id: number; name: string; sku: string; images: string[]; stock: number; lowStockThreshold: number; soldCount: number; isActive: boolean };
type Res = { items: Item[]; summary: { total: number; low: number; out: number; units: number } };

export function InventoryView() {
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const { data, error, loading, reload } = useAdminData<Res>(`/api/admin/inventory?filter=${filter}&q=${encodeURIComponent(query)}`);
  const [adj, setAdj] = useState<{ item: Item; mode: "set" | "adjust"; value: string; reason: string } | null>(null);
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adj) return;
    try {
      await api("/api/admin/inventory", { method: "PATCH", json: { productId: adj.item.id, mode: adj.mode, value: Math.floor(Number(adj.value) || 0), reason: adj.reason || undefined } });
      toast.show("تم تحديث المخزون");
      setAdj(null);
      reload();
    } catch (err) {
      toast.show((err as Error).message, "err");
    }
  };

  return (
    <div>
      {toast.node}
      <PageHeader title="إدارة المخزون" description="الكميات تُخصم تلقائيًا عند إنشاء الطلب وتعود عند الإلغاء أو الإرجاع" />
      {data && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="إجمالي المنتجات" value={data.summary.total} icon={Boxes} />
          <StatCard label="إجمالي القطع" value={data.summary.units} icon={Warehouse} />
          <StatCard label="مخزون منخفض" value={data.summary.low} icon={AlertTriangle} />
          <StatCard label="نفد المخزون" value={data.summary.out} icon={PackageX} />
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        {[["", "الكل"], ["low", "منخفض"], ["out", "نفد"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === v ? "bg-electric-500" : "glass text-white/65"}`}>{l}</button>
        ))}
        <form onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); }} className="relative mr-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو SKU" className="input !py-2 !pr-9 text-sm" aria-label="بحث" />
        </form>
      </div>
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (data.items.length === 0 ? (
        <div className="glass rounded-2xl"><Empty text="لا توجد منتجات" /></div>
      ) : (
        <Table head={["المنتج", "SKU", "المتاح", "حد التنبيه", "المبيع", ""]}>
          {data.items.map((i) => (
            <tr key={i.id}>
              <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg"><ProductImage src={i.images[0]} alt={i.name} sizes="40px" /></div><span className="line-clamp-1 font-semibold">{i.name}</span></div></td>
              <td className="px-4 py-3 text-xs text-white/50" dir="ltr">{i.sku}</td>
              <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${i.stock <= 0 ? "bg-rose-500/20 text-rose-300" : i.stock <= i.lowStockThreshold ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>{i.stock}</span></td>
              <td className="px-4 py-3 text-white/60">{i.lowStockThreshold}</td>
              <td className="px-4 py-3">{i.soldCount}</td>
              <td className="px-4 py-3"><button onClick={() => setAdj({ item: i, mode: "adjust", value: "", reason: "" })} className="btn-ghost !px-3 !py-1.5 text-xs">تعديل الكمية</button></td>
            </tr>
          ))}
        </Table>
      ))}
      <Modal open={adj !== null} onClose={() => setAdj(null)} title={`تعديل مخزون: ${adj?.item.name ?? ""}`}>
        {adj && (
          <form onSubmit={save} className="space-y-4">
            <p className="text-sm text-white/60">الكمية الحالية: <b>{adj.item.stock}</b></p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setAdj({ ...adj, mode: "adjust" })} className={`flex-1 rounded-xl py-2 text-sm ${adj.mode === "adjust" ? "bg-electric-500" : "bg-white/5"}`}>إضافة / خصم</button>
              <button type="button" onClick={() => setAdj({ ...adj, mode: "set" })} className={`flex-1 rounded-xl py-2 text-sm ${adj.mode === "set" ? "bg-electric-500" : "bg-white/5"}`}>تعيين قيمة</button>
            </div>
            <div><label className="label" htmlFor="adj-v">{adj.mode === "adjust" ? "الكمية (استخدم سالب للخصم)" : "الكمية الجديدة"}</label><input id="adj-v" required type="number" value={adj.value} onChange={(e) => setAdj({ ...adj, value: e.target.value })} className="input" dir="ltr" /></div>
            <div><label className="label" htmlFor="adj-r">السبب</label><input id="adj-r" value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} className="input" maxLength={200} placeholder="توريد جديد، جرد، تالف…" /></div>
            <button className="btn-primary w-full">حفظ</button>
          </form>
        )}
      </Modal>
    </div>
  );
}
