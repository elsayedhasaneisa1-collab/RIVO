import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { images } from "@/db/schema";
import { ApiError, ok, route } from "@/lib/server/api";
import { logAudit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const MAX = 4 * 1024 * 1024;
const signatures: { mime: string; check: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", check: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/webp", check: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
  { mime: "image/gif", check: (b) => b.subarray(0, 3).toString() === "GIF" },
];

export const POST = route(async (req) => {
  const user = await requireAdmin();
  if (!["owner", "admin"].includes(user.role)) throw new ApiError(403, "ليس لديك صلاحية", "forbidden");
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") throw new ApiError(400, "لم يتم اختيار ملف", "no_file");
  if (file.size > MAX) throw new ApiError(413, "الحد الأقصى لحجم الصورة 4MB", "too_large");
  const buf = Buffer.from(await file.arrayBuffer());
  const sig = signatures.find((s) => s.check(buf));
  if (!sig) throw new ApiError(415, "صيغة غير مدعومة. استخدم JPG أو PNG أو WEBP", "bad_type");
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "rivo-images";

  if (supabaseUrl && serviceRoleKey) {
    const extension = sig.mime === "image/jpeg" ? "jpg" : sig.mime.split("/")[1];
    const objectPath = `${randomUUID()}.${extension}`;
    const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath}`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": sig.mime,
        "Cache-Control": "public, max-age=31536000, immutable",
        "x-upsert": "false",
      },
      body: buf,
      cache: "no-store",
    });
    if (!uploadResponse.ok) {
      const detail = await uploadResponse.text().catch(() => "");
      console.error("Supabase Storage upload failed:", uploadResponse.status, detail.slice(0, 300));
      throw new ApiError(502, "تعذر رفع الصورة إلى التخزين", "storage_upload_failed");
    }
    const url = `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath}`;
    await logAudit({ user, action: "upload", entity: "image", entityId: objectPath, details: { size: buf.length, mime: sig.mime, storage: "supabase" }, req });
    return ok({ url }, { status: 201 });
  }

  const [img] = await db.insert(images).values({ mime: sig.mime, size: buf.length, data: buf }).returning({ id: images.id });
  await logAudit({ user, action: "upload", entity: "image", entityId: img.id, details: { size: buf.length, mime: sig.mime, storage: "postgres-legacy" }, req });
  return ok({ url: `/api/images/${img.id}` }, { status: 201 });
});
