"use client";

import { useState } from "react";
import { Empty, ErrorBox, Loading, PageHeader, Pagination, Table, useAdminData } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";

type Log = { id: number; userEmail: string | null; action: string; entity: string; entityId: string | null; details: Record<string, unknown> | null; ip: string | null; createdAt: string };

const ENTITIES: [string, string][] = [["", "الكل"], ["order", "الطلبات"], ["product", "المنتجات"], ["category", "التصنيفات"], ["coupon", "الكوبونات"], ["settings", "الإعدادات"], ["user", "المستخدمون"], ["auth", "الدخول"], ["review", "التقييمات"]];
const ACTIONS: Record<string, string> = { create: "إنشاء", update: "تعديل", delete: "حذف", status_change: "تغيير حالة", login: "تسجيل دخول", login_failed: "دخول فاشل", stock_update: "تعديل مخزون", export: "تصدير", upload: "رفع ملف", approve: "موافقة", unapprove: "إخفاء", owner_setup: "إعداد المالك", supplier_push: "إرسال للمورد" };

export function AuditView() {
  const [entity, setEntity] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAdminData<{ items: Log[]; page: number; pages: number; total: number }>(`/api/admin/audit?entity=${entity}&page=${page}`);
  return (
    <div>
      <PageHeader title="سجل العمليات" description="كل إجراء إداري يُسجّل تلقائيًا ولا يمكن تعديله" />
      <div className="scrollbar-none mb-4 flex gap-2 overflow-x-auto">
        {ENTITIES.map(([v, l]) => (
          <button key={v} onClick={() => { setEntity(v); setPage(1); }} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${entity === v ? "bg-electric-500" : "glass text-white/65"}`}>{l}</button>
        ))}
      </div>
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (data.items.length === 0 ? (
        <div className="glass rounded-2xl"><Empty text="لا توجد عمليات مسجلة" /></div>
      ) : (
        <>
          <Table head={["الوقت", "المستخدم", "الإجراء", "الكيان", "التفاصيل", "IP"]}>
            {data.items.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-white/55">{formatDate(l.createdAt)}</td>
                <td className="px-4 py-3 text-xs" dir="ltr">{l.userEmail ?? "—"}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${l.action === "delete" || l.action === "login_failed" ? "bg-rose-500/15 text-rose-300" : "bg-electric-500/15 text-electric-300"}`}>{ACTIONS[l.action] ?? l.action}</span></td>
                <td className="px-4 py-3 text-xs">{l.entity}{l.entityId ? ` #${l.entityId.slice(0, 8)}` : ""}</td>
                <td className="max-w-xs px-4 py-3"><code className="line-clamp-2 break-all text-[11px] text-white/50" dir="ltr">{l.details ? JSON.stringify(l.details) : "—"}</code></td>
                <td className="px-4 py-3 text-[11px] text-white/40" dir="ltr">{l.ip ?? "—"}</td>
              </tr>
            ))}
          </Table>
          <Pagination page={data.page} pages={data.pages} onChange={setPage} />
        </>
      ))}
    </div>
  );
}
