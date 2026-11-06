"use client";

import { KeyRound, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Empty, ErrorBox, Loading, Modal, PageHeader, Table, useAdminData, useToast } from "@/components/admin/ui";
import { api } from "@/lib/client/api";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { formatDate } from "@/lib/format";

type U = { id: number; name: string; email: string; role: Role; isActive: boolean; lastLoginAt: string | null; createdAt: string };

export function UsersView() {
  const { data, error, loading, reload } = useAdminData<{ items: U[] }>("/api/admin/users");
  const toast = useToast();
  const [create, setCreate] = useState<{ name: string; email: string; password: string; role: "admin" | "staff" } | null>(null);
  const [pwd, setPwd] = useState<{ user: U; password: string } | null>(null);

  const call = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast.show(msg);
      reload();
      return true;
    } catch (e) {
      toast.show((e as Error).message, "err");
      return false;
    }
  };

  return (
    <div>
      {toast.node}
      <PageHeader
        title="فريق العمل والصلاحيات"
        description="المالك: كل الصلاحيات · المدير: كل شيء عدا الفريق والسجل · الموظف: الطلبات والعملاء والمخزون والتقييمات بدون الأرباح"
        actions={<button onClick={() => setCreate({ name: "", email: "", password: "", role: "staff" })} className="btn-primary !py-2.5 text-sm"><Plus className="h-4 w-4" /> عضو جديد</button>}
      />
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (data.items.length === 0 ? <Empty text="لا يوجد مستخدمون" /> : (
        <Table head={["الاسم", "البريد", "الدور", "الحالة", "آخر دخول", ""]}>
          {data.items.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-3 font-semibold">{u.name}</td>
              <td className="px-4 py-3 text-xs" dir="ltr">{u.email}</td>
              <td className="px-4 py-3">
                {u.role === "owner" ? <span className="rounded-full bg-electric-500/15 px-2 py-0.5 text-xs text-electric-300">{ROLE_LABELS.owner}</span> : (
                  <select value={u.role} onChange={(e) => call(() => api(`/api/admin/users/${u.id}`, { method: "PATCH", json: { role: e.target.value } }), "تم تحديث الدور")} className="input !w-auto !py-1 text-xs" aria-label="الدور">
                    <option value="admin">{ROLE_LABELS.admin}</option>
                    <option value="staff">{ROLE_LABELS.staff}</option>
                  </select>
                )}
              </td>
              <td className="px-4 py-3">
                {u.role === "owner" ? <span className="text-xs text-emerald-300">نشط</span> : (
                  <button onClick={() => call(() => api(`/api/admin/users/${u.id}`, { method: "PATCH", json: { isActive: !u.isActive } }), "تم التحديث")} className={`rounded-full px-2 py-0.5 text-xs ${u.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                    {u.isActive ? "نشط" : "موقوف"}
                  </button>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-white/45">{formatDate(u.lastLoginAt)}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button onClick={() => setPwd({ user: u, password: "" })} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10" aria-label="تغيير كلمة المرور"><KeyRound className="h-4 w-4" /></button>
                  {u.role !== "owner" && <button onClick={() => confirm(`حذف ${u.name}؟`) && call(() => api(`/api/admin/users/${u.id}`, { method: "DELETE" }), "تم الحذف")} className="grid h-8 w-8 place-items-center rounded-lg text-rose-300 hover:bg-rose-500/10" aria-label="حذف"><Trash2 className="h-4 w-4" /></button>}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ))}
      <Modal open={create !== null} onClose={() => setCreate(null)} title="إضافة عضو">
        {create && (
          <form onSubmit={async (e) => { e.preventDefault(); if (await call(() => api("/api/admin/users", { method: "POST", json: create }), "تمت الإضافة")) setCreate(null); }} className="space-y-4">
            <div><label className="label" htmlFor="u-n">الاسم</label><input id="u-n" required value={create.name} onChange={(e) => setCreate({ ...create, name: e.target.value })} className="input" /></div>
            <div><label className="label" htmlFor="u-e">البريد</label><input id="u-e" type="email" required value={create.email} onChange={(e) => setCreate({ ...create, email: e.target.value })} className="input" dir="ltr" /></div>
            <div><label className="label" htmlFor="u-p">كلمة المرور (10+ أحرف)</label><input id="u-p" type="password" required minLength={10} value={create.password} onChange={(e) => setCreate({ ...create, password: e.target.value })} className="input" dir="ltr" autoComplete="new-password" /></div>
            <div><label className="label" htmlFor="u-r">الدور</label><select id="u-r" value={create.role} onChange={(e) => setCreate({ ...create, role: e.target.value as "admin" | "staff" })} className="input"><option value="staff">موظف</option><option value="admin">مدير</option></select></div>
            <button className="btn-primary w-full">إضافة</button>
          </form>
        )}
      </Modal>
      <Modal open={pwd !== null} onClose={() => setPwd(null)} title={`كلمة مرور جديدة: ${pwd?.user.name ?? ""}`}>
        {pwd && (
          <form onSubmit={async (e) => { e.preventDefault(); if (await call(() => api(`/api/admin/users/${pwd.user.id}`, { method: "PATCH", json: { password: pwd.password } }), "تم تغيير كلمة المرور")) setPwd(null); }} className="space-y-4">
            <input type="password" required minLength={10} value={pwd.password} onChange={(e) => setPwd({ ...pwd, password: e.target.value })} className="input" dir="ltr" autoComplete="new-password" aria-label="كلمة المرور الجديدة" />
            <p className="text-xs text-white/45">سيتم تسجيل خروج المستخدم من كل الأجهزة.</p>
            <button className="btn-primary w-full">حفظ</button>
          </form>
        )}
      </Modal>
    </div>
  );
}
