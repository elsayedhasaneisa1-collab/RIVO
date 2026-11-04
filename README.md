# RIVO – Everything You Need.

متجر إلكتروني متكامل بنظام Dropshipping مبني على Next.js (App Router) و PostgreSQL عبر Drizzle ORM.

## التشغيل لأول مرة

1. اضبط متغيرات البيئة من إعدادات الاستضافة.
2. طبّق الجداول: `npx drizzle-kit push` ثم `psql "$DATABASE_URL" -f db/rls.sql`.
3. افتح `/admin/setup` لإنشاء حساب المالك (تظهر مرة واحدة فقط).
4. من لوحة التحكم: أضف وسائل الدفع ورقم واتساب ورسوم الشحن من الإعدادات، ثم التصنيفات والمنتجات.

## متغيرات البيئة

| المتغير | الوصف |
| --- | --- |
| `DATABASE_URL` | رابط PostgreSQL (يمكن استخدام Supabase Postgres) |
| `NEXT_PUBLIC_SITE_URL` | الرابط العام للمتجر لـ SEO و Sitemap و Open Graph |
| `ALLOWED_ORIGINS` | قائمة Origins مسموح بها للـ API مفصولة بفواصل |
| `ADMIN_SETUP_TOKEN` | اختياري: رمز مطلوب لإنشاء حساب المالك |
| `TAAGER_API_BASE_URL` / `TAAGER_ORDERS_PATH` / `TAAGER_API_KEY` | اختيارية: تُضبط فقط بعد الحصول على وصول API رسمي من Taager |

## البنية

- `src/app/(store)` واجهة المتجر.
- `src/app/admin` لوحة الإدارة المحمية بالجلسات والصلاحيات (owner / admin / staff).
- `src/app/api` واجهات REST العامة والإدارية.
- `src/lib/server` منطق الخادم: الطلبات والأسعار والأرباح والحماية وتكامل الموردين.
- `db/rls.sql` تفعيل Row Level Security ومنع وصول أدوار anon/authenticated مباشرة للجداول.
