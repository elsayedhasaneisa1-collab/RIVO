# RIVO – Everything You Need.

متجر إلكتروني متكامل بنظام Dropshipping مبني على Next.js (App Router) و PostgreSQL عبر Drizzle ORM.

## التشغيل لأول مرة

1. اضبط متغيرات البيئة من إعدادات الاستضافة.
2. طبّق الجداول: `npx drizzle-kit push` ثم `psql "$DATABASE_URL" -f db/rls.sql`.
3. اضبط `ADMIN_SETUP_TOKEN` بقيمة طويلة وعشوائية، ثم افتح `/admin/setup` لإنشاء حساب المالك (تظهر مرة واحدة فقط).
4. من لوحة التحكم: أضف وسائل الدفع ورقم واتساب ورسوم الشحن من الإعدادات، ثم التصنيفات والمنتجات.

## متغيرات البيئة

| المتغير | الوصف |
| --- | --- |
| `DATABASE_URL` | رابط PostgreSQL من Supabase. يفضّل استخدام Connection Pooler عند النشر على Vercel. |
| `NEXT_PUBLIC_SITE_URL` | الرابط العام للمتجر لـ SEO و Sitemap و Open Graph |
| `ALLOWED_ORIGINS` | قائمة Origins مسموح بها للـ API مفصولة بفواصل |
| `ADMIN_SETUP_TOKEN` | رمز مطلوب لإنشاء حساب المالك الأول |
| `PG_POOL_MAX` | أقصى اتصالات PostgreSQL لكل instance؛ الافتراضي 5، ويمكن تقليله إلى 2–3 عند محدودية الاتصالات. |
| `PG_IDLE_TIMEOUT_MS` | مدة إغلاق الاتصال الخامل؛ الافتراضي 10000ms. |
| `PG_CONNECTION_TIMEOUT_MS` | مهلة الاتصال؛ الافتراضي 5000ms. |
| `SUPABASE_URL` | رابط مشروع Supabase، مثل `https://PROJECT.supabase.co`؛ يستخدم لتخزين الصور. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key للخادم فقط. لا تضعه في `NEXT_PUBLIC_*` ولا في GitHub. |
| `SUPABASE_STORAGE_BUCKET` | اسم Bucket الصور؛ الافتراضي `rivo-images`. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | اختياريان لنقل Rate Limiting من PostgreSQL إلى Redis وتقليل عمليات الكتابة على قاعدة البيانات. |
| `TAAGER_API_BASE_URL` / `TAAGER_ORDERS_PATH` / `TAAGER_API_KEY` | اختيارية: تُضبط فقط بعد الحصول على وصول API رسمي من Taager. |
| `RIVO_TELEGRAM_BOT_TOKEN` | Bot Token من BotFather؛ متغير خادم سري فقط. |
| `RIVO_TELEGRAM_OWNER_ID` | Telegram numeric user ID للمالك، ويجب أن يظل سريًا. |
| `RIVO_TELEGRAM_GROUP_ID` | Chat ID للجروب الذي يستقبل إشعارات المتجر. |
| `RIVO_TELEGRAM_WEBHOOK_SECRET` | سر عشوائي لحماية Webhook من الطلبات المزيفة. |
| `CRON_SECRET` | سر لحماية مهمة الصيانة الدورية. |
| `ORDER_PAYMENT_TIMEOUT_HOURS` | مهلة الدفع بالساعات؛ الافتراضي 24. |
| `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | اختياريان: بيانات WhatsApp Cloud API الرسمية. |
| `WHATSAPP_STATUS_TEMPLATE_NAME` | اسم قالب رسالة حالة الطلب المعتمد في WhatsApp Manager. |
| `WHATSAPP_TEMPLATE_LANGUAGE` / `WHATSAPP_GRAPH_API_VERSION` | لغة القالب وإصدار Graph API؛ الافتراضي `ar` و`v23.0`. |

### تحسين إعداد Supabase

1. نفّذ `npx drizzle-kit push` لإنشاء/تحديث الجداول.
2. نفّذ `db/rls.sql` كما هو موضح أعلاه.
3. نفّذ `db/supabase-performance.sql` من Supabase SQL Editor. ينشئ Indexes للبحث والطلبات ويجهز Bucket الصور `rivo-images`.
4. أضف `SUPABASE_URL` و`SUPABASE_SERVICE_ROLE_KEY` إلى إعدادات Vercel. لا تضع Service Role Key في كود المتصفح أو GitHub.
5. أضف `DATABASE_URL` باستخدام رابط Supabase Pooler المناسب لـ Vercel. لا تستخدم اتصالًا مباشرًا طويل العمر إذا كان عدد Serverless instances كبيرًا.
6. اختياريًا، اضبط Upstash Redis وأضف متغيرَي `UPSTASH_REDIS_REST_URL` و`UPSTASH_REDIS_REST_TOKEN`. عند توفرهما يستخدمهما Rate Limiting بدل الكتابة إلى جدول `rate_limits`.

### الصور القديمة

الصور الجديدة تُرفع إلى Supabase Storage عند ضبط متغيرات Storage. الصور القديمة المخزنة في جدول `images` تظل متاحة عبر `/api/images/:id`؛ لا تحذف جدول `images` قبل نقل الصور القديمة وتحديث روابطها في المنتجات والتصنيفات.

### متطلبات التشغيل

- Node.js 20.9 أو أحدث (المناسب لإصدار Next.js المستخدم).
- استخدم `npm run typecheck` و`npm run build` قبل النشر.

## البنية

- `src/app/(store)` واجهة المتجر.
- `src/app/admin` لوحة الإدارة المحمية بالجلسات والصلاحيات (owner / admin / staff).
- `src/app/api` واجهات REST العامة والإدارية.
- `src/lib/server` منطق الخادم: الطلبات والأسعار والأرباح والحماية وتكامل الموردين.
- `db/rls.sql` تفعيل Row Level Security ومنع وصول أدوار anon/authenticated مباشرة للجداول.


## RIVO Telegram Bot

1. أنشئ البوت عبر `@BotFather` وخزّن الـ Token في `RIVO_TELEGRAM_BOT_TOKEN`.
2. استخرج Telegram numeric ID الخاص بالمالك وأضفه إلى `RIVO_TELEGRAM_OWNER_ID`. لا تستخدم username بدل الرقم.
3. أضف البوت إلى جروب الإدارة، اجعله قادرًا على إرسال الرسائل، ثم ضع Chat ID في `RIVO_TELEGRAM_GROUP_ID`.
4. أنشئ قيمة عشوائية طويلة لـ `RIVO_TELEGRAM_WEBHOOK_SECRET`، ثم اضبط Webhook مرة واحدة بعد النشر: `curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook -d "url=<SITE_URL>/api/telegram/webhook" -d "secret_token=<WEBHOOK_SECRET>"`. استخدم قيمك الفعلية ولا تشارك الرابط أو التوكن.
5. نفّذ `db/rivo-updates.sql` من Supabase SQL Editor لتجهيز مهلة الدفع وجدول مديري Telegram، أو نفّذ `npx drizzle-kit push` ثم راجع SQL.
6. المالك يضيف المديرين من الجروب أو الخاص باستخدام `/addadmin TELEGRAM_ID admin` أو `/addadmin TELEGRAM_ID staff`. كلا الدورين يستطيعان إدارة الطلبات والمنتجات والمخزون؛ المالك فقط يستطيع عرض الإحصائيات والأرباح وإضافة/حذف المديرين.
7. اختياريًا: لرسائل حالة الطلب للعميل، جهّز WhatsApp Cloud API واعتمد قالبًا يحتوي 3 متغيرات بالترتيب: اسم العميل، رقم الطلب، الحالة؛ ثم أضف متغيرات `WHATSAPP_*`. لا تُرسل الرسائل إلا للعميل الذي وافق صراحةً على تحديثات واتساب من مربع الموافقة أثناء إتمام الطلب، ومع وجود بيانات Cloud API والقالب المعتمد.
8. أضف `CRON_SECRET` إلى Vercel. ملف `vercel.json` يشغّل الصيانة يوميًا 03:00 UTC لتنظيف الجلسات المنتهية وإلغاء الطلبات التي تجاوزت مهلة الدفع مع إعادة المخزون. تكرار تشغيل المهمة آمن. تكرار تشغيل Cron يعتمد على دعم خطة Vercel المستخدمة.

### النسخ الاحتياطي

النسخ الاحتياطي الكامل لقاعدة PostgreSQL يجب تفعيله من إعدادات مشروع Supabase/خطة الاستضافة أو عبر نسخة خارجية آمنة. لا يُنصح بتشغيل نسخ كاملة من قاعدة البيانات داخل طلبات Vercel؛ فهذا قد يستهلك الذاكرة والوقت والاتصالات. احتفظ بنسخة خارجية مشفرة واختبر الاستعادة دوريًا.
