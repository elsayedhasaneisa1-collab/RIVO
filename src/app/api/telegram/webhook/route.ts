import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { waitUntil } from "@vercel/functions";
import { handleTelegramUpdate } from "@/lib/server/integrations/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** مقارنة آمنة ضد timing attacks */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** شكل الـ update اللي بيوصل من Telegram (الجزء اللي يهمنا) */
type IncomingUpdate = {
  update_id?: number;
  message?: unknown;
  callback_query?: unknown;
};

function isRelevantUpdate(update: unknown): update is IncomingUpdate {
  if (!update || typeof update !== "object") return false;
  const u = update as Record<string, unknown>;
  return Boolean(u.message) || Boolean(u.callback_query);
}

/** health check — مفيد لـ uptime monitors */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "rivo-telegram-webhook",
    time: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  // 1) تحقق من الـ secret
  const secret = process.env.RIVO_TELEGRAM_WEBHOOK_SECRET;
  const supplied = req.headers.get("x-telegram-bot-api-secret-token");

  if (!secret || !supplied || !safeEqual(supplied, secret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // 2) parse الـ JSON — لو فشل، 400 (Telegram ما بيعيدش على 400)
  let update: unknown;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // 3) تجاهل الـ updates غير المهمة بصمت (edits, joins, etc.)
  if (!isRelevantUpdate(update)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  // 4) رجّع 200 فورًا، ونفّذ في الخلفية — يمنع double execution
  //    لو الدالة أخدت وقت طويل، Telegram بيعيد المحاولة لو رجع 5xx/timeout.
  const task = handleTelegramUpdate(update as Parameters<typeof handleTelegramUpdate>[0])
    .catch((error: unknown) => {
      console.error(
        "telegram_webhook_bg_failed",
        error instanceof Error ? error.message : "unknown",
        { updateId: (update as IncomingUpdate).update_id },
      );
    });

  try {
    waitUntil(task);
  } catch {
    // بيئات مش بتدعم waitUntil (self-host, etc.) — الـ promise شغال بالفعل
    // والـ .catch مسك أي خطأ، فمفيش unhandled rejection.
  }

  return NextResponse.json({ ok: true });
}