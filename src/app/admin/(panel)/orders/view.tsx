"use client";

import { Download, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Empty, ErrorBox, Loading, PageHeader, Pagination, StatusBadge, Table, useAdminData } from "@/components/admin/ui";
import { ORDER_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";

type Row = { id: number; reference: string; name: string; phone: string; governorate: string; status: string; total: number; profit: number | null; createdAt: string; itemsCount: number };
type Res = { items: Row[]; total: number; page: number; pages: number; statusCounts: Record<string, number> };

export function OrdersView() {
  const sp = useSearchParams();
  const [status, setStatus] = useState(sp.get("status") ?? "");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (query) p.set("q", query);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p;
  }, [status, query, from, to]);

  const { data, error, loading, reload } = useAdminData<Res>(`/api/admin/orders?${params.toString()}&page=${page}`);
  const all = data ? Object.values(data.statusCounts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div>
      <PageHeader
        title="الطلبات"
        description="إدارة الطلبات ومراجعة التحويلات وتحديث الحالات"
        actions={<a href={`/api/admin/orders/export?${params.toString()}`} className="btn-ghost !py-2.5 text-sm"><Download className="h-4 w-4" /> تصدير CSV</a>}
      />
      <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <button onClick={() => { setStatus(""); setPage(1); }} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${!status ? "bg-electric-500" : "glass text-white/65"}`}>الكل ({all})</button>
        {ORDER_STATUSES.map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${status === s ? "bg-electric-500" : "glass text-white/65"}`}>
            {STATUS_LABELS[s]} ({data?.statusCounts[s] ?? 0})
          </button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); setPage(1); }} className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث برقم الطلب أو الهاتف أو الاسم" className="input !pr-9 text-sm" aria-label="بحث" />
        </div>
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="input text-sm" aria-label="من تاريخ" />
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="input text-sm" aria-label="إلى تاريخ" />
        <button className="btn-primary !py-2.5 text-sm">بحث</button>
      </form>
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (data.items.length === 0 ? (
        <div className="glass rounded-2xl"><Empty text="لا توجد طلبات مطابقة" /></div>
      ) : (
        <>
          <Table head={["رقم الطلب", "العميل", "المحافظة", "القطع", "الإجمالي", ...(data.items[0]?.profit !== null ? ["الربح"] : []), "الحالة", "التاريخ"]}>
            {data.items.map((o) => (
              <tr key={o.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-display font-bold text-electric-300 hover:underline" dir="ltr">{o.reference}</Link></td>
                <td className="px-4 py-3"><p className="font-semibold">{o.name}</p><p className="text-xs text-white/45" dir="ltr">{o.phone}</p></td>
                <td className="px-4 py-3 text-white/70">{o.governorate}</td>
                <td className="px-4 py-3">{o.itemsCount}</td>
                <td className="px-4 py-3 font-bold">{formatMoney(o.total)}</td>
                {o.profit !== null && <td className="px-4 py-3 text-emerald-300">{formatMoney(o.profit)}</td>}
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-white/45">{formatDate(o.createdAt)}</td>
              </tr>
            ))}
          </Table>
          <Pagination page={data.page} pages={data.pages} onChange={setPage} />
        </>
      ))}
    </div>
  );
}
