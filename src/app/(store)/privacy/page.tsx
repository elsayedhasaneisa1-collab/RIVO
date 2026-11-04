import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, LockKeyhole, Database, UserCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "سياسة الخصوصية | RIVO",
  description: "تعرف على كيفية تعامل RIVO مع بياناتك الشخصية وحماية خصوصيتك.",
};

const sections = [
  {
    icon: Database,
    title: "البيانات التي نجمعها",
    text: "عند إتمام طلب الشراء، قد نجمع اسمك ورقم هاتفك ورقم هاتف بديل وعنوان التوصيل والمحافظة والمدينة والمنطقة، بالإضافة إلى تفاصيل المنتجات المطلوبة وملاحظات الطلب.",
  },
  {
    icon: LockKeyhole,
    title: "كيف نستخدم بياناتك؟",
    text: "نستخدم البيانات لمعالجة طلباتك، والتواصل معك بشأن حالة الطلب، وتنسيق التوصيل، وتقديم الدعم عند الحاجة، وتحسين تجربة التسوق.",
  },
  {
    icon: ShieldCheck,
    title: "حماية المعلومات",
    text: "نتخذ إجراءات تقنية وتنظيمية مناسبة للمساعدة في حماية بياناتك من الوصول أو الاستخدام أو التعديل غير المصرح به. ومع ذلك، لا يمكن ضمان أمان نقل البيانات أو تخزينها بنسبة مطلقة.",
  },
  {
    icon: UserCheck,
    title: "مشاركة البيانات",
    text: "قد تتم مشاركة البيانات الضرورية فقط مع الجهات المشاركة في تنفيذ الطلب، مثل خدمات التوصيل أو الجهات المسؤولة عن إتمام الدفع، وذلك بالقدر اللازم لتقديم الخدمة.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-electric-500/20 bg-electric-500/10 text-electric-400">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <p className="mb-3 text-xs font-bold tracking-[0.3em] text-electric-400" dir="ltr">RIVO / PRIVACY</p>
        <h1 className="text-3xl font-black text-white sm:text-4xl">سياسة الخصوصية</h1>
        <p className="mt-4 text-sm leading-7 text-white/50">خصوصيتك مهمة بالنسبة لنا، ونسعى للتعامل مع بياناتك بمسؤولية وشفافية.</p>
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
          <h2 className="mb-3 text-lg font-bold text-white">ملفات تعريف الارتباط</h2>
          <p className="text-sm leading-8 text-white/60">قد يستخدم الموقع تقنيات التخزين المحلية وملفات تعريف الارتباط الضرورية لتشغيل الموقع وتحسين تجربة الاستخدام وحفظ بعض تفضيلاتك.</p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="mb-3 text-lg font-bold text-white">التعديلات على السياسة</h2>
          <p className="text-sm leading-8 text-white/60">قد نقوم بتحديث سياسة الخصوصية من وقت لآخر. سيتم نشر أي تحديث على هذه الصفحة، ويُنصح بمراجعتها بشكل دوري.</p>
        </section>

        <section className="rounded-2xl border border-electric-500/20 bg-electric-500/5 p-6">
          <h2 className="mb-3 text-lg font-bold text-white">تواصل معنا</h2>
          <p className="text-sm leading-8 text-white/60">إذا كان لديك استفسار متعلق بخصوصيتك أو بياناتك، يمكنك التواصل معنا من خلال قنوات التواصل الموضحة في أسفل الموقع.</p>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-5 text-sm">
        <Link href="/terms" className="text-electric-400 transition hover:text-white">شروط الاستخدام</Link>
        <Link href="/refund" className="text-electric-400 transition hover:text-white">الاستبدال والاسترجاع</Link>
        <Link href="/" className="text-white/50 transition hover:text-white">العودة للرئيسية</Link>
      </div>
    </div>
  );
}
