import { NextRequest, NextResponse } from "next/server";
import { handleTelegramUpdate } from "@/lib/server/integrations/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = process.env.RIVO_TELEGRAM_WEBHOOK_SECRET;
  const supplied = req.headers.get("x-telegram-bot-api-secret-token");
  if (!secret || !supplied || supplied !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const update = await req.json();
    await handleTelegramUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("telegram_webhook_failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
