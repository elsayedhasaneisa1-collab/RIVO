"use client";

import { Banknote, CircleDollarSign, Coins, PiggyBank, Receipt, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { BarChart, HBar } from "@/components/admin/charts";
import type { Stats } from "@/components/admin/stats-types";
import { Card, Empty, ErrorBox, Loading, PageHeader, StatCard, Table, useAdminData } from "@/components/admin/ui";
import { ORDER_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { formatMoney, formatNumber } from "@/lib/format";

export function AnalyticsView() {
  const [days, setDays] = useState(30);
  const { data, error, loading, reload } = useAdminData<Stats>(`/api/admin/stats?days=${days}`);
  const maxStatus = data ? Math.max(1, ...Object.values(data.statusBreakdown)) : 1;

  return (
    <div>
      <PageHeader
        title="التحليلات والأرباح"
        description="كل الأرقام محسوبة في الخادم من بيانات الطلبات الفعلية"
        actions={
          <div className="glass flex rounded-xl p-1">
            {[7, 30, 90, 365].map((d) => (
              <button key={d} onClick={() => setDays(d)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${days === d ? "bg-electric-500" : "text-white/60 hover:text-white"}`}>
                {d === 365 ? "سنة" : `${d} يوم`}
              </button>
            ))}
          </div>
        }
      />
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard accent label="إجمالي المبيعات" value={formatMoney(data.totals.sales)} icon={Banknote} hint="شامل الشحن" />
            <StatCard label="صافي مبيعات المنتجات" value={formatMoney(data.totals.netSales)} icon={Receipt} hint="بعد الخصم وبدون الشحن" />
            <StatCard label="المبيعات المحصّلة" value={formatMoney(data.totals.realizedSales)} icon={CircleDollarSign} hint="طلبات مسلّمة ومدفوعة" />
            <StatCard label="عدد الطلبات" value={formatNumber(data.totals.orders)} icon={Receipt} hint={`متوسط الطلب ${formatMoney(data.totals.averageOrder)}`} />
          </div>
          {data.profits && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="الأرباح المتوقعة" value={formatMoney(data.profits.expected)} icon={TrendingUp} hint="من كل الطلبات غير الملغاة" />
                <StatCard label="الأرباح المعلقة" value={formatMoney(data.profits.pending)} icon={Coins} hint="مدفوعة / عند المورد / قيد الشحن" />
                <StatCard label="الأرباح المحققة" value={formatMoney(data.profits.realized)} icon={PiggyBank} hint="فقط بعد التسليم والتحصيل" />
                <StatCard label="أرباح ضائعة (مرتجع)" value={formatMoney(data.profits.lost)} icon={TrendingDown} hint="طلبات مرتجعة" />
              </div>
              <p className="rounded-2xl bg-white/5 p-4 text-xs leading-6 text-white/55">
                الربح لكل طلب = (سعر البيع − الخصم) − تكلفة المنتجات من المورد، ويُحفظ لحظة إنشاء الطلب بناءً على تكلفة المنتج وقتها. لا يُحتسب الربح محققًا إلا عند وصول الطلب لحالة “تم التسليم” مع تأكيد الدفع.
              </p>
            </>
          )}
          <div className="grid gap-6 xl:grid-cols-2">
            <Card><BarChart data={data.series} valueKey="sales" label="المبيعات" /></Card>
            {data.showProfit ? (
              <Card><BarChart data={data.series} valueKey="profit" label="الأرباح المحققة" color="#10b981" /></Card>
            ) : (
              <Card><BarChart data={data.series} valueKey="orders" label="عدد الطلبات" money={false} /></Card>
            )}
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <div>
              <h2 className="mb-3 font-bold">أفضل المنتجات مبيعًا</h2>
              {data.topProducts.length === 0 ? (
                <Card><Empty text="لا توجد مبيعات في هذه الفترة" /></Card>
              ) : (
                <Table head={["المنتج", "SKU", "الكمية", "الإيراد", ...(data.showProfit ? ["الربح"] : [])]}>
                  {data.topProducts.map((p, i) => (
                    <tr key={`${p.sku}-${i}`}>
                      <td className="px-4 py-3 font-semibold">{p.name}</td>
                      <td className="px-4 py-3 text-xs text-white/50" dir="ltr">{p.sku}</td>
                      <td className="px-4 py-3">{p.quantity}</td>
                      <td className="px-4 py-3 font-bold">{formatMoney(p.revenue)}</td>
                      {data.showProfit && <td className="px-4 py-3 font-bold text-emerald-300">{formatMoney(p.profit)}</td>}
                    </tr>
                  ))}
                </Table>
              )}
            </div>
            <Card>
              <h2 className="mb-4 font-bold">توزيع حالات الطلبات</h2>
              <div className="space-y-3">
                {ORDER_STATUSES.map((s) => (
                  <HBar key={s} label={STATUS_LABELS[s]} value={data.statusBreakdown[s] ?? 0} max={maxStatus} />
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
