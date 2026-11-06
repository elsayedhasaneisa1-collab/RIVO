import { and, eq, gt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { hasPermission, type Permission, type Role } from "@/lib/constants";
import { ApiError } from "./api";
import { randomToken, sha256 } from "./security";

export const SESSION_COOKIE = "rivo_admin";
const SESSION_DAYS = 7;

export type AdminUser = { id: number; email: string; name: string; role: Role };

export async function createSession(userId: number) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.insert(sessions).values({ id: sha256(token), userId, expiresAt });
  const jar = await cookies();
  const secure = await isSecureRequest();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    partitioned: secure,
    path: "/",
    expires: expiresAt,
  });
}

async function isSecureRequest() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  return process.env.NODE_ENV === "production";
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, sha256(token)));
  const secure = await isSecureRequest();
  jar.set(SESSION_COOKIE, "", { httpOnly: true, secure, sameSite: secure ? "none" : "lax", partitioned: secure, path: "/", maxAge: 0 });
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 200) return null;
  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, isActive: users.isActive })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row || !row.isActive) return null;
  return { id: row.id, email: row.email, name: row.name, role: row.role as Role };
}

export async function requireAdmin(permission?: Permission): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) throw new ApiError(401, "يجب تسجيل الدخول", "unauthorized");
  if (permission && !hasPermission(user.role, permission)) throw new ApiError(403, "ليس لديك صلاحية لهذا الإجراء", "forbidden");
  return user;
}
