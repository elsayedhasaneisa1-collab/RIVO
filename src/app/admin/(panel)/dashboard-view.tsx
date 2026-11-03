"use client";

import { AlertTriangle, Banknote, ClipboardList, Clock, Coins, PiggyBank, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { BarChart } from "@/components/admin/charts";
import type { Stats } from "@/components/admin/stats-types";
import { Card, Empty, ErrorBox, Loading, PageHeader, StatCard, StatusBadge, useAdminData } from "@/components/admin/ui";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";

export function DashboardView({ name }: { name: string }) {
  const { data, error, loading, reload } = useAdminData<Stats>("/api/admin/stats?days=30");

  return (
    <div>
      <PageHeader title={`مرحبًا، ${name}`} description="نظرة عامة على أداء المتجر خلال آخر 30 يومًا" />
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard accent label="إجمالي المبيعات" value={formatMoney(data.totals.sales)} icon={Banknote} hint="الطلبات المدفوعة وما بعدها" />
            <StatCard label="عدد الطلبات" value={formatNumber(data.totals.orders)} icon={ClipboardList} hint={`${data.totals.deliveredCount} تم تسليمها`} />
            <StatCard label="بانتظار الدفع" value={formatNumber(data.totals.awaitingPayment)} icon={Clock} hint={`${data.totals.paymentReview} قيد مراجعة التحويل`} />
            <StatCard label="العملاء" value={formatNumber(data.totals.customers)} icon={Users} hint={`${data.totals.products} منتج بالمتجر`} />
          </div>
          {data.profits && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="الأرباح المتوقعة" value={formatMoney(data.profits.expected)} icon={TrendingUp} hint="كل الطلبات النشطة" />
              <StatCard label="الأرباح المعلقة" value={formatMoney(data.profits.pending)} icon={Coins} hint="مدفوعة ولم تُسلَّم بعد" />
              <StatCard label="الأرباح المحققة" value={formatMoney(data.profits.realized)} icon={PiggyBank} hint="مسلّمة ومحصّلة فقط" />
            </div>
          )}
          {data.totals.paymentReview > 0 && (
            <Link href="/admin/orders?status=payment_review" className="flex items-center gap-3 rounded-2xl bg-sky-500/10 p-4 text-sm text-sky-200 ring-1 ring-sky-500/30 hover:bg-sky-500/15">
              <AlertTriangle className="h-5 w-5" /> لديك {data.totals.paymentReview} طلب بانتظار مراجعة إثبات التحويل.
            </Link>
          )}
          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <Card>
              <BarChart data={data.series} valueKey="sales" label="المبيعات اليومية" />
            </Card>
            <Card>
              <h2 className="mb-4 font-bold">تنبيهات المخزون</h2>
              {data.lowStock.length === 0 ? (
                <Empty text="كل المنتجات بمخزون جيد" />
              ) : (
                <ul className="space-y-2">
                  {data.lowStock.map((p) => (
                    <li key={p.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">
                      <span className="line-clamp-1">{p.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${p.stock <= 0 ? "bg-rose-500/20 text-rose-300" : "bg-amber-500/20 text-amber-300"}`}>{p.stock <= 0 ? "نفد" : `${p.stock} متبقي`}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/admin/inventory" className="mt-4 block text-center text-xs text-electric-300 hover:underline">إدارة المخزون</Link>
            </Card>
          </div>
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">أحدث الطلبات</h2>
              <Link href="/admin/orders" className="text-xs text-electric-300 hover:underline">كل الطلبات</Link>
            </div>
            {data.recentOrders.length === 0 ? (
              <Empty text="لا توجد طلبات بعد" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <tbody className="divide-y divide-white/5">
                    {data.recentOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-white/[0.03]">
                        <td className="py-3"><Link href={`/admin/orders/${o.id}`} className="font-display font-bold text-electric-300" dir="ltr">{o.reference}</Link></td>
                        <td className="py-3">{o.name}</td>
                        <td className="py-3"><StatusBadge status={o.status} /></td>
                        <td className="py-3 font-bold">{formatMoney(o.total)}</td>
                        <td className="py-3 text-xs text-white/45">{formatDate(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
