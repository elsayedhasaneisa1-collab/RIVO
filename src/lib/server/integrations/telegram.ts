import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, orders, products, telegramManagers } from "@/db/schema";
import { transitionOrder } from "@/lib/server/orders";
import type { AdminUser } from "@/lib/server/auth";
import { STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { notifyWhatsappOrderStatus } from "@/lib/server/integrations/whatsapp";

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
const DEV_TAG_REGEX = /<developed by EL-sayed Hasan\/>/gi;
const DEV_PLAIN_REGEX = /Developed by EL-sayed Hasan/i;

function formatBotMessage(text: string) {
  const cleanText = text.trim();
  if (/<developed by EL-sayed Hasan\/>/i.test(cleanText)) {
    return cleanText.replace(DEV_TAG_REGEX, "Developed by EL-sayed Hasan");
  }
  if (DEV_PLAIN_REGEX.test(cleanText)) return cleanText;
  return `✦ RIVO BOT\n━━━━━━━━━━━━━━━━━━\n${cleanText}${BOT_FOOTER}`;
}

function money(value: number) {
  return `${(Number(value || 0) / 100).toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ج.م`;
}

function escapeLike(term: string) {
  return term.replace(/[\\%_]/g, "\\$&");
}

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
      if (desc.includes("message is not modified")) {
        return { ok: false, notModified: true };
      }
      console.error(`telegram_api_${method}_failed`, response.status, desc.slice(0, 200));
      return null;
    }
    return response.json();
  } catch (error) {
    console.error(`telegram_api_${method}_network`, error instanceof Error ? error.message : "unknown");
    return null;
  }
}

async function sendMessage(chatId: number, text: string, keyboard?: InlineKeyboardMarkup) {
  await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: formatBotMessage(text),
    reply_markup: keyboard,
    disable_web_page_preview: true,
  });
}

async function reply(chatId: number, text: string) {
  await sendMessage(chatId, text);
}

async function editMessage(
  chatId: number,
  messageId: number,
  text: string,
  keyboard?: InlineKeyboardMarkup,
) {
  const result = await telegramRequest("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: formatBotMessage(text),
    reply_markup: keyboard,
    disable_web_page_preview: true,
  });
  if (result && result.notModified) return;
  if (!result) {
    // fallback: الرسالة الأصلية ممكن تكون صورة — نرسل جديدة
    await sendMessage(chatId, text, keyboard);
  }
}

async function answerCallback(callbackId: string, text?: string, showAlert = false) {
  await telegramRequest("answerCallbackQuery", {
    callback_query_id: callbackId,
    text,
    show_alert: showAlert,
  });
}

async function sendWelcomePhoto(chatId: number, role: BotRole | null) {
  await telegramRequest("sendPhoto", {
    chat_id: chatId,
    photo: "https://rivo-eight-wine.vercel.app/rivo-bot-welcome.png",
    caption:
      "🤖 RIVO BOT\nمساعد متجرك الذكي لإدارة الطلبات والمنتجات.\n\n👇 اختر من الأزرار بالأسفل، أو استخدم /help.",
    reply_markup: mainMenu(role),
  });
}

export async function sendTelegramText(text: string, chatId = groupId()) {
  if (!chatId || !token()) return;
  await sendMessage(Number(chatId), text);
}

export async function notifyTelegramNewOrder(order: {
  reference: string;
  name: string;
  phone: string;
  total: number;
}) {
  await sendTelegramText(
    `🛒 طلب جديد في RIVO\nرقم الطلب: ${order.reference}\nالإجمالي: ${(order.total / 100).toLocaleString("ar-EG")} ج.م\n\nلعرض التفاصيل، استخدم /order ${order.reference} في المحادثة الخاصة مع البوت.`,
  );
}

