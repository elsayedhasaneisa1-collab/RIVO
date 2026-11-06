import { desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, orders, products, telegramManagers } from "@/db/schema";
import { transitionOrder } from "@/lib/server/orders";
import type { AdminUser } from "@/lib/server/auth";
import { STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { notifyWhatsappOrderStatus } from "@/lib/server/integrations/whatsapp";
import { SITE_URL } from "@/lib/site";

/* ----------------------------- Types ----------------------------- */

type TelegramMessage = {
  message_id?: number;
  chat: { id: number; type?: string };
  from?: { id: number; first_name?: string; last_name?: string; username?: string };
  text?: string;
};

type TelegramCallbackQuery = {
  id: string;
  from: { id: number; first_name?: string; last_name?: string; username?: string };
  message?: { chat: { id: number; type?: string }; message_id: number };
  data?: string;
};

type TelegramUpdate = {
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

type BotRole = "owner" | "admin" | "staff";

type InlineButton = { text: string; callback_data: string };
type InlineKeyboardMarkup = { inline_keyboard: InlineButton[][] };

/* ----------------------------- Config ----------------------------- */

const token = () => process.env.RIVO_TELEGRAM_BOT_TOKEN;
const ownerId = () => process.env.RIVO_TELEGRAM_OWNER_ID?.trim();
const groupId = () => process.env.RIVO_TELEGRAM_GROUP_ID?.trim();

const BOT_FOOTER = "\n\n━━━━━━━━━━━━━━━━━━\nDeveloped by EL-sayed Hasan";
const DEV_PLAIN_REGEX = /Developed by EL-sayed Hasan/i;
const DEV_TAG_REGEX = /<developed by EL-sayed Hasan\/>/gi;
const DIVIDER = "━━━━━━━━━━━━━━━━━━";

/* ----------------------------- Format helpers ----------------------------- */

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatBotMessage(text: string): string {
  const clean = text.trim().replace(DEV_TAG_REGEX, "Developed by EL-sayed Hasan");
  if (DEV_PLAIN_REGEX.test(clean)) return clean;
  return `${clean}${BOT_FOOTER}`;
}

function money(value: number): string {
  return `${(Number(value || 0) / 100).toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ج.م`;
}

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, "\\$&");
}

const STATUS_EMOJI: Record<string, string> = {
  pending: "⏳",
  payment_review: "🔍",
  paid: "✅",
  sent_to_supplier: "📤",
  shipping: "🚚",
  delivered: "📬",
  cancelled: "❌",
};

function statusLabel(status: string): string {
  const label = STATUS_LABELS[status as OrderStatus] ?? status;
  return `${STATUS_EMOJI[status] ?? "•"} ${esc(label)}`;
}

/* ----------------------------- Caches (efficiency) ----------------------------- */
// تقليل استعلامات Supabase بشكل كبير — الـ role هو أكثر ما يُستعلم عنه

const ROLE_CACHE_TTL = 60_000; // 60 ثانية
const ROLE_CACHE_MAX = 500;
const roleCache = new Map<string, { role: BotRole | null; expires: number }>();

const menuCache = new Map<string, string>();

let commandsSyncedAt = 0;
const COMMANDS_SYNC_TTL = 3_600_000; // ساعة

/* ----------------------------- Telegram API ----------------------------- */

export async function telegramRequest(method: string, body: Record<string, unknown>): Promise<any> {
  const botToken = token();
  if (!botToken) return null;
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const desc: string = typeof err?.description === "string" ? err.description : "";
      if (desc.includes("message is not modified")) return { ok: false, notModified: true };
      console.error(`telegram_api_${method}_failed`, response.status, desc.slice(0, 200));
      return null;
    }
    return response.json();
  } catch (error) {
    console.error(`telegram_api_${method}_network`, error instanceof Error ? error.message : "unknown");
    return null;
  }
}

async function sendMessage(chatId: number, html: string, keyboard?: InlineKeyboardMarkup) {
  await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: formatBotMessage(html),
    parse_mode: "HTML",
    reply_markup: keyboard,
    disable_web_page_preview: true,
  });
}

async function reply(chatId: number, html: string) {
  await sendMessage(chatId, html);
}

async function editMessage(
  chatId: number,
  messageId: number,
  html: string,
  keyboard?: InlineKeyboardMarkup,
) {
  const result = await telegramRequest("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: formatBotMessage(html),
    parse_mode: "HTML",
    reply_markup: keyboard,
    disable_web_page_preview: true,
  });
  if (result && result.notModified) return;
  if (!result) {
    await sendMessage(chatId, html, keyboard);
  }
}

async function answerCallback(callbackId: string, text?: string, showAlert = false) {
  await telegramRequest("answerCallbackQuery", {
    callback_query_id: callbackId,
    text,
    show_alert: showAlert,
  });
}

/* ----------------------------- Bot commands sync (native green menu) ----------------------------- */
// يسجّل الأوامر في تيليجرام نفسه — تظهر بلون أخضر في قائمة "/" في الشات

async function syncBotCommands(): Promise<void> {
  const now = Date.now();
  if (now - commandsSyncedAt < COMMANDS_SYNC_TTL) return;
  commandsSyncedAt = now;
  await telegramRequest("setMyCommands", {
    commands: [
      { command: "start", description: "🏠 بدء البوت" },
      { command: "help", description: "❓ المساعدة" },
      { command: "id", description: "🆔 معرفاتك" },
      { command: "pending", description: "⏳ الطلبات المعلقة" },
      { command: "neworders", description: "🛒 الطلبات الجديدة" },
      { command: "order", description: "📦 تفاصيل طلب" },
      { command: "products", description: "📋 المنتجات" },
      { command: "lowstock", description: "⚠️ مخزون منخفض" },
      { command: "search", description: "🔍 بحث عن منتج" },
      { command: "stats", description: "📊 إحصائيات" },
      { command: "profits", description: "💰 الأرباح" },
    ],
  });
}

