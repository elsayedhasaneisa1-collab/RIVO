import type { Metadata } from "next";
import { Suspense } from "react";
import { TrackView } from "./track-view";

export const metadata: Metadata = { title: "تتبع طلبك", description: "تابع حالة طلبك من RIVO باستخدام رقم الطلب ورقم الهاتف.", alternates: { canonical: "/track" } };

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-16"><div className="skeleton h-64 rounded-3xl" /></div>}>
      <TrackView />
    </Suspense>
  );
}