export async function notifyTelegramOrderStatus(reference: string, from: string, to: string) {
  await sendTelegramText(
    `🔔 تحديث طلب في RIVO\nالطلب: ${reference}\nالحالة السابقة: ${STATUS_LABELS[from as OrderStatus] ?? from}\nالحالة الجديدة: ${STATUS_LABELS[to as OrderStatus] ?? to}`,
  );
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
  rows.push([{ text: "❓ مساعدة", callback_data: "help" }]);
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
  row.push({ text: "🔙 الطلبات", callback_data: "list:pending" });
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

/* ----------------------------- Helpers ----------------------------- */

async function getRole(telegramId: string): Promise<BotRole | null> {
  if (ownerId() && telegramId === ownerId()) return "owner";
  const [manager] = await db
    .select({ role: telegramManagers.role, isActive: telegramManagers.isActive })
    .from(telegramManagers)
    .where(eq(telegramManagers.telegramId, telegramId))
    .limit(1);
  if (!manager?.isActive || (manager.role !== "admin" && manager.role !== "staff")) return null;
  return manager.role;
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

function buildHelp(role: BotRole | null) {
  const lines: string[] = [
    "📋 أوامر RIVO BOT",
    "",
    "🔹 عام:",
    "/id — معرفة المعرفات",
    "/help — المساعدة",
  ];
  if (role) {
    lines.push(
      "",
      "🔷 للمديرين المعتمدين:",
      "/orders — آخر الطلبات (خاص)",
      "/neworders — الطلبات الجديدة (خاص)",
      "/pending — الطلبات المعلقة (خاص)",
      "/order رقم — تفاصيل طلب (خاص)",
      "/confirm رقم — تأكيد الدفع",
      "/cancel رقم — إلغاء طلب",
      "/ship رقم — تحديث الشحن",
      "/delivered رقم — تأكيد التسليم",
      "/products — المنتجات",
      "/product SKU — تفاصيل منتج",
      "/search كلمة — البحث عن منتج",
      "/lowstock — مخزون منخفض",
      "/outstock — منتجات نافدة",
      "/setstock SKU كمية — تعديل المخزون",
      "/activity — آخر سجل تغييرات (خاص)",
    );
  }
  if (role === "owner") {
    lines.push(
      "",
      "👑 للمالك فقط:",
      "/stats — إحصائيات المتجر (خاص)",
      "/profits — الأرباح (خاص)",
      "/managers — المديرون (خاص)",
      "/addadmin ID admin|staff — إضافة مدير",
      "/removeadmin ID — حذف مدير",
    );
  }
  lines.push("", "<developed by EL-sayed Hasan/>");
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

/* ----------------------------- Action guards ----------------------------- */

// يمنع تنفيذ الإجراءات لو الحالة الحالية غير مناسبة — يوفر round-trip على القاعدة
const FORBIDDEN_STATUS: Record<string, string[]> = {
  confirm: ["paid", "sent_to_supplier", "shipping", "delivered", "cancelled"],
  cancel: ["delivered", "cancelled"],
  cancel_confirm: ["delivered", "cancelled"],
  ship: ["pending", "payment_review", "delivered", "cancelled"],
  delivered: ["pending", "payment_review", "cancelled", "delivered"],
};

// أوامر مسموح استخدامها في الجروبات فقط للقراءة
const MUTATING_COMMANDS = new Set([
  "/confirm",
  "/cancel",
  "/ship",
  "/delivered",
  "/setstock",
]);

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
    await reply(chatId, `Telegram ID: ${senderId}\nChat ID: ${chatId}`);
    return;
  }

  if (command === "/start" || command === "/help") {
    const role = await getRole(senderId);
    await sendWelcomePhoto(chatId, role);
    await reply(chatId, buildHelp(role));
    return;
  }

  const role = await getRole(senderId);
  if (!role) {
    await reply(
      chatId,
      "⛔ هذا الأمر متاح للمالك والمديرين المعتمدين فقط. أرسل /id للمالك لمعرفة Telegram ID الخاص بك.",
    );
    return;
  }

  // أي محادثة غير خاصة لازم تكون الجروب المعتمد
  if (message.chat.type !== "private") {
    if (!groupId() || String(chatId) !== groupId()) {
      await reply(chatId, "⛔ هذا الجروب غير معتمد لبوت RIVO.");
      return;
    }
    // في الجروب: نمنع أوامر تعديل البيانات
    if (MUTATING_COMMANDS.has(command)) {
      await reply(chatId, "🔒 أوامر تعديل الطلبات والمخزون متاحة فقط في المحادثة الخاصة مع البوت.");
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
    await reply(
      chatId,
      "🔒 حفاظًا على خصوصية العملاء وبيانات المتجر، استخدم هذا الأمر في المحادثة الخاصة مع البوت.",
    );
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
    await reply(
      chatId,
      `📊 إحصائيات RIVO\nإجمالي الطلبات: ${counts.orders}\nالعملاء: ${counts.customers}\nالمنتجات: ${counts.products}\nطلبات اليوم: ${today.count}\nمبيعات الطلبات اليوم: ${money(Number(today.sales))}`,
    );
    return;
  }

  if (command === "/profits") {
    const [row] = await db
      .select({
        realized: sql<number>`coalesce(sum(${orders.profit}) filter (where ${orders.status} = 'delivered' and ${orders.paymentConfirmedAt} is not null),0)::bigint`,
        expected: sql<number>`coalesce(sum(${orders.profit}) filter (where ${orders.status} in ('paid','sent_to_supplier','shipping')),0)::bigint`,
      })
      .from(orders);
    await reply(
      chatId,
      `💰 الأرباح\nالأرباح المحققة: ${money(Number(row.realized))}\nالأرباح المتوقعة: ${money(Number(row.expected))}`,
    );
    return;
  }

  if (command === "/managers") {
    const managers = await db
      .select()
      .from(telegramManagers)
      .where(eq(telegramManagers.isActive, true))
      .orderBy(telegramManagers.createdAt);
    await reply(
      chatId,
      managers.length
        ? `👥 مديرو البوت\n${managers.map((m) => `${m.telegramId} — ${m.name} (${m.role})`).join("\n")}`
        : "لا يوجد مديرون مضافون.",
    );
    return;
  }

  if (command === "/addadmin") {
    const id = args[0];
    const managerRole = args[1] === "admin" ? "admin" : args[1] === "staff" ? "staff" : null;
    if (!id || !/^\d{5,20}$/.test(id) || !managerRole) {
      await reply(chatId, "الاستخدام: /addadmin TELEGRAM_ID admin أو /addadmin TELEGRAM_ID staff");
      return;
    }
    if (id === ownerId()) {
      await reply(chatId, "هذا هو معرف المالك ولا يمكن إضافته كمدير.");
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
    await reply(chatId, `✅ تمت إضافة ${id} بصلاحية ${managerRole}.`);
    return;
  }

  if (command === "/removeadmin") {
    const id = args[0];
    if (!id || !/^\d{5,20}$/.test(id)) {
      await reply(chatId, "الاستخدام: /removeadmin TELEGRAM_ID");
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
    await reply(
      chatId,
      removed.length ? `✅ تم حذف المدير ${id}.` : "لم يتم العثور على هذا المدير.",
    );
    return;
  }

  if (["/orders", "/neworders", "/pending"].includes(command)) {
    const query = db
      .select({
        reference: orders.reference,
        name: orders.name,
        total: orders.total,
        status: orders.status,
        createdAt: orders.createdAt,
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
      await reply(chatId, "لا توجد طلبات.");
      return;
    }
    const lines = rows
      .map((o) => `${o.reference} | ${money(o.total)} | ${STATUS_LABELS[o.status as OrderStatus] ?? o.status}`)
      .join("\n");
    await sendMessage(chatId, `🛒 الطلبات\n${lines}\n\n👇 اضغط على طلب لعرض تفاصيله`, ordersListButtons(rows));
    return;
  }

  if (command === "/order") {
    const order = args[0] ? await findOrder(args[0]) : null;
    if (!order) {
      await reply(chatId, "لم يتم العثور على الطلب. مثال: /order RV-260101-ABC234");
      return;
    }
    const body = `📦 تفاصيل الطلب ${order.reference}\nالعميل: ${order.name}\nالهاتف: ${order.phone}\nالعنوان: ${order.governorate} - ${order.city} - ${order.area}\nالإجمالي: ${money(order.total)}\nالحالة: ${STATUS_LABELS[order.status as OrderStatus] ?? order.status}\nتاريخ الطلب: ${order.createdAt.toLocaleString("ar-EG")}`;
    await sendMessage(chatId, body, orderActions({ reference: order.reference, status: order.status as OrderStatus }));
    return;
  }

  if (["/confirm", "/cancel", "/ship", "/delivered"].includes(command)) {
    const order = args[0] ? await findOrder(args[0]) : null;
    if (!order) {
      await reply(chatId, "اكتب رقم الطلب بعد الأمر.");
      return;
    }
    const actionKey = command.slice(1); // "confirm" | "cancel" | "ship" | "delivered"
    if (FORBIDDEN_STATUS[actionKey]?.includes(order.status)) {
      await reply(
        chatId,
        `⚠️ لا يمكن تنفيذ ${command} على طلب حالته الحالية: ${STATUS_LABELS[order.status as OrderStatus] ?? order.status}.`,
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
      await reply(chatId, `✅ تم تحديث الطلب ${result.reference}: ${result.from} ← ${result.to}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "خطأ غير متوقع";
      await reply(chatId, `⚠️ تعذّر تحديث الطلب ${order.reference}: ${msg}`);
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
    await reply(
      chatId,
      rows.length
        ? `📦 المنتجات\n${rows.map((p) => `${p.name} | ${p.sku} | المخزون: ${p.stock}`).join("\n")}`
        : "لا توجد منتجات مطابقة.",
    );
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
    await reply(
      chatId,
      rows.length
        ? rows
            .map(
              (p) =>
                `${p.name} | ${p.sku} | ${money(p.price)} | المخزون ${p.stock} | ${p.isActive ? "نشط" : "متوقف"}`,
            )
            .join("\n")
        : "لم يتم العثور على منتجات.",
    );
    return;
  }

  if (command === "/setstock") {
    const sku = args[0];
    const quantity = Number(args[1]);
    if (!sku || !Number.isInteger(quantity) || quantity < 0 || quantity > 1000000) {
      await reply(chatId, "الاستخدام: /setstock SKU كمية (صفر أو أكثر)");
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
        ? `✅ تم تحديث مخزون ${updated[0].name} إلى ${updated[0].stock}.`
        : "لم يتم العثور على SKU.",
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
    await reply(
      chatId,
      rows.length
        ? `🧾 آخر العمليات\n${rows.map((r) => `${r.action} | ${r.entity} ${r.entityId ?? ""} | ${r.createdAt.toLocaleString("ar-EG")}`).join("\n")}`
        : "لا يوجد سجل عمليات.",
    );
    return;
  }

  await reply(chatId, "أمر غير معروف. استخدم /help لعرض الأوامر.");
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
    await answerCallback(cb.id, "⏳ عدد كبير من الضغطات. انتظر قليلاً.", true);
    return;
  }

  const role = await getRole(senderId);
  if (!role) {
    await answerCallback(cb.id, "⛔ غير مصرح", true);
    return;
  }

  const [type, action, ...rest] = cb.data.split(":");
  const reference = rest[0] ?? "";

  // الإجراءات الحساسة للمالك فقط ولازم تكون في الخاص
  const ownerActions = new Set(["stats", "profits", "managers"]);
  if (ownerActions.has(type) && role !== "owner") {
    await answerCallback(cb.id, "⛔ للمالك فقط", true);
    return;
  }
  if (ownerActions.has(type) && chatType !== "private") {
    await answerCallback(cb.id, "🔒 استخدم هذا في المحادثة الخاصة", true);
    return;
  }

  try {
    /* ---------------- menu ---------------- */
    if (type === "menu") {
      await answerCallback(cb.id);
      await editMessage(chatId, messageId, "اختر من القائمة:", mainMenu(role));
      return;
    }

    /* ---------------- help ---------------- */
    if (type === "help") {
      await answerCallback(cb.id);
      await editMessage(chatId, messageId, buildHelp(role), backButton("menu"));
      return;
    }

    /* ---------------- list:new / list:pending ---------------- */
    if (type === "list") {
      await answerCallback(cb.id);
      const statuses = action === "new" ? ["pending" as const] : (["pending", "payment_review"] as const);
      const rows = await db
        .select({ reference: orders.reference, total: orders.total, status: orders.status })
        .from(orders)
        .where(inArray(orders.status, statuses as unknown as string[]))
        .orderBy(desc(orders.createdAt))
        .limit(10);

      if (!rows.length) {
        await editMessage(chatId, messageId, "لا توجد طلبات حالياً.", backButton("menu"));
        return;
      }
      const lines = rows
        .map(
          (o) =>
            `${o.reference} | ${money(o.total)} | ${STATUS_LABELS[o.status as OrderStatus] ?? o.status}`,
        )
        .join("\n");
      await editMessage(chatId, messageId, `🛒 الطلبات\n${lines}\n\n👇 اضغط لعرض التفاصيل`, ordersListButtons(rows));
      return;
    }

    /* ---------------- view:REF ---------------- */
    if (type === "view") {
      const order = await findOrder(reference);
      if (!order) {
        await answerCallback(cb.id, "❌ لم يتم العثور على الطلب", true);
        return;
      }
      await answerCallback(cb.id);
      const body = `📦 ${order.reference}\nالعميل: ${order.name}\nالهاتف: ${order.phone}\nالعنوان: ${order.governorate} - ${order.city} - ${order.area}\nالإجمالي: ${money(order.total)}\nالحالة: ${STATUS_LABELS[order.status as OrderStatus] ?? order.status}`;
      await editMessage(
        chatId,
        messageId,
        body,
        orderActions({ reference: order.reference, status: order.status as OrderStatus }),
      );
      return;
    }

    /* ---------------- act:<action>:REF ---------------- */
    if (type === "act") {
      const order = await findOrder(reference);
      if (!order) {
        await answerCallback(cb.id, "❌ لم يتم العثور على الطلب", true);
        return;
      }

      // إلغاء: خطوة تأكيد أولاً
      if (action === "cancel") {
        if (FORBIDDEN_STATUS.cancel.includes(order.status)) {
          await answerCallback(
            cb.id,
            `⚠️ لا يمكن الإلغاء (${STATUS_LABELS[order.status as OrderStatus] ?? order.status})`,
            true,
          );
          return;
        }
        await answerCallback(cb.id);
        await editMessage(
          chatId,
          messageId,
          `⚠️ تأكيد إلغاء الطلب ${order.reference}؟\n\nهذا الإجراء نهائي ولا يمكن التراجع عنه.`,
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
        await answerCallback(
          cb.id,
          `⚠️ لا يمكن تنفيذها (${STATUS_LABELS[order.status as OrderStatus] ?? order.status})`,
          true,
        );
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

      try {
        const result = await transitionOrder(order.id, target, actor, `callback:${action}`);

        await db.insert(auditLogs).values({
          userEmail: `telegram:${senderId}`,
          action: `telegram_order_${action}`,
          entity: "order",
          entityId: String(order.id),
          details: { reference: result.reference, from: result.from, to: result.to },
        });

        await answerCallback(cb.id, "✅ تم التنفيذ");
        await editMessage(
          chatId,
          messageId,
          `✅ ${order.reference}\n${STATUS_LABELS[result.from as OrderStatus] ?? result.from} ← ${STATUS_LABELS[result.to as OrderStatus] ?? result.to}`,
          orderActions({ reference: order.reference, status: result.to as OrderStatus }),
        );

        await notifyTelegramOrderStatus(result.reference, result.from, result.to);
        if (order.whatsappUpdatesConsent) {
          notifyWhatsappOrderStatus(order.phone, order.name, result.reference, result.to).catch(() => {});
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "خطأ غير متوقع";
        await answerCallback(cb.id, `⚠️ ${msg}`, true);
      }
      return;
    }

    /* ---------------- products:list / products:low ---------------- */
    if (type === "products") {
      await answerCallback(cb.id);
      const where =
        action === "low" ? sql`${products.stock} <= ${products.lowStockThreshold}` : undefined;
      const rows = await db
        .select({ name: products.name, sku: products.sku, stock: products.stock })
        .from(products)
        .where(where)
        .orderBy(products.name)
        .limit(15);
      const body = rows.length
        ? rows.map((p) => `${p.name} | ${p.sku} | ${p.stock}`).join("\n")
        : "لا توجد منتجات.";
      await editMessage(
        chatId,
        messageId,
        `📦 ${action === "low" ? "مخزون منخفض" : "المنتجات"}\n${body}`,
        backButton("menu"),
      );
      return;
    }

    /* ---------------- stats ---------------- */
    if (type === "stats") {
      await answerCallback(cb.id);
      const [row] = await db
        .select({
          total: sql<number>`count(*)::int`,
          pending: sql<number>`count(*) filter (where ${orders.status} = 'pending')::int`,
          today: sql<number>`count(*) filter (where ${orders.createdAt} >= date_trunc('day', now()))::int`,
        })
        .from(orders);
      await editMessage(
        chatId,
        messageId,
        `📊 إحصائيات RIVO\nإجمالي الطلبات: ${row.total}\nالمعلقة: ${row.pending}\nطلبات اليوم: ${row.today}`,
        backButton("menu"),
      );
      return;
    }

    /* ---------------- profits ---------------- */
    if (type === "profits") {
      await answerCallback(cb.id);
      const [row] = await db
        .select({
          realized: sql<number>`coalesce(sum(${orders.profit}) filter (where ${orders.status} = 'delivered' and ${orders.paymentConfirmedAt} is not null),0)::bigint`,
          expected: sql<number>`coalesce(sum(${orders.profit}) filter (where ${orders.status} in ('paid','sent_to_supplier','shipping')),0)::bigint`,
        })
        .from(orders);
      await editMessage(
        chatId,
        messageId,
        `💰 الأرباح\nالمحققة: ${money(Number(row.realized))}\nالمتوقعة: ${money(Number(row.expected))}`,
        backButton("menu"),
      );
      return;
    }

    /* ---------------- managers ---------------- */
    if (type === "managers") {
      await answerCallback(cb.id);
      const rows = await db
        .select()
        .from(telegramManagers)
        .where(eq(telegramManagers.isActive, true))
        .orderBy(telegramManagers.createdAt);
      const body = rows.length
        ? rows.map((m) => `${m.telegramId} — ${m.name} (${m.role})`).join("\n")
        : "لا يوجد مديرون.";
      await editMessage(chatId, messageId, `👥 المدراء\n${body}`, backButton("menu"));
      return;
    }

    await answerCallback(cb.id, "غير معروف", true);
  } catch (error) {
    console.error("callback_failed", {
      data: cb.data,
      senderId,
      error: error instanceof Error ? error.message : "unknown",
    });
    await answerCallback(cb.id, "⚠️ حدث خطأ غير متوقع", true);
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