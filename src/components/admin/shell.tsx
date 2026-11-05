"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  ScrollText,
  Settings,
  ShieldCheck,
  TicketPercent,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/store/logo";
import { api } from "@/lib/client/api";
import { ROLE_LABELS, type Permission, type Role } from "@/lib/constants";

const NAV: { href: string; label: string; icon: typeof Package; perm?: Permission }[] = [
  { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/admin/orders", label: "الطلبات", icon: ClipboardList, perm: "orders" },
  { href: "/admin/products", label: "المنتجات", icon: Package, perm: "products" },
  { href: "/admin/categories", label: "التصنيفات", icon: FolderTree, perm: "categories" },
  { href: "/admin/inventory", label: "المخزون", icon: Boxes, perm: "inventory" },
  { href: "/admin/customers", label: "العملاء", icon: Users, perm: "customers" },
  { href: "/admin/coupons", label: "الخصومات", icon: TicketPercent, perm: "coupons" },
  { href: "/admin/reviews", label: "التقييمات", icon: MessageSquare, perm: "reviews" },
  { href: "/admin/analytics", label: "التحليلات والأرباح", icon: BarChart3, perm: "analytics" },
  { href: "/admin/audit", label: "سجل العمليات", icon: ScrollText, perm: "audit" },
  { href: "/admin/users", label: "فريق العمل", icon: ShieldCheck, perm: "users" },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings, perm: "settings" },
];

export function AdminShell({ user, permissions, children }: { user: { name: string; email: string; role: Role }; permissions: Permission[]; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => !n.perm || permissions.includes(n.perm));

  const logout = async () => {
    await api("/api/admin/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/admin/login");
    router.refresh();
  };

  const nav = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-2">
        <Logo href="/admin" small />
        <span className="rounded-md bg-electric-500/15 px-2 py-0.5 text-[10px] font-bold text-electric-300">ADMIN</span>
      </div>
      <nav className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="لوحة الإدارة">
        {items.map((n) => {
          const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-electric-500 text-white shadow-lg shadow-electric-500/25" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
        <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/60 hover:bg-white/5"><ExternalLink className="h-4 w-4" /> عرض المتجر</Link>
        <div className="rounded-xl bg-white/5 p-3">
          <p className="truncate text-sm font-bold">{user.name}</p>
          <p className="truncate text-xs text-white/45">{user.email} · {ROLE_LABELS[user.role]}</p>
        </div>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10"><LogOut className="h-4 w-4" /> تسجيل الخروج</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-950">
      <aside className="glass-strong fixed inset-y-0 right-0 z-30 hidden w-64 p-4 lg:block">{nav}</aside>
      <header className="glass-strong sticky top-0 z-20 flex h-14 items-center justify-between px-4 lg:hidden">
        <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-white/5" aria-label="القائمة"><Menu className="h-5 w-5" /></button>
        <Logo href="/admin" small />
        <span className="w-10" />
      </header>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="glass-strong fixed inset-y-0 right-0 z-50 w-72 p-4 lg:hidden" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}>
              <button onClick={() => setOpen(false)} className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-xl hover:bg-white/5" aria-label="إغلاق"><X className="h-5 w-5" /></button>
              {nav}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <main className="px-4 py-6 sm:px-6 lg:mr-64 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
