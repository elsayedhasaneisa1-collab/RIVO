import { Mail, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import type { StoreSettings } from "@/lib/server/settings";
import { Logo } from "./logo";

export function Footer({ settings, categories }: { settings: StoreSettings; categories: { name: string; slug: string }[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-24 border-t border-white/10 bg-ink-900/60">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-electric-500/60 to-transparent" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="font-display text-sm tracking-widest text-white/50" dir="ltr">{settings.tagline || "Everything You Need."}</p>
          <p className="text-sm leading-7 text-white/55">متجرك لكل ما تحتاجه، بتجربة تسوق سريعة وآمنة وتوصيل لجميع محافظات مصر.</p>
          <div className="flex gap-2">
            {settings.socialFacebook && (
              <a href={settings.socialFacebook} target="_blank" rel="noopener noreferrer" aria-label="فيسبوك" className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 hover:bg-electric-500">
                <span className="font-display text-xs font-bold">FB</span>
              </a>
            )}
            {settings.socialInstagram && (
              <a href={settings.socialInstagram} target="_blank" rel="noopener noreferrer" aria-label="إنستجرام" className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 hover:bg-electric-500">
                <span className="font-display text-xs font-bold">IG</span>
              </a>
            )}
            {settings.socialTiktok && (
              <a href={settings.socialTiktok} target="_blank" rel="noopener noreferrer" aria-label="تيك توك" className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 font-display text-xs font-bold hover:bg-electric-500">
                TT
              </a>
            )}
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
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}><Link href={`/products?category=${c.slug}`} className="hover:text-white">{c.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-4 font-bold">خدمة العملاء</h3>
          <ul className="space-y-2.5 text-sm text-white/60">
            <li><Link href="/track" className="hover:text-white">تتبع طلبك</Link></li>
            <li><Link href="/cart" className="hover:text-white">سلة التسوق</Link></li>
            {settings.whatsappNumber && (
              <li>
                <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white">
                  <MessageCircle className="h-4 w-4" /> واتساب
                </a>
              </li>
            )}
            {settings.supportPhone && (
              <li className="flex items-center gap-2" dir="ltr"><Phone className="h-4 w-4" /> {settings.supportPhone}</li>
            )}
            {settings.supportEmail && (
              <li>
                <a href={`mailto:${settings.supportEmail}`} className="flex items-center gap-2 hover:text-white"><Mail className="h-4 w-4" /> {settings.supportEmail}</a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-white/40 sm:flex-row sm:px-6">
          <p>© {year} {settings.storeName}. جميع الحقوق محفوظة.</p>
          <p>الدفع عبر التحويل المالي وتأكيده يدويًا لضمان أمان طلبك.</p>
        </div>
      </div>
    </footer>
  );
}
