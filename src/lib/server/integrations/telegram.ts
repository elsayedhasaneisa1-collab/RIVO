import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, orders, products, telegramManagers } from "@/db/schema";
import { transitionOrder } from "@/lib/server/orders";
import type { AdminUser } from "@/lib/server/auth";
import { STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import { notifyWhatsappOrderStatus } from "@/lib/server/integrations/whatsapp";

type TelegramMessage = {
  message_id?: number;
  chat: { id: number; type?: string };
  from?: { id: number; first_name?: string; last_name?: string; username?: string };
  text?: string;
};

type TelegramUpdate = { message?: TelegramMessage };
type BotRole = "owner" | "admin" | "staff";

const token = () => process.env.RIVO_TELEGRAM_BOT_TOKEN;
const ownerId = () => process.env.RIVO_TELEGRAM_OWNER_ID?.trim();
const groupId = () => process.env.RIVO_TELEGRAM_GROUP_ID?.trim();

export async function telegramRequest(method: string, body: Record<string, unknown>) {
  const botToken = token();
  if (!botToken) return null;
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Telegram API ${method} failed: ${response.status}`);
  return response.json();
}

export async function sendTelegramText(text: string, chatId = groupId()) {
  if (!chatId || !token()) return;
  try {
    await telegramRequest("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true });
  } catch (error) {
    console.error("telegram_send_failed", error instanceof Error ? error.message : "unknown");
  }
}

export async function notifyTelegramNewOrder(order: { reference: string; name: string; phone: string; total: number }) {
  await sendTelegramText(
    `🛒 طلب جديد في RIVO\nرقم الطلب: ${order.reference}\nالعميل: ${order.name}\nالهاتف: ${order.phone}\nالإجمالي: ${(order.total / 100).toLocaleString("ar-EG")} ج.م\n\nاستخدم /order ${order.reference} للتفاصيل.`,
  );
}

export async function notifyTelegramOrderStatus(reference: string, from: string, to: string) {
  await sendTelegramText(`🔔 تحديث طلب في RIVO\nالطلب: ${reference}\nالحالة السابقة: ${STATUS_LABELS[from as OrderStatus] ?? from}\nالحالة الجديدة: ${STATUS_LABELS[to as OrderStatus] ?? to}`);
}

async function getRole(telegramId: string): Promise<BotRole | null> {
  if (ownerId() && telegramId === ownerId()) return "owner";
  const [manager] = await db.select({ role: telegramManagers.role, isActive: telegramManagers.isActive }).from(telegramManagers).where(eq(telegramManagers.telegramId, telegramId)).limit(1);
  if (!manager?.isActive || (manager.role !== "admin" && manager.role !== "staff")) return null;
  return manager.role;
}

async function reply(chatId: number, text: string) {
  await telegramRequest("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true });
}

function money(value: number) {
  return `${(Number(value || 0) / 100).toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
}

async function findOrder(value: string) {
  const normalized = value.trim().toUpperCase();
  const id = Number(value);
  const rows = await db.select().from(orders).where(Number.isInteger(id) && id > 0 ? sql`${orders.id} = ${id} OR ${orders.reference} = ${normalized}` : eq(orders.reference, normalized)).limit(1);
  return rows[0] ?? null;
}

async function runCommand(message: TelegramMessage) {
  const text = message.text?.trim() ?? "";
  if (!text.startsWith("/")) return;
  const chatId = message.chat.id;
  const senderId = String(message.from?.id ?? "");
  const [rawCommand, ...args] = text.split(/\s+/);
  const command = rawCommand.split("@")[0].toLowerCase();

  if (command === "/id") {
    await reply(chatId, `Telegram ID: ${senderId}\nChat ID: ${chatId}`);
    return;
  }
  if (command === "/start" || command === "/help") {
    await reply(chatId, "🤖 RIVO BOT\n\n/id — معرفة المعرفات\n/help — المساعدة\n\nللمديرين المعتمدين:\n/orders — آخر الطلبات\n/neworders — الطلبات الجديدة\n/pending — الطلبات المعلقة\n/order رقم — تفاصيل طلب\n/confirm رقم — تأكيد الدفع\n/cancel رقم — إلغاء طلب\n/ship رقم — تحديث الشحن\n/delivered رقم — تأكيد التسليم\n/products — المنتجات\n/product SKU — تفاصيل منتج\n/search كلمة — البحث عن منتج\n/lowstock — مخزون منخفض\n/outstock — منتجات نافدة\n/setstock SKU كمية — تعديل المخزون\n/activity — آخر سجل تغييرات\n\nللمالك فقط:\n/stats — إحصائيات المتجر\n/profits — الأرباح\n/managers — المديرون\n/addadmin ID admin|staff — إضافة مدير\n/removeadmin ID — حذف مدير");
    return;
  }

  const role = await getRole(senderId);
  if (!role) {
    await reply(chatId, "⛔ هذا الأمر متاح للمالك والمديرين المعتمدين فقط. أرسل /id للمالك لمعرفة Telegram ID الخاص بك.");
    return;
  }

  if (groupId() && message.chat.type !== "private" && String(chatId) !== groupId()) {
    await reply(chatId, "⛔ هذا الجروب غير معتمد لبوت RIVO.");
    return;
  }

  const ownerOnly = ["/stats", "/profits", "/managers", "/addadmin", "/removeadmin"];
  if (ownerOnly.includes(command) && role !== "owner") {
    await reply(chatId, "⛔ هذا الأمر متاح للمالك فقط.");
    return;
  }

  if (command === "/stats") {
    const [counts] = await db.select({ orders: sql<number>`count(*)::int`, customers: sql<number>`(select count(*)::int from customers)`, products: sql<number>`(select count(*)::int from products)` }).from(orders);
    const [today] = await db.select({ count: sql<number>`count(*)::int`, sales: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.status} in ('paid','sent_to_supplier','shipping','delivered')),0)::bigint` }).from(orders).where(sql`${orders.createdAt} >= date_trunc('day', now())`);
    await reply(chatId, `📊 إحصائيات RIVO\nإجمالي الطلبات: ${counts.orders}\nالعملاء: ${counts.customers}\nالمنتجات: ${counts.products}\nطلبات اليوم: ${today.count}\nمبيعات الطلبات اليوم: ${money(Number(today.sales))}`);
    return;
  }

  if (command === "/profits") {
    const [row] = await db.select({ realized: sql<number>`coalesce(sum(${orders.profit}) filter (where ${orders.status} = 'delivered' and ${orders.paymentConfirmedAt} is not null),0)::bigint`, expected: sql<number>`coalesce(sum(${orders.profit}) filter (where ${orders.status} in ('paid','sent_to_supplier','shipping')),0)::bigint` }).from(orders);
    await reply(chatId, `💰 الأرباح\nالأرباح المحققة: ${money(Number(row.realized))}\nالأرباح المتوقعة: ${money(Number(row.expected))}`);
    return;
  }

  if (command === "/managers") {
    const managers = await db.select().from(telegramManagers).where(eq(telegramManagers.isActive, true)).orderBy(telegramManagers.createdAt);
    await reply(chatId, managers.length ? `👥 مديرو البوت\n${managers.map((m) => `${m.telegramId} — ${m.name} (${m.role})`).join("\n")}` : "لا يوجد مديرون مضافون.");
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
    await db.insert(telegramManagers).values({ telegramId: id, role: managerRole, name: `Manager ${id}` }).onConflictDoUpdate({ target: telegramManagers.telegramId, set: { role: managerRole, isActive: true } });
    await db.insert(auditLogs).values({ userEmail: `telegram:${senderId}`, action: "telegram_manager_add", entity: "telegram_manager", entityId: id, details: { role: managerRole } });
    await reply(chatId, `✅ تمت إضافة ${id} بصلاحية ${managerRole}.`);
    return;
  }

  if (command === "/removeadmin") {
    const id = args[0];
    if (!id || !/^\d{5,20}$/.test(id)) {
      await reply(chatId, "الاستخدام: /removeadmin TELEGRAM_ID");
      return;
    }
    const removed = await db.delete(telegramManagers).where(eq(telegramManagers.telegramId, id)).returning({ id: telegramManagers.id });
    if (removed.length) await db.insert(auditLogs).values({ userEmail: `telegram:${senderId}`, action: "telegram_manager_remove", entity: "telegram_manager", entityId: id });
    await reply(chatId, removed.length ? `✅ تم حذف المدير ${id}.` : "لم يتم العثور على هذا المدير.");
    return;
  }

  if (["/orders", "/neworders", "/pending"].includes(command)) {
    const query = db.select({ reference: orders.reference, name: orders.name, total: orders.total, status: orders.status, createdAt: orders.createdAt }).from(orders);
    const rows = command === "/neworders"
      ? await query.where(eq(orders.status, "pending")).orderBy(desc(orders.createdAt)).limit(10)
      : command === "/pending"
        ? await query.where(inArray(orders.status, ["pending", "payment_review"])).orderBy(desc(orders.createdAt)).limit(10)
        : await query.orderBy(desc(orders.createdAt)).limit(10);
    await reply(chatId, rows.length ? `🛒 الطلبات\n${rows.map((o) => `${o.reference} | ${o.name} | ${money(o.total)} | ${o.status}`).join("\n")}` : "لا توجد طلبات.");
    return;
  }

  if (command === "/order") {
    const order = args[0] ? await findOrder(args[0]) : null;
    if (!order) { await reply(chatId, "لم يتم العثور على الطلب. مثال: /order RV-260101-ABC234"); return; }
    await reply(chatId, `📦 تفاصيل الطلب ${order.reference}\nالعميل: ${order.name}\nالهاتف: ${order.phone}\nالعنوان: ${order.governorate} - ${order.city} - ${order.area}\nالإجمالي: ${money(order.total)}\nالحالة: ${order.status}\nتاريخ الطلب: ${order.createdAt.toLocaleString("ar-EG")}`);
    return;
  }

  if (["/confirm", "/cancel", "/ship", "/delivered"].includes(command)) {
    const order = args[0] ? await findOrder(args[0]) : null;
    if (!order) { await reply(chatId, "اكتب رقم الطلب بعد الأمر."); return; }
    let target: OrderStatus;
    if (command === "/confirm") target = "paid";
    else if (command === "/cancel") target = "cancelled";
    else if (command === "/delivered") target = "delivered";
    else target = order.status === "paid" ? "sent_to_supplier" : "shipping";
    const actor: AdminUser = { id: 0, email: `telegram:${senderId}`, name: message.from?.first_name ?? "Telegram Manager", role: role === "owner" ? "owner" : role };
    const result = await transitionOrder(order.id, target, actor, `تم التحديث من Telegram بواسطة ${senderId}`);
    await db.insert(auditLogs).values({ userEmail: `telegram:${senderId}`, action: "telegram_order_status", entity: "order", entityId: String(order.id), details: { reference: result.reference, from: result.from, to: result.to } });
    await notifyTelegramOrderStatus(result.reference, result.from, result.to);
    if (order.whatsappUpdatesConsent) await notifyWhatsappOrderStatus(order.phone, order.name, result.reference, result.to);
    await reply(chatId, `✅ تم تحديث الطلب ${result.reference}: ${result.from} ← ${result.to}`);
    return;
  }

  if (command === "/products" || command === "/lowstock" || command === "/outstock") {
    const query = db.select({ name: products.name, sku: products.sku, stock: products.stock }).from(products);
    const rows = command === "/lowstock"
      ? await query.where(sql`${products.stock} <= ${products.lowStockThreshold}`).orderBy(products.name).limit(15)
      : command === "/outstock"
        ? await query.where(eq(products.stock, 0)).orderBy(products.name).limit(15)
        : await query.orderBy(products.name).limit(15);
    await reply(chatId, rows.length ? `📦 المنتجات\n${rows.map((p) => `${p.name} | ${p.sku} | المخزون: ${p.stock}`).join("\n")}` : "لا توجد منتجات مطابقة.");
    return;
  }

  if (command === "/product" || command === "/search") {
    const term = args.join(" ").trim();
    if (!term) { await reply(chatId, "اكتب اسم المنتج أو SKU بعد الأمر."); return; }
    const rows = await db.select({ name: products.name, sku: products.sku, stock: products.stock, price: products.price, isActive: products.isActive }).from(products).where(sql`${products.sku} ilike ${term} OR ${products.name} ilike ${`%${term}%`}`).limit(10);
    await reply(chatId, rows.length ? rows.map((p) => `${p.name} | ${p.sku} | ${money(p.price)} | المخزون ${p.stock} | ${p.isActive ? "نشط" : "متوقف"}`).join("\n") : "لم يتم العثور على منتجات.");
    return;
  }

  if (command === "/setstock") {
    const sku = args[0];
    const quantity = Number(args[1]);
    if (!sku || !Number.isInteger(quantity) || quantity < 0 || quantity > 1000000) { await reply(chatId, "الاستخدام: /setstock SKU كمية (صفر أو أكثر)"); return; }
    const updated = await db.update(products).set({ stock: quantity, updatedAt: new Date() }).where(eq(products.sku, sku)).returning({ id: products.id, name: products.name, stock: products.stock });
    if (updated.length) await db.insert(auditLogs).values({ userEmail: `telegram:${senderId}`, action: "telegram_stock_update", entity: "product", entityId: String(updated[0].id), details: { sku, stock: quantity } });
    await reply(chatId, updated.length ? `✅ تم تحديث مخزون ${updated[0].name} إلى ${updated[0].stock}.` : "لم يتم العثور على SKU.");
    return;
  }

  if (command === "/activity") {
    const rows = await db.select({ action: auditLogs.action, entity: auditLogs.entity, entityId: auditLogs.entityId, createdAt: auditLogs.createdAt }).from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(8);
    await reply(chatId, rows.length ? `🧾 آخر العمليات\n${rows.map((r) => `${r.action} | ${r.entity} ${r.entityId ?? ""} | ${r.createdAt.toLocaleString("ar-EG")}`).join("\n")}` : "لا يوجد سجل عمليات.");
    return;
  }

  await reply(chatId, "أمر غير معروف. استخدم /help لعرض الأوامر.");
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  const message = update.message;
  if (!message?.text || !message.from) return;
  await runCommand(message);
}