/* ----------------------------- Send welcome (photo + combined menu) ----------------------------- */

async function sendWelcome(chatId: number, role: BotRole | null) {
  // 1) الصورة مع caption قصير (بدون أزرار)
  await telegramRequest("sendPhoto", {
    chat_id: chatId,
    photo: "https://rivo-eight-wine.vercel.app/rivo-bot-welcome.png",
    caption: "🤖 <b>RIVO BOT</b>\nمساعدك الذكي لإدارة المتجر بسهولة وأمان.",
    parse_mode: "HTML",
  });

  // 2) رسالة واحدة: قائمة الأوامر فوق + الأزرار تحت
  await sendMessage(chatId, buildCommandMenu(role), mainMenu(role));
}

export async function sendTelegramText(text: string, chatId = groupId()) {
  if (!chatId || !token()) return;
  await sendMessage(Number(chatId), text);
}

export async function notifyTelegramNewProduct(product: {
  name: string;
  slug: string;
  description: string;
  images: string[];
  price: number;
  compareAtPrice: number | null;
  stock: number;
}) {
  const channelId = process.env.RIVO_TELEGRAM_CHANNEL_ID?.trim();
  if (!channelId || !token()) {
    console.error("telegram_product_post_skipped: channel or bot token is missing");
    return false;
  }

  const productUrl = `${SITE_URL}/products/${encodeURIComponent(product.slug)}`;
  const description = product.description.trim().slice(0, 500);
  const caption =
    `🆕 <b>منتج جديد في RIVO</b>\n\n` +
    `📦 <b>${esc(product.name)}</b>\n` +
    `💰 السعر: <b>${money(product.price)}</b>\n` +
    (product.compareAtPrice && product.compareAtPrice > product.price
      ? `🏷️ قبل الخصم: <s>${money(product.compareAtPrice)}</s>\n`
      : "") +
    `📊 المخزون: ${product.stock > 0 ? `${product.stock} قطعة` : "غير متوفر حاليًا"}\n` +
    (description ? `\n${esc(description)}\n` : "\n") +
    `\n<a href="${esc(productUrl)}">شاهد المنتج واطلبه الآن</a>`;

  const firstImage = product.images[0];
  const photo = firstImage
    ? firstImage.startsWith("/")
      ? `${SITE_URL}${firstImage}`
      : firstImage
    : null;

  const result = photo
    ? await telegramRequest("sendPhoto", {
        chat_id: channelId,
        photo,
        caption,
        parse_mode: "HTML",
      })
    : await telegramRequest("sendMessage", {
        chat_id: channelId,
        text: caption,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      });

  return Boolean(result?.ok);
}

export async function notifyTelegramNewOrder(order: {
  reference: string;
  name: string;
  phone: string;
  total: number;
}) {
  const body =
    `🛒 <b>طلب جديد في RIVO</b>\n` +
    `${DIVIDER}\n\n` +
    `🔖 الرقم: <code>${esc(order.reference)}</code>\n` +
    `👤 العميل: ${esc(order.name)}\n` +
    `💰 الإجمالي: <b>${money(order.total)}</b>\n\n` +
    `لعرض التفاصيل: /order ${esc(order.reference)}`;
  await sendTelegramText(body);
}

export async function notifyTelegramOrderStatus(reference: string, from: string, to: string) {
  const body =
    `🔔 <b>تحديث حالة طلب</b>\n` +
    `${DIVIDER}\n\n` +
    `📦 الطلب: <code>${esc(reference)}</code>\n` +
    `📊 من: ${statusLabel(from)}\n` +
    `📊 إلى: ${statusLabel(to)}`;
  await sendTelegramText(body);
}

/* ----------------------------- Command menu (cached) ----------------------------- */

function buildCommandMenu(role: BotRole | null): string {
  const key = role ?? "guest";
  const cached = menuCache.get(key);
  if (cached) return cached;

  const lines: string[] = [
    "⌨️ <b>قائمة الأوامر</b>",
    DIVIDER,
    "",
    "🔹 <b>عام</b>",
    "  ├ <code>/id</code>  →  معرفاتك",
    "  ├ <code>/ping</code>  →  فحص البوت",
    "  └ <code>/help</code>  →  المساعدة",
  ];

  if (role) {
    lines.push(
      "",
      "🛒 <b>الطلبات</b>",
      "  ├ <code>/neworders</code>  →  الجديدة",
      "  ├ <code>/pending</code>  →  المعلقة",
      "  ├ <code>/orders</code>  →  آخر 10",
      "  └ <code>/order رقم</code>  →  تفاصيل طلب",
      "",
      "⚙️ <b>تحديث الحالة</b>",
      "  ├ <code>/confirm رقم</code>  →  تأكيد الدفع",
      "  ├ <code>/ship رقم</code>  →  شحن",
      "  ├ <code>/delivered رقم</code>  →  تسليم",
      "  └ <code>/cancel رقم</code>  →  إلغاء",
      "",
      "📦 <b>المنتجات</b>",
      "  ├ <code>/products</code>  →  الكل",
      "  ├ <code>/lowstock</code>  →  مخزون منخفض",
      "  ├ <code>/outstock</code>  →  نافد",
      "  ├ <code>/search كلمة</code>  →  بحث",
      "  ├ <code>/product SKU</code>  →  تفاصيل",
      "  └ <code>/setstock SKU كمية</code>  →  تعديل",
      "",
      "🧾 <code>/activity</code>  →  آخر العمليات",
    );
  }

  if (role === "owner") {
    lines.push(
      "",
      "👑 <b>للمالك فقط</b>",
      "  ├ <code>/stats</code>  →  إحصائيات",
      "  ├ <code>/profits</code>  →  الأرباح",
      "  ├ <code>/managers</code>  →  المدراء",
      "  ├ <code>/addadmin ID role</code>  →  إضافة",
      "  └ <code>/removeadmin ID</code>  →  حذف",
    );
  }

  lines.push("", "💡 <i>اضغط على الأمر لنسخه، أو استخدم الأزرار بالأسفل</i>");

  const result = lines.join("\n");
  menuCache.set(key, result);
  return result;
}

