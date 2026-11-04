import type { Metadata } from "next";
import Link from "next/link";
import { RefreshCw, PackageCheck, ClipboardList, MessageCircle, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "الاستبدال والاسترجاع | RIVO",
  description: "تعرف على آلية طلبات الاستبدال والاسترجاع والتواصل مع متجر RIVO.",
};

const steps = [
  {
    icon: MessageCircle,
    title: "تواصل مع خدمة العملاء",
    text: "ابدأ بالتواصل معنا عبر إحدى وسائل الاتصال الموضحة في أسفل الموقع، مع ذكر رقم الطلب وشرح المشكلة.",
  },
  {
    icon: ClipboardList,
    title: "مراجعة الطلب",
    text: "سنراجع تفاصيل الطلب والحالة الموضحة، وقد نطلب صورًا أو معلومات إضافية لفهم المشكلة وتحديد الإجراء المناسب.",
  },
  {
    icon: PackageCheck,
    title: "تحديد الحل المناسب",
    text: "بعد مراجعة الحالة، سيتم التواصل معك لتوضيح إمكانية الاستبدال أو الاسترجاع والخطوات اللازمة لإتمام الإجراء.",
  },
];

export default function RefundPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-electric-500/20 bg-electric-500/10 text-electric-400">
          <RefreshCw className="h-8 w-8" />
        </div>
        <p className="mb-3 text-xs font-bold tracking-[0.3em] text-electric-400" dir="ltr">RIVO / RETURNS</p>
        <h1 className="text-3xl font-black text-white sm:text-4xl">الاستبدال والاسترجاع</h1>
        <p className="mt-4 text-sm leading-7 text-white/50">نحرص على مساعدتك عند وجود مشكلة متعلقة بطلبك.</p>
      </div>

      <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="mb-3 text-lg font-bold text-white">كيف تطلب الاستبدال أو الاسترجاع؟</h2>
        <p className="text-sm leading-8 text-white/60">إذا واجهت مشكلة في طلبك، يُرجى التواصل مع خدمة العملاء وتقديم رقم الطلب وتفاصيل المشكلة. تتم مراجعة كل حالة بشكل منفصل لتحديد الإجراء المناسب وفقًا لطبيعة المنتج والحقوق المقررة قانونًا.</p>
      </section>

      <div className="space-y-5">
        {steps.map(({ icon: Icon, title, text }) => (
          <section key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-electric-500/30">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-electric-500/10 text-electric-400">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-white">{title}</h2>
            </div>
            <p className="text-sm leading-8 text-white/60">{text}</p>
          </section>
        ))}

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="mb-3 text-lg font-bold text-white">معلومات مهمة</h2>
          <p className="text-sm leading-8 text-white/60">يُرجى الاحتفاظ ببيانات الطلب وأي مستندات متعلقة بالشراء. لا تمثل هذه الصفحة تنازلًا عن أي حق من الحقوق المقررة للمستهلك بموجب القوانين المعمول بها في مصر.</p>
        </section>

        <section className="rounded-2xl border border-electric-500/20 bg-electric-500/5 p-6">
          <div className="mb-3 flex items-center gap-2 text-electric-400">
            <AlertCircle className="h-5 w-5" />
            <h2 className="font-bold text-white">تواصل معنا</h2>
          </div>
          <p className="text-sm leading-8 text-white/60">للبدء في طلب الاستبدال أو الاسترجاع، استخدم رقم واتساب أو الهاتف أو البريد الإلكتروني الموجود في أسفل الموقع.</p>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-5 text-sm">
        <Link href="/privacy" className="text-electric-400 transition hover:text-white">سياسة الخصوصية</Link>
        <Link href="/terms" className="text-electric-400 transition hover:text-white">شروط الاستخدام</Link>
        <Link href="/" className="text-white/50 transition hover:text-white">العودة للرئيسية</Link>
      </div>
    </div>
  );
}
