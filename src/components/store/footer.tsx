import { Mail, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import type { StoreSettings } from "@/lib/server/settings";
import { Logo } from "./logo";

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.4-.1-2.6-.1-2.6 0-4.3 1.6-4.3 4.5V10H7v3h2.9v8h3.6Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="18" cy="6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M19.6 8.2a7.1 7.1 0 0 1-4.4-1.5v7.1a5.8 5.8 0 1 1-5-5.7v3.6a2.3 2.3 0 1 0 1.5 2.1V2.5h3.5c.2 2.3 1.6 3.8 4.4 4.1v1.6Z" />
    </svg>
  );
}

const socialClass =
  "grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-all duration-300 hover:-translate-y-1 hover:border-electric-500 hover:bg-electric-500 hover:text-white dark:border-white/10 dark:bg-white/5 dark:text-white/65 dark:hover:border-electric-500 dark:hover:bg-electric-500 dark:hover:text-white";

const linkClass =
  "text-sm text-slate-600 transition-colors hover:text-electric-600 dark:text-white/60 dark:hover:text-electric-400";

export function Footer({
  settings,
  categories,
}: {
  settings: StoreSettings;
  categories: { name: string; slug: string }[];
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-24 border-t border-slate-200 bg-white text-slate-900 transition-colors duration-300 dark:border-white/10 dark:bg-ink-900 dark:text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-electric-500/60 to-transparent" />

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo />

          <p className="font-display text-sm tracking-widest text-slate-500 dark:text-white/50" dir="ltr">
            {settings.tagline || "Everything You Need."}
          </p>

          <p className="text-sm leading-7 text-slate-600 dark:text-white/55">
            متجرك لكل ما تحتاجه، بتجربة تسوق سهلة وسريعة وتوصيل لجميع محافظات مصر.
          </p>

          <div className="flex gap-2">
            {settings.socialFacebook && (
              <a
                href={settings.socialFacebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className={socialClass}
              >
                <FacebookIcon />
              </a>
            )}

            {settings.socialInstagram && (
              <a
                href={settings.socialInstagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className={socialClass}
              >
                <InstagramIcon />
              </a>
            )}

            {settings.socialTiktok && (
              <a
                href={settings.socialTiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className={socialClass}
              >
                <TikTokIcon />
              </a>
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-4 font-bold">تسوق</h3>

          <ul className="space-y-3">
            <li><Link href="/products" className={linkClass}>كل المنتجات</Link></li>
            <li><Link href="/products?sale=1" className={linkClass}>العروض والخصومات</Link></li>
            <li><Link href="/products?sort=best_selling" className={linkClass}>الأكثر مبيعًا</Link></li>
            <li><Link href="/categories" className={linkClass}>التصنيفات</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-bold">التصنيفات</h3>

          <ul className="space-y-3">
            {categories.length === 0 && (
              <li className="text-sm text-slate-400 dark:text-white/35">قريبًا</li>
            )}

            {categories.slice(0, 6).map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/products?category=${encodeURIComponent(category.slug)}`}
                  className={linkClass}
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-bold">خدمة العملاء</h3>

          <ul className="space-y-3">
            <li><Link href="/track" className={linkClass}>تتبع طلبك</Link></li>
            <li><Link href="/cart" className={linkClass}>سلة التسوق</Link></li>

            {settings.whatsappNumber && (
              <li>
                <a
                  href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 ${linkClass}`}
                >
                  <MessageCircle className="h-4 w-4" />
                  واتساب
                </a>
              </li>
            )}

            {settings.supportPhone && (
              <li>
                <a
                  href={`tel:${settings.supportPhone}`}
                  className={`flex items-center gap-2 ${linkClass}`}
                  dir="ltr"
                >
                  <Phone className="h-4 w-4" />
                  {settings.supportPhone}
                </a>
              </li>
            )}

            {settings.supportEmail && (
              <li>
                <a
                  href={`mailto:${settings.supportEmail}`}
                  className={`flex items-center gap-2 ${linkClass}`}
                >
                  <Mail className="h-4 w-4" />
                  {settings.supportEmail}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 py-6 text-center sm:px-6 md:flex-row">
          <p className="text-xs text-slate-500 dark:text-white/40">
            © {year} {settings.storeName}. جميع الحقوق محفوظة.
          </p>

          <div className="flex flex-wrap justify-center gap-x-5 gap-y-3">
            <Link href="/privacy" className={linkClass}>سياسة الخصوصية</Link>
            <Link href="/terms" className={linkClass}>شروط الاستخدام</Link>
            <Link href="/refund" className={linkClass}>الاستبدال والاسترجاع</Link>
          </div>

          <p className="text-xs text-slate-500 dark:text-white/40">
            تجربة تسوق أفضل مع RIVO
          </p>
        </div>

        <div className="border-t border-slate-200 px-4 py-4 text-center dark:border-white/5">
          <span
            className="font-mono text-xs tracking-wide text-slate-400 transition-colors hover:text-electric-500 dark:text-white/35 dark:hover:text-electric-400"
            dir="ltr"
          >
            &lt;Developed by elsayed hasan/&gt;
          </span>
        </div>
      </div>
    </footer>
  );
}