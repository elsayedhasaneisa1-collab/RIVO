"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-extrabold">حدث خطأ غير متوقع</h1>
        <p className="mt-2 text-white/55">نعتذر عن ذلك، يرجى المحاولة مرة أخرى.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="btn-primary"><RefreshCw className="h-4 w-4" /> إعادة المحاولة</button>
          <Link href="/" className="btn-ghost">الرئيسية</Link>
        </div>
      </div>
    </div>
  );
}
