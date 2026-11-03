"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Empty, ErrorBox, Loading, PageHeader, Pagination, Table, useAdminData } from "@/components/admin/ui";
import { formatDate, formatMoney } from "@/lib/format";

type C = { id: number; name: string; phone: string; altPhone: string | null; governorate: string; city: string; ordersCount: number; totalSpent: number; createdAt: string; lastOrderAt: string | null };

export function CustomersView() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAdminData<{ items: C[]; total: number; page: number; pages: number }>(`/api/admin/customers?q=${encodeURIComponent(query)}&page=${page}`);
  return (
    <div>
      <PageHeader title="العملاء" description={data ? `${data.total} عميل — بيانات العملاء سرية ولا تظهر إلا لفريق العمل المخوّل` : undefined} />
      <form onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); setPage(1); }} className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو رقم الهاتف" className="input !pr-9 text-sm" aria-label="بحث" />
      </form>
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (data.items.length === 0 ? (
        <div className="glass rounded-2xl"><Empty text="لا يوجد عملاء بعد" /></div>
      ) : (
        <>
          <Table head={["العميل", "الهاتف", "المحافظة", "الطلبات", "إجمالي المشتريات المسلّمة", "آخر طلب", ""]}>
            {data.items.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-semibold">{c.name}</td>
                <td className="px-4 py-3 text-white/70" dir="ltr">{c.phone}{c.altPhone ? ` / ${c.altPhone}` : ""}</td>
                <td className="px-4 py-3 text-white/70">{c.governorate} — {c.city}</td>
                <td className="px-4 py-3">{c.ordersCount}</td>
                <td className="px-4 py-3 font-bold">{formatMoney(c.totalSpent)}</td>
                <td className="px-4 py-3 text-xs text-white/45">{formatDate(c.lastOrderAt)}</td>
                <td className="px-4 py-3"><Link href={`/admin/orders?q=${c.phone}`} className="text-xs text-electric-300 hover:underline">الطلبات</Link></td>
              </tr>
            ))}
          </Table>
          <Pagination page={data.page} pages={data.pages} onChange={setPage} />
        </>
      ))}
    </div>
  );
}