/* ----------------------------- Keyboards ----------------------------- */

function mainMenu(role: BotRole | null): InlineKeyboardMarkup {
  const rows: InlineButton[][] = [
    [
      { text: "🛒 الطلبات الجديدة", callback_data: "list:new" },
      { text: "⏳ المعلقة", callback_data: "list:pending" },
    ],
    [
      { text: "📦 المنتجات", callback_data: "products:list" },
      { text: "⚠️ مخزون منخفض", callback_data: "products:low" },
    ],
  ];
  if (role === "owner") {
    rows.push(
      [
        { text: "📊 إحصائيات", callback_data: "stats" },
        { text: "💰 الأرباح", callback_data: "profits" },
      ],
      [{ text: "👥 المدراء", callback_data: "managers:list" }],
    );
  }
  rows.push(
    [{ text: "🔔 اختبر الأزرار", callback_data: "ping" }],
    [{ text: "❓ مساعدة", callback_data: "help" }],
  );
  return { inline_keyboard: rows };
}

function orderActions(order: { reference: string; status: OrderStatus }): InlineKeyboardMarkup {
  const row: InlineButton[] = [];
  const s = order.status;
  if (s === "pending" || s === "payment_review") {
    row.push({ text: "✅ تأكيد الدفع", callback_data: `act:confirm:${order.reference}` });
    row.push({ text: "❌ إلغاء", callback_data: `act:cancel:${order.reference}` });
  } else if (s === "paid") {
    row.push({ text: "📦 إرسال للمورد", callback_data: `act:ship:${order.reference}` });
    row.push({ text: "❌ إلغاء", callback_data: `act:cancel:${order.reference}` });
  } else if (s === "sent_to_supplier" || s === "shipping") {
    row.push({ text: "🚚 تم التسليم", callback_data: `act:delivered:${order.reference}` });
  }
  row.push({ text: "🔙 القائمة", callback_data: "menu" });
  return { inline_keyboard: [row] };
}

function ordersListButtons(orders: { reference: string }[]): InlineKeyboardMarkup {
  const rows: InlineButton[][] = orders.map((o) => [
    { text: `📄 ${o.reference}`, callback_data: `view:${o.reference}` },
  ]);
  rows.push([{ text: "🔙 القائمة الرئيسية", callback_data: "menu" }]);
  return { inline_keyboard: rows };
}

function backButton(target = "menu"): InlineKeyboardMarkup {
  return { inline_keyboard: [[{ text: "🔙 رجوع", callback_data: target }]] };
}

/* ----------------------------- Helpers (with cache) ----------------------------- */

async function getRole(telegramId: string): Promise<BotRole | null> {
  const now = Date.now();
  const cached = roleCache.get(telegramId);
  if (cached && cached.expires > now) return cached.role;

  let role: BotRole | null = null;
  if (ownerId() && telegramId === ownerId()) {
    role = "owner";
  } else {
    const [manager] = await db
      .select({ role: telegramManagers.role, isActive: telegramManagers.isActive })
      .from(telegramManagers)
      .where(eq(telegramManagers.telegramId, telegramId))
      .limit(1);
    if (manager?.isActive && (manager.role === "admin" || manager.role === "staff")) {
      role = manager.role;
    }
  }

  if (roleCache.size >= ROLE_CACHE_MAX) {
    for (const [k, v] of roleCache) {
      if (v.expires < now) roleCache.delete(k);
    }
  }
  roleCache.set(telegramId, { role, expires: now + ROLE_CACHE_TTL });
  return role;
}

function invalidateRoleCache(telegramId?: string) {
  if (telegramId) roleCache.delete(telegramId);
  else roleCache.clear();
}

async function findOrder(value: string) {
  const normalized = value.trim().toUpperCase();
  const id = Number(value);
  const rows =
    Number.isInteger(id) && id > 0
      ? await db
          .select()
          .from(orders)
          .where(or(eq(orders.id, id), eq(orders.reference, normalized)))
          .limit(1)
      : await db.select().from(orders).where(eq(orders.reference, normalized)).limit(1);
  return rows[0] ?? null;
}

function buildHelp(role: BotRole | null): string {
  const lines: string[] = [
    "📋 <b>مساعدة RIVO BOT</b>",
    DIVIDER,
    "",
    "استخدم الأزرار بالأسفل أو اكتب أي أمر من القائمة بالأعلى.",
    "الأوامر بلون رمادي — اضغط عليها لنسخها تلقائيًا.",
  ];
  if (!role) {
    lines.push("", "⛔ حسابك غير مصرح بعد.", "أرسل /id للمالك ليضيفك.");
  }
  return lines.join("\n");
}

/* ----------------------------- Rate limiting ----------------------------- */

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 30;
const rateBuckets = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  if (rateBuckets.size > 5000) rateBuckets.clear();
  const now = Date.now();
  const fresh = (rateBuckets.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (fresh.length >= RATE_LIMIT) {
    rateBuckets.set(userId, fresh);
    return true;
  }
  fresh.push(now);
  rateBuckets.set(userId, fresh);
  return false;
}

/* ----------------------------- Guards ----------------------------- */

