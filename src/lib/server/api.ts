import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = "error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) },
  });
}

export function route<C>(fn: (req: NextRequest, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
      }
      if (err instanceof ZodError) {
        const first = err.issues[0];
        return NextResponse.json(
          { error: first?.message ?? "بيانات غير صالحة", code: "validation", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
          { status: 400 },
        );
      }
      const pgCode = (err as { code?: string; cause?: { code?: string } })?.code ?? (err as { cause?: { code?: string } })?.cause?.code;
      if (pgCode === "23505") {
        return NextResponse.json({ error: "القيمة مستخدمة بالفعل", code: "duplicate" }, { status: 409 });
      }
      console.error(err);
      return NextResponse.json({ error: "حدث خطأ غير متوقع", code: "internal" }, { status: 500 });
    }
  };
}

export async function parseBody<T>(req: NextRequest, schema: ZodType<T>, maxBytes = 100_000): Promise<T> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new ApiError(413, "حجم الطلب كبير جدًا", "too_large");
  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > maxBytes) throw new ApiError(413, "حجم الطلب كبير جدًا", "too_large");
    raw = text ? JSON.parse(text) : {};
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(400, "صيغة JSON غير صالحة", "bad_json");
  }
  return schema.parse(raw);
}

export function parseId(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new ApiError(400, "معرّف غير صالح", "bad_id");
  return n;
}
