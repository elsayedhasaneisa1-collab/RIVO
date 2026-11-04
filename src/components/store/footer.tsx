import { Mail, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import type { StoreSettings } from "@/lib/server/settings";
import { Logo } from "./logo";

function FacebookIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.4-.1-2.6-.1-2.6 0-4.3 1.6-4.3 4.5V10H7v3h2.9v8h3.6Z" /></svg>;
}

function InstagramIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="18" cy="6" r="1" fill="currentColor" stroke="none" /></svg>;
}

function TikTokIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M19.6 8.2a7.1 7.1 0 0 1-4.4-1.5v7.1a5.8 5.8 0 1 1-5-5.7v3.6a2.3 2.3 0 1 0 1.5 2.1V2.5h3.5c.2 2.3 1.6 3.8 4.4 4.1v1.6Z" /></svg>;
}

const socialClass = "grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/65 transition hover:-translate-y-1 hover:border-electric-500 hover:bg-electric-500 hover:text-white";

export function Footer({ settings, categories }: { settings: StoreSettings; categories: { name: string; slug: string }[] }) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-24 border-t border-white/10 bg-ink-900/60">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-electric-500/60 to-transparent" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="font-display text-sm tracking-widest text-white/50" dir="ltr">{settings.tagline || "Everything You Need."}</p>
          <p className="text-sm leading-7 text-white/55">متجرك لكل ما تحتاجه، بتجربة تسوق سهلة وسريعة وتوصيل لجميع محافظات مصر.</p>
          <div className="flex gap-2">
            {settings.socialFacebook && <a href={settings.socialFacebook} target="_blank" rel="noopener noreferrer" aria-label="فيسبوك" className={socialClass}><FacebookIcon /></a>}
            {settings.socialInstagram && <a href={settings.socialInstagram} target="_blank" rel="noopener noreferrer" aria-label="إنستجرام" className={socialClass}><InstagramIcon /></a>}
            {settings.socialTiktok && <a href={settings.socialTiktok} target="_blank" rel="noopener noreferrer" aria-label="تيك توك" className={socialClass}><TikTokIcon /></a>}
          </div>
        </div>

        <div>
          <h3 className="mb-4 font-bold">تسوق</h3>
          <ul className="space-y-2.5 text-sm text-white/60">
            <li><Link href="/products" className="hover:text-white">كل المنتجات</Link></li>
            <li><Link href="/products?sale=1" className="hover:text-white">العروض والخصومات</Link></li>
            <li><Link href="/products?sort=best_selling" className="hover:text-white">الأكثر مبيعًا</Link></li>
            <li><Link href="/categories" className="hover:text-white">التصنيفات</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-bold">التصنيفات</h3>
          <ul className="space-y-2.5 text-sm text-white/60">
            {categories.length === 0 && <li className="text-white/35">قريبًا</li>}
            {categories.slice(0, 6).map((c) => <li key={c.slug}><Link href={`/products?category=${c.slug}`} className="hover:text-white">{c.name}</Link></li>)}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-bold">خدمة العملاء</h3>
          <ul className="space-y-2.5 text-sm text-white/60">
            <li><Link href="/track" className="hover:text-white">تتبع طلبك</Link></li>
            <li><Link href="/cart" className="hover:text-white">سلة التسوق</Link></li>
            {settings.whatsappNumber && <li><a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white"><MessageCircle className="h-4 w-4" /> واتساب</a></li>}
            {settings.supportPhone && <li className="flex items-center gap-2" dir="ltr"><Phone className="h-4 w-4" /> {settings.supportPhone}</li>}
            {settings.supportEmail && <li><a href={`mailto:${settings.supportEmail}`} className="flex items-center gap-2 hover:text-white"><Mail className="h-4 w-4" /> {settings.supportEmail}</a></li>}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-5 text-xs text-white/40 sm:px-6 md:flex-row">
          <p>© {year} {settings.storeName}. جميع الحقوق محفوظة.</p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            <Link href="/privacy" className="transition hover:text-white">سياسة الخصوصية</Link>
            <Link href="/terms" className="transition hover:text-white">شروط الاستخدام</Link>
            <Link href="/refund" className="transition hover:text-white">الاستبدال والاسترجاع</Link>
          </div>
          <p className="text-center">الدفع وفقًا لطرق الدفع الموضحة عند إتمام الطلب.</p>
        </div>
        <div className="border-t border-white/5 px-4 py-4 text-center">
          <span className="font-mono text-xs tracking-wide text-white/35 transition hover:text-electric-400" dir="ltr">&lt;Developed by elsayed hasan/&gt;</span>
        </div>
      </div>
    </footer>
  );
}
