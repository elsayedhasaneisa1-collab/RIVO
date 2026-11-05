import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ShoppingBag, CreditCard, Truck, Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "شروط الاستخدام | RIVO",
  description: "الشروط والأحكام المنظمة لاستخدام متجر RIVO وإتمام عمليات الشراء.",
};

const sections = [
  {
    icon: ShoppingBag,
    title: "استخدام المتجر",
    text: "باستخدامك لمتجر RIVO، فإنك توافق على الالتزام بهذه الشروط. يُرجى تقديم بيانات صحيحة ومحدثة عند إنشاء الطلب، واستخدام الموقع بطريقة مشروعة.",
  },
  {
    icon: PackageIcon,
    title: "المنتجات والأسعار",
    text: "نعمل على عرض المنتجات وأسعارها ومواصفاتها بأكبر قدر ممكن من الدقة. قد تتغير الأسعار أو حالة توفر المنتجات، ويتم تأكيد تفاصيل الطلب وفقًا للمعلومات المتاحة وقت إتمامه.",
  },
  {
    icon: CreditCard,
    title: "الطلبات والدفع",
    text: "إرسال الطلب لا يعني تأكيد استلام المبلغ أو اكتمال عملية الشراء. تتم مراجعة الطلب وتأكيد الدفع وفقًا لطرق الدفع والتعليمات الموضحة أثناء إتمام الطلب، وقد نتواصل معك لتأكيد التفاصيل.",
  },
  {
    icon: Truck,
    title: "الشحن والتوصيل",
    text: "تختلف رسوم الشحن حسب المحافظة وقيمة الطلب وفقًا للإعدادات المعروضة أثناء الشراء. يتم تحديد تفاصيل التوصيل والتواصل مع العميل بشأن الطلب من خلال بيانات الاتصال المقدمة.",
  },
  {
    icon: Scale,
    title: "إلغاء الطلب والاسترجاع",
    text: "تخضع طلبات الإلغاء والاسترجاع للمراجعة والتنسيق مع خدمة العملاء، وتتم معالجة الحالات وفقًا للسياسات المعلنة والحقوق المقررة بموجب القوانين المعمول بها.",
  },
];

function PackageIcon({ className }: { className?: string }) {
  return <ShoppingBag className={className} />;
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-electric-500/20 bg-electric-500/10 text-electric-400">
          <FileText className="h-8 w-8" />
        </div>
        <p className="mb-3 text-xs font-bold tracking-[0.3em] text-electric-400" dir="ltr">RIVO / TERMS</p>
        <h1 className="text-3xl font-black text-white sm:text-4xl">شروط الاستخدام</h1>
        <p className="mt-4 text-sm leading-7 text-white/50">يرجى قراءة الشروط التالية قبل استخدام المتجر أو إتمام طلب الشراء.</p>
      </div>

      <div className="space-y-5">
        {sections.map(({ icon: Icon, title, text }) => (
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
          <h2 className="mb-3 text-lg font-bold text-white">دقة المعلومات</h2>
          <p className="text-sm leading-8 text-white/60">يجب على العميل مراجعة بيانات الطلب والعنوان ورقم الهاتف قبل الإرسال، وإبلاغ خدمة العملاء عند اكتشاف أي خطأ.</p>
        </section>

        <section className="rounded-2xl border border-electric-500/20 bg-electric-500/5 p-6">
          <h2 className="mb-3 text-lg font-bold text-white">التواصل والدعم</h2>
          <p className="text-sm leading-8 text-white/60">للاستفسارات أو المساعدة بشأن الطلبات، يمكنك استخدام وسائل التواصل الموضحة في أسفل الموقع.</p>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-5 text-sm">
        <Link href="/privacy" className="text-electric-400 transition hover:text-white">سياسة الخصوصية</Link>
        <Link href="/refund" className="text-electric-400 transition hover:text-white">الاستبدال والاسترجاع</Link>
        <Link href="/" className="text-white/50 transition hover:text-white">العودة للرئيسية</Link>
      </div>
    </div>
  );
}
