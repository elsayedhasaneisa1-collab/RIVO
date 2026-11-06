import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/shell";
import { ROLE_PERMISSIONS } from "@/lib/constants";
import { guardPage } from "@/lib/server/admin-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "لوحة الإدارة", robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const user = await guardPage();
  return (
    <AdminShell user={{ name: user.name, email: user.email, role: user.role }} permissions={ROLE_PERMISSIONS[user.role]}>
      {children}
    </AdminShell>
  );
}
