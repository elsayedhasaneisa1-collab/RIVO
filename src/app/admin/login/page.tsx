import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAdminUser } from "@/lib/server/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "دخول الإدارة", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await getAdminUser()) redirect("/admin");
  const r = await db.select({ c: sql<number>`count(*)::int` }).from(users);
  if (Number(r[0]?.c ?? 0) === 0) redirect("/admin/setup");
  return <LoginForm />;
}
