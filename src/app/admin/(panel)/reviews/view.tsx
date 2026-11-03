"use client";

import { Check, EyeOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Empty, ErrorBox, Loading, PageHeader, useAdminData, useToast } from "@/components/admin/ui";
import { Stars } from "@/components/ui/stars";
import { api } from "@/lib/client/api";
import { formatDate } from "@/lib/format";

type R = { id: number; name: string; rating: number; comment: string; isApproved: boolean; createdAt: string; productName: string; productSlug: string };

export function ReviewsView() {
  const [status, setStatus] = useState("pending");
  const { data, error, loading, reload } = useAdminData<{ items: R[] }>(`/api/admin/reviews?status=${status}`);
  const toast = useToast();

  const act = async (r: R, action: "approve" | "hide" | "delete") => {
    try {
      if (action === "delete") {
        if (!confirm("حذف التقييم نهائيًا؟")) return;
        await api(`/api/admin/reviews/${r.id}`, { method: "DELETE" });
      } else await api(`/api/admin/reviews/${r.id}`, { method: "PATCH", json: { isApproved: action === "approve" } });
      reload();
    } catch (e) {
      toast.show((e as Error).message, "err");
    }
  };

  return (
    <div>
      {toast.node}
      <PageHeader title="تقييمات العملاء" description="لا يظهر أي تقييم في المتجر إلا بعد الموافقة عليه" />
      <div className="mb-4 flex gap-2">
        {[["pending", "بانتظار المراجعة"], ["approved", "المنشورة"], ["", "الكل"]].map(([v, l]) => (
          <button key={v} onClick={() => setStatus(v)} className={`rounded-full px-4 py-2 text-sm font-semibold ${status === v ? "bg-electric-500" : "glass text-white/65"}`}>{l}</button>
        ))}
      </div>
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (data.items.length === 0 ? (
        <div className="glass rounded-2xl"><Empty text="لا توجد تقييمات" /></div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {data.items.map((r) => (
            <li key={r.id} className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{r.name}</p>
                  <Link href={`/products/${r.productSlug}`} target="_blank" className="text-xs text-electric-300 hover:underline">{r.productName}</Link>
                </div>
                <Stars value={r.rating} size={13} />
              </div>
              <p className="mt-3 text-sm leading-7 text-white/70">{r.comment}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-white/40">{formatDate(r.createdAt)}</span>
                <div className="flex gap-1">
                  {!r.isApproved ? (
                    <button onClick={() => act(r, "approve")} className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/25"><Check className="h-3.5 w-3.5" /> نشر</button>
                  ) : (
                    <button onClick={() => act(r, "hide")} className="flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"><EyeOff className="h-3.5 w-3.5" /> إخفاء</button>
                  )}
                  <button onClick={() => act(r, "delete")} className="grid h-8 w-8 place-items-center rounded-lg text-rose-300 hover:bg-rose-500/10" aria-label="حذف"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}
