import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "إعداد المتجر", robots: { index: false, follow: false } };

export default async function SetupPage() {
  const r = await db.select({ c: sql<number>`count(*)::int` }).from(users);
  if (Number(r[0]?.c ?? 0) > 0) redirect("/admin/login");
  return <SetupForm requiresToken={Boolean(process.env.ADMIN_SETUP_TOKEN)} />;
}