const FORBIDDEN_STATUS: Record<string, string[]> = {
  confirm: ["paid", "sent_to_supplier", "shipping", "delivered", "cancelled"],
  cancel: ["delivered", "cancelled"],
  cancel_confirm: ["delivered", "cancelled"],
  ship: ["pending", "payment_review", "delivered", "cancelled"],
  delivered: ["pending", "payment_review", "cancelled", "delivered"],
};

const MUTATING_COMMANDS = new Set(["/confirm", "/cancel", "/ship", "/delivered", "/setstock"]);

/* ----------------------------- Callback parser ----------------------------- */

function parseCbData(data: string): { type: string; action: string; reference: string } {
  const i = data.indexOf(":");
  if (i === -1) return { type: data, action: "", reference: "" };
  const type = data.slice(0, i);
  const rest = data.slice(i + 1);
  if (type === "view") return { type, action: "", reference: rest };
  const j = rest.indexOf(":");
  if (j === -1) return { type, action: rest, reference: "" };
  return { type, action: rest.slice(0, j), reference: rest.slice(j + 1) };
}

/* ----------------------------- Command router ----------------------------- */

async function runCommand(message: TelegramMessage) {
  const text = message.text?.trim() ?? "";
  if (!text.startsWith("/")) return;
  const chatId = message.chat.id;
  const senderId = String(message.from?.id ?? "");
  const [rawCommand, ...args] = text.split(/\s+/);
  const command = rawCommand.split("@")[0].toLowerCase();

  if (isRateLimited(senderId)) {
    await reply(chatId, "⏳ عدد كبير من الأوامر. انتظر دقيقة ثم حاول مرة أخرى.");
    return;
  }

  if (command === "/id") {
    await reply(
      chatId,
      `🆔 <b>المعرفات</b>\n${DIVIDER}\n\n👤 Telegram ID: <code>${esc(senderId)}</code>\n💬 Chat ID: <code>${esc(chatId)}</code>`,
    );
    return;
  }

  if (command === "/ping") {
    const hasToken = Boolean(token());
    const hasOwner = Boolean(ownerId());
    const hasGroup = Boolean(groupId());
    const role = await getRole(senderId);
    await reply(
      chatId,
      `🏓 <b>Pong!</b>\n${DIVIDER}\n\n` +
        `🔑 Bot Token: ${hasToken ? "✅" : "❌"}\n` +
        `👤 Owner ID: ${hasOwner ? "✅" : "❌"}\n` +
        `👥 Group ID: ${hasGroup ? "✅" : "❌"}\n` +
        `💬 Chat Type: ${esc(message.chat.type ?? "unknown")}\n` +
        `🎖️ Your Role: ${role ?? "غير مصرح"}\n\n` +
        `🔔 <i>اضغط الزر بالأسفل لاختبار الأزرار</i>`,
    );
    await sendMessage(chatId, "👇 اختبر الأزرار:", {
      inline_keyboard: [
        [{ text: "🔔 اختبر الأزرار", callback_data: "ping" }],
        [{ text: "🔙 القائمة", callback_data: "menu" }],
      ],
    });
    return;
  }

  if (command === "/start" || command === "/menu") {
    // تسجيل الأوامر في تيليجرام (مرة كل ساعة)
    syncBotCommands().catch(() => {});
    const role = await getRole(senderId);
    await sendWelcome(chatId, role);
    return;
  }

  if (command === "/help") {
    const role = await getRole(senderId);
    await sendMessage(chatId, buildHelp(role), backButton("menu"));
    return;
  }

  const role = await getRole(senderId);
  if (!role) {
    await reply(
      chatId,
      "⛔ <b>غير مصرح</b>\n\nهذا الأمر متاح للمالك والمديرين المعتمدين فقط.\nأرسل /id للمالك لمعرفة Telegram ID الخاص بك.",
    );
    return;
  }

  if (message.chat.type !== "private") {
    if (!groupId() || String(chatId) !== groupId()) {
      await reply(chatId, "⛔ هذا الجروب غير معتمد لبوت RIVO.");
      return;
    }
    if (MUTATING_COMMANDS.has(command)) {
      await reply(chatId, "🔒 <b>أوامر التعديل متاحة فقط في المحادثة الخاصة.</b>");
      return;
    }
  }

  const privateOnly = [
    "/stats",
    "/profits",
    "/managers",
    "/orders",
    "/neworders",
    "/pending",
    "/order",
    "/activity",
  ];
  if (privateOnly.includes(command) && message.chat.type !== "private") {
    await reply(chatId, "🔒 <b>خصوصية البيانات:</b> استخدم هذا الأمر في المحادثة الخاصة مع البوت.");
    return;
  }

  const ownerOnly = ["/stats", "/profits", "/managers", "/addadmin", "/removeadmin"];
  if (ownerOnly.includes(command) && role !== "owner") {
    await reply(chatId, "⛔ هذا الأمر متاح للمالك فقط.");
    return;
  }

  if (command === "/stats") {
    const [[counts], [today]] = await Promise.all([
      db
        .select({
          orders: sql<number>`count(*)::int`,
          customers: sql<number>`(select count(*)::int from customers)`,
          products: sql<number>`(select count(*)::int from products)`,
        })
        .from(orders),
      db
        .select({
          count: sql<number>`count(*)::int`,
          sales: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.status} in ('paid','sent_to_supplier','shipping','delivered')),0)::bigint`,
        })
        .from(orders)
        .where(sql`${orders.createdAt} >= date_trunc('day', now())`),
    ]);
    const body =
      `📊 <b>إحصائيات المتجر</b>\n${DIVIDER}\n\n` +
      `🛒 إجمالي الطلبات: <b>${counts.orders}</b>\n` +
      `👥 العملاء: <b>${counts.customers}</b>\n` +
      `📦 المنتجات: <b>${counts.products}</b>\n\n` +
      `📅 طلبات اليوم: <b>${today.count}</b>\n` +
      `💰 مبيعات اليوم: <b>${money(Number(today.sales))}</b>`;
    await sendMessage(chatId, body, backButton("menu"));
    return;
  }

  if (command === "/profits") {
    const [row] = await db
      .select({
        realized: sql<number>`coalesce(sum(${orders.profit}) filter (where ${orders.status} = 'delivered' and ${orders.paymentConfirmedAt} is not null),0)::bigint`,
        expected: sql<number>`coalesce(sum(${orders.profit}) filter (where ${orders.status} in ('paid','sent_to_supplier','shipping')),0)::bigint`,
      })
      .from(orders);
    const body =
      `💰 <b>الأرباح</b>\n${DIVIDER}\n\n` +
      `✅ محققة: <b>${money(Number(row.realized))}</b>\n` +
      `⏳ متوقعة: <b>${money(Number(row.expected))}</b>`;
    await sendMessage(chatId, body, backButton("menu"));
    return;
  }

  if (command === "/managers") {
    const managers = await db
      .select()
      .from(telegramManagers)
      .where(eq(telegramManagers.isActive, true))
      .orderBy(telegramManagers.createdAt);
    const body = managers.length
      ? `👥 <b>مديرو البوت</b>\n${DIVIDER}\n\n` +
        managers.map((m) => `• <code>${esc(m.telegramId)}</code> — ${esc(m.name)} (${esc(m.role)})`).join("\n")
      : "👥 لا يوجد مديرون مضافون.";
    await sendMessage(chatId, body, backButton("menu"));
    return;
  }

  if (command === "/addadmin") {
    const id = args[0];
    const managerRole = args[1] === "admin" ? "admin" : args[1] === "staff" ? "staff" : null;
    if (!id || !/^\d{5,20}$/.test(id) || !managerRole) {
      await reply(chatId, "الاستخدام: <code>/addadmin TELEGRAM_ID admin|staff</code>");
      return;
    }
    if (id === ownerId()) {
      await reply(chatId, "⚠️ هذا هو معرف المالك ولا يمكن إضافته كمدير.");
      return;
    }
    await db
      .insert(telegramManagers)
      .values({ telegramId: id, role: managerRole, name: `Manager ${id}` })
      .onConflictDoUpdate({
        target: telegramManagers.telegramId,
        set: { role: managerRole, isActive: true },
      });
    await db.insert(auditLogs).values({
      userEmail: `telegram:${senderId}`,
      action: "telegram_manager_add",
      entity: "telegram_manager",
      entityId: id,
      details: { role: managerRole },
    });
    invalidateRoleCache(id);
    await reply(chatId, `✅ تمت إضافة <code>${esc(id)}</code> بصلاحية <b>${esc(managerRole)}</b>.`);
    return;
  }

  if (command === "/removeadmin") {
    const id = args[0];
    if (!id || !/^\d{5,20}$/.test(id)) {
      await reply(chatId, "الاستخدام: <code>/removeadmin TELEGRAM_ID</code>");
      return;
    }
    const removed = await db
      .delete(telegramManagers)
      .where(eq(telegramManagers.telegramId, id))
      .returning({ id: telegramManagers.id });
    if (removed.length)
      await db.insert(auditLogs).values({
        userEmail: `telegram:${senderId}`,
        action: "telegram_manager_remove",
        entity: "telegram_manager",
        entityId: id,
      });
    invalidateRoleCache(id);
    await reply(
      chatId,
      removed.length ? `✅ تم حذف المدير <code>${esc(id)}</code>.` : "⚠️ لم يتم العثور على هذا المدير.",
    );
    return;
  }

  if (["/orders", "/neworders", "/pending"].includes(command)) {
    const query = db
      .select({
        reference: orders.reference,
        total: orders.total,
        status: orders.status,
      })
      .from(orders);
    const rows =
      command === "/neworders"
        ? await query.where(eq(orders.status, "pending")).orderBy(desc(orders.createdAt)).limit(10)
        : command === "/pending"
          ? await query
              .where(inArray(orders.status, ["pending", "payment_review"]))
              .orderBy(desc(orders.createdAt))
              .limit(10)
          : await query.orderBy(desc(orders.createdAt)).limit(10);

    if (!rows.length) {
      await reply(chatId, "📭 لا توجد طلبات حالياً.");
      return;
    }
    const total = rows.reduce((s, o) => s + o.total, 0);
    const title =
      command === "/neworders" ? "🛒 <b>الطلبات الجديدة</b>" : command === "/pending" ? "⏳ <b>الطلبات المعلقة</b>" : "🛒 <b>آخر الطلبات</b>";
    const body =
      `${title}\n${DIVIDER}\n\n` +
      `📊 العدد: <b>${rows.length}</b>\n` +
      `💰 الإجمالي: <b>${money(total)}</b>\n\n` +
      `👇 اضغط على طلب لعرض التفاصيل`;
    await sendMessage(chatId, body, ordersListButtons(rows));
    return;
  }

  if (command === "/order") {
    const order = args[0] ? await findOrder(args[0]) : null;
    if (!order) {
      await reply(chatId, "❌ لم يتم العثور على الطلب.\nمثال: <code>/order RV-260101-ABC234</code>");
      return;
    }
    const body =
      `📦 <b>تفاصيل الطلب</b>\n${DIVIDER}\n\n` +
      `🔖 الرقم: <code>${esc(order.reference)}</code>\n` +
      `👤 العميل: ${esc(order.name)}\n` +
      `📞 الهاتف: <code>${esc(order.phone)}</code>\n` +
      `📍 العنوان: ${esc(order.governorate)} - ${esc(order.city)}\n\n` +
      `💰 الإجمالي: <b>${money(order.total)}</b>\n` +
      `📊 الحالة: ${statusLabel(order.status)}`;
    await sendMessage(
      chatId,
      body,
      orderActions({ reference: order.reference, status: order.status as OrderStatus }),
    );
    return;
  }

  if (["/confirm", "/cancel", "/ship", "/delivered"].includes(command)) {
    const order = args[0] ? await findOrder(args[0]) : null;
    if (!order) {
      await reply(chatId, "اكتب رقم الطلب بعد الأمر.");
      return;
    }
    const actionKey = command.slice(1);
    if (FORBIDDEN_STATUS[actionKey]?.includes(order.status)) {
      await reply(
        chatId,
        `⚠️ لا يمكن تنفيذ هذا الإجراء.\nالحالة الحالية: ${statusLabel(order.status)}`,
      );
      return;
    }

    let target: OrderStatus;
    if (actionKey === "confirm") target = "paid";
    else if (actionKey === "cancel") target = "cancelled";
    else if (actionKey === "delivered") target = "delivered";
    else target = order.status === "paid" ? "sent_to_supplier" : "shipping";

    const actor: AdminUser = {
      id: 0,
      email: `telegram:${senderId}`,
      name: message.from?.first_name ?? "Telegram Manager",
      role,
    } as AdminUser;

    try {
      const result = await transitionOrder(
        order.id,
        target,
        actor,
        `تم التحديث من Telegram بواسطة ${senderId}`,
      );
      await db.insert(auditLogs).values({
        userEmail: `telegram:${senderId}`,
        action: `telegram_order_${actionKey}`,
        entity: "order",
        entityId: String(order.id),
        details: { reference: result.reference, from: result.from, to: result.to },
      });
      await notifyTelegramOrderStatus(result.reference, result.from, result.to);
      if (order.whatsappUpdatesConsent) {
        notifyWhatsappOrderStatus(order.phone, order.name, result.reference, result.to).catch(() => {});
      }
      const body =
        `✅ <b>تم التحديث</b>\n${DIVIDER}\n\n` +
        `📦 الطلب: <code>${esc(result.reference)}</code>\n` +
        `📊 من: ${statusLabel(result.from)}\n` +
        `📊 إلى: ${statusLabel(result.to)}`;
      await sendMessage(chatId, body, orderActions({ reference: order.reference, status: result.to as OrderStatus }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "خطأ غير متوقع";
      await reply(chatId, `⚠️ تعذّر التحديث: ${esc(msg)}`);
    }
    return;
  }

  if (["/products", "/lowstock", "/outstock"].includes(command)) {
    const query = db
      .select({ name: products.name, sku: products.sku, stock: products.stock })
      .from(products);
    const rows =
      command === "/lowstock"
        ? await query
            .where(sql`${products.stock} <= ${products.lowStockThreshold}`)
            .orderBy(products.name)
            .limit(15)
        : command === "/outstock"
          ? await query.where(eq(products.stock, 0)).orderBy(products.name).limit(15)
          : await query.orderBy(products.name).limit(15);

    if (!rows.length) {
      await reply(chatId, "📭 لا توجد منتجات مطابقة.");
      return;
    }
    const title =
      command === "/lowstock" ? "⚠️ <b>مخزون منخفض</b>" : command === "/outstock" ? "❌ <b>منتجات نافدة</b>" : "📦 <b>المنتجات</b>";
    const body =
      `${title}\n${DIVIDER}\n\n` +
      rows.map((p) => `• ${esc(p.name)}\n  <code>${esc(p.sku)}</code>  •  المخزون: <b>${p.stock}</b>`).join("\n\n");
    await reply(chatId, body);
    return;
  }

  if (command === "/product" || command === "/search") {
    const term = args.join(" ").trim();
    if (!term) {
      await reply(chatId, "اكتب اسم المنتج أو SKU بعد الأمر.");
      return;
    }
    const safe = escapeLike(term);
    const rows = await db
      .select({
        name: products.name,
        sku: products.sku,
        stock: products.stock,
        price: products.price,
        isActive: products.isActive,
      })
      .from(products)
      .where(sql`${products.sku} ilike ${safe} OR ${products.name} ilike ${`%${safe}%`}`)
      .limit(10);

    if (!rows.length) {
      await reply(chatId, "❌ لم يتم العثور على منتجات.");
      return;
    }
    const body =
      `🔍 <b>نتائج البحث</b>\n${DIVIDER}\n\n` +
      rows
        .map(
          (p) =>
            `• ${esc(p.name)}\n  <code>${esc(p.sku)}</code>  •  ${money(p.price)}  •  المخزون: <b>${p.stock}</b>  •  ${p.isActive ? "✅ نشط" : "⛔ متوقف"}`,
        )
        .join("\n\n");
    await reply(chatId, body);
    return;
  }

  if (command === "/setstock") {
    const sku = args[0];
    const quantity = Number(args[1]);
    if (!sku || !Number.isInteger(quantity) || quantity < 0 || quantity > 1000000) {
      await reply(chatId, "الاستخدام: <code>/setstock SKU كمية</code> (صفر أو أكثر)");
      return;
    }
    const updated = await db
      .update(products)
      .set({ stock: quantity, updatedAt: new Date() })
      .where(eq(products.sku, sku))
      .returning({ id: products.id, name: products.name, stock: products.stock });
    if (updated.length)
      await db.insert(auditLogs).values({
        userEmail: `telegram:${senderId}`,
        action: "telegram_stock_update",
        entity: "product",
        entityId: String(updated[0].id),
        details: { sku, stock: quantity },
      });
    await reply(
      chatId,
      updated.length
        ? `✅ تم تحديث مخزون <b>${esc(updated[0].name)}</b> إلى <b>${updated[0].stock}</b>.`
        : "⚠️ لم يتم العثور على SKU.",
    );
    return;
  }

  if (command === "/activity") {
    const rows = await db
      .select({
        action: auditLogs.action,
        entity: auditLogs.entity,
        entityId: auditLogs.entityId,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(like(auditLogs.userEmail, "telegram:%"))
      .orderBy(desc(auditLogs.createdAt))
      .limit(8);
    const body = rows.length
      ? `🧾 <b>آخر العمليات</b>\n${DIVIDER}\n\n` +
        rows
          .map(
            (r) =>
              `• <b>${esc(r.action)}</b>\n  ${esc(r.entity)} ${esc(r.entityId ?? "")}\n  <i>${r.createdAt.toLocaleString("ar-EG")}</i>`,
          )
          .join("\n\n")
      : "📭 لا يوجد سجل عمليات.";
    await reply(chatId, body);
    return;
  }

  await reply(chatId, "❓ أمر غير معروف. استخدم /help لعرض الأوامر.");
}

/* ----------------------------- Callback router ----------------------------- */

async function handleCallbackQuery(cb: TelegramCallbackQuery) {
  const chatId = cb.message?.chat.id;
  const messageId = cb.message?.message_id;
  const chatType = cb.message?.chat.type;

  if (!chatId || !messageId || !cb.data) {
    await answerCallback(cb.id);
    return;
  }

  const senderId = String(cb.from.id);

  if (isRateLimited(senderId)) {
    await answerCallback(cb.id, "⏳ برجاء التمهّل قليلاً", true);
    return;
  }

  const parsed = parseCbData(cb.data);
  if (parsed.type === "ping") {
    await answerCallback(cb.id, "✅ الأزرار تعمل بنجاح!", true);
    return;
  }

  const role = await getRole(senderId);
  if (!role) {
    await answerCallback(cb.id, "⛔ غير مصرح", true);
    return;
  }

  const { type, action, reference } = parsed;

  const ownerActions = new Set(["stats", "profits", "managers"]);
  if (ownerActions.has(type)) {
    if (role !== "owner") {
      await answerCallback(cb.id, "⛔ للمالك فقط", true);
      return;
    }
    if (chatType !== "private") {
      await answerCallback(cb.id, "🔒 استخدم هذا في المحادثة الخاصة", true);
      return;
    }
  }

  if (chatType !== "private" && type === "act") {
    await answerCallback(cb.id, "🔒 التعديل متاح في الخاص فقط", true);
    return;
  }

  let answered = false;
  const ack = async (text?: string, showAlert = false) => {
    if (answered) return;
    answered = true;
    await answerCallback(cb.id, text, showAlert);
  };

  try {
    if (type === "menu") {
      await ack();
      await editMessage(chatId, messageId, buildCommandMenu(role), mainMenu(role));
      return;
    }

    if (type === "help") {
      await ack();
      await editMessage(chatId, messageId, buildHelp(role), backButton("menu"));
      return;
    }

    if (type === "list") {
      await ack();
      const statuses: string[] = action === "new" ? ["pending"] : ["pending", "payment_review"];
      const rows = await db
        .select({ reference: orders.reference, total: orders.total, status: orders.status })
        .from(orders)
        .where(inArray(orders.status, statuses))
        .orderBy(desc(orders.createdAt))
        .limit(10);

      if (!rows.length) {
        await editMessage(chatId, messageId, "📭 لا توجد طلبات حالياً.", backButton("menu"));
        return;
      }
      const total = rows.reduce((s, o) => s + o.total, 0);
      const title = action === "new" ? "🛒 <b>الطلبات الجديدة</b>" : "⏳ <b>الطلبات المعلقة</b>";
      const body =
        `${title}\n${DIVIDER}\n\n` +
        `📊 العدد: <b>${rows.length}</b>\n` +
        `💰 الإجمالي: <b>${money(total)}</b>\n\n` +
        `👇 اضغط على طلب لعرض التفاصيل`;
      await editMessage(chatId, messageId, body, ordersListButtons(rows));
      return;
    }

    if (type === "view") {
      const order = await findOrder(reference);
      if (!order) {
        await ack("❌ لم يتم العثور على الطلب", true);
        return;
      }
      await ack();
      const body =
        `📦 <b>تفاصيل الطلب</b>\n${DIVIDER}\n\n` +
        `🔖 الرقم: <code>${esc(order.reference)}</code>\n` +
        `👤 العميل: ${esc(order.name)}\n` +
        `📞 الهاتف: <code>${esc(order.phone)}</code>\n` +
        `📍 العنوان: ${esc(order.governorate)} - ${esc(order.city)}\n\n` +
        `💰 الإجمالي: <b>${money(order.total)}</b>\n` +
        `📊 الحالة: ${statusLabel(order.status)}`;
      await editMessage(
        chatId,
        messageId,
        body,
        orderActions({ reference: order.reference, status: order.status as OrderStatus }),
      );
      return;
    }

    if (type === "act") {
      const order = await findOrder(reference);
      if (!order) {
        await ack("❌ لم يتم العثور على الطلب", true);
        return;
      }

      if (action === "cancel") {
        if (FORBIDDEN_STATUS.cancel.includes(order.status)) {
          await ack(`⚠️ لا يمكن الإلغاء (${statusLabel(order.status)})`, true);
          return;
        }
        await ack();
        await editMessage(
          chatId,
          messageId,
          `⚠️ <b>تأكيد الإلغاء</b>\n${DIVIDER}\n\n📦 الطلب: <code>${esc(order.reference)}</code>\n\nهذا الإجراء نهائي ولا يمكن التراجع عنه.`,
          {
            inline_keyboard: [
              [
                { text: "✅ نعم، ألغِ", callback_data: `act:cancel_confirm:${order.reference}` },
                { text: "🔙 رجوع", callback_data: `view:${order.reference}` },
              ],
            ],
          },
        );
        return;
      }

      if (FORBIDDEN_STATUS[action]?.includes(order.status)) {
        await ack(`⚠️ لا يمكن التنفيذ (${statusLabel(order.status)})`, true);
        return;
      }

      let target: OrderStatus;
      if (action === "confirm") target = "paid";
      else if (action === "cancel_confirm") target = "cancelled";
      else if (action === "delivered") target = "delivered";
      else target = order.status === "paid" ? "sent_to_supplier" : "shipping";

      const actor = {
        id: 0,
        email: `telegram:${senderId}`,
        name: cb.from.first_name ?? "Telegram Manager",
        role,
      } as AdminUser;

      await ack();

      try {
        const result = await transitionOrder(order.id, target, actor, `callback:${action}`);

        await db.insert(auditLogs).values({
          userEmail: `telegram:${senderId}`,
          action: `telegram_order_${action}`,
          entity: "order",
          entityId: String(order.id),
          details: { reference: result.reference, from: result.from, to: result.to },
        });

        const body =
          `✅ <b>تم التحديث</b>\n${DIVIDER}\n\n` +
          `📦 الطلب: <code>${esc(order.reference)}</code>\n` +
          `📊 من: ${statusLabel(result.from)}\n` +
          `📊 إلى: ${statusLabel(result.to)}`;
        await editMessage(
          chatId,
          messageId,
          body,
          orderActions({ reference: order.reference, status: result.to as OrderStatus }),
        );

        await notifyTelegramOrderStatus(result.reference, result.from, result.to);
        if (order.whatsappUpdatesConsent) {
          notifyWhatsappOrderStatus(order.phone, order.name, result.reference, result.to).catch(() => {});
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "خطأ غير متوقع";
        await editMessage(chatId, messageId, `⚠️ <b>فشل التحديث</b>\n\n${esc(msg)}`, backButton("menu"));
      }
      return;
    }

    if (type === "products") {
      await ack();
      const where =
        action === "low" ? sql`${products.stock} <= ${products.lowStockThreshold}` : undefined;
      const rows = await db
        .select({ name: products.name, sku: products.sku, stock: products.stock })
        .from(products)
        .where(where)
        .orderBy(products.name)
        .limit(15);

      if (!rows.length) {
        await editMessage(chatId, messageId, "📭 لا توجد منتجات.", backButton("menu"));
        return;
      }
      const title = action === "low" ? "⚠️ <b>مخزون منخفض</b>" : "📦 <b>المنتجات</b>";
      const body =
        `${title}\n${DIVIDER}\n\n` +
        rows
          .map((p) => `• ${esc(p.name)}\n  <code>${esc(p.sku)}</code>  •  المخزون: <b>${p.stock}</b>`)
          .join("\n\n");
      await editMessage(chatId, messageId, body, backButton("menu"));
      return;
    }

    if (type === "stats") {
      await ack();
      const [row] = await db
        .select({
          total: sql<number>`count(*)::int`,
          pending: sql<number>`count(*) filter (where ${orders.status} = 'pending')::int`,
          today: sql<number>`count(*) filter (where ${orders.createdAt} >= date_trunc('day', now()))::int`,
        })
        .from(orders);
      const body =
        `📊 <b>إحصائيات RIVO</b>\n${DIVIDER}\n\n` +
        `🛒 إجمالي الطلبات: <b>${row.total}</b>\n` +
        `⏳ المعلقة: <b>${row.pending}</b>\n` +
        `📅 طلبات اليوم: <b>${row.today}</b>`;
      await editMessage(chatId, messageId, body, backButton("menu"));
      return;
    }

    if (type === "profits") {
      await ack();
      const [row] = await db
        .select({
          realized: sql<number>`coalesce(sum(${orders.profit}) filter (where ${orders.status} = 'delivered' and ${orders.paymentConfirmedAt} is not null),0)::bigint`,
          expected: sql<number>`coalesce(sum(${orders.profit}) filter (where ${orders.status} in ('paid','sent_to_supplier','shipping')),0)::bigint`,
        })
        .from(orders);
      const body =
        `💰 <b>الأرباح</b>\n${DIVIDER}\n\n` +
        `✅ محققة: <b>${money(Number(row.realized))}</b>\n` +
        `⏳ متوقعة: <b>${money(Number(row.expected))}</b>`;
      await editMessage(chatId, messageId, body, backButton("menu"));
      return;
    }

    if (type === "managers") {
      await ack();
      const rows = await db
        .select()
        .from(telegramManagers)
        .where(eq(telegramManagers.isActive, true))
        .orderBy(telegramManagers.createdAt);
      const body = rows.length
        ? `👥 <b>المدراء</b>\n${DIVIDER}\n\n` +
          rows.map((m) => `• <code>${esc(m.telegramId)}</code> — ${esc(m.name)} (${esc(m.role)})`).join("\n")
        : "👥 لا يوجد مديرون.";
      await editMessage(chatId, messageId, body, backButton("menu"));
      return;
    }

    await ack("غير معروف", true);
  } catch (error) {
    console.error("callback_failed", {
      data: cb.data,
      senderId,
      error: error instanceof Error ? error.message : "unknown",
    });
    await ack("⚠️ حدث خطأ غير متوقع", true);
  }
}

/* ----------------------------- Entry point ----------------------------- */

export async function handleTelegramUpdate(update: TelegramUpdate) {
  try {
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return;
    }
    const message = update.message;
    if (!message?.text || !message.from) return;
    await runCommand(message);
  } catch (error) {
    console.error("telegram_update_failed", error instanceof Error ? error.message : "unknown");
    const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
    if (chatId) {
      try {
        await reply(chatId, "⚠️ حدث خطأ غير متوقع. حاول لاحقًا.");
      } catch {
        /* swallow */
      }
    }
  }
}