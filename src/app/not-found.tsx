import { ArrowLeft, Compass } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/store/logo";

export default function NotFound() {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-electric-500/20 blur-[120px]" />
      <div className="relative text-center">
        <div className="mb-10 flex justify-center"><Logo /></div>
        <p className="font-display text-[8rem] font-bold leading-none text-gradient sm:text-[11rem]" dir="ltr">404</p>
        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">الصفحة غير موجودة</h1>
        <p className="mx-auto mt-3 max-w-md text-white/55">يبدو أن الرابط الذي تبحث عنه غير متاح أو تم نقله. لكن لدينا كل ما تحتاجه في مكان آخر.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary">العودة للرئيسية <ArrowLeft className="h-4 w-4" /></Link>
          <Link href="/products" className="btn-ghost"><Compass className="h-4 w-4" /> تصفح المنتجات</Link>
        </div>
      </div>
    </div>
  );
}
