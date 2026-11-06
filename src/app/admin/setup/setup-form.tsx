"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/store/logo";
import { api } from "@/lib/client/api";

export function SetupForm({ requiresToken }: { requiresToken: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "", setupToken: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.password !== f.confirm) return setError("كلمتا المرور غير متطابقتين");
    setLoading(true);
    setError(null);
    try {
      await api("/api/admin/auth/setup", { method: "POST", json: { name: f.name, email: f.email, password: f.password, setupToken: f.setupToken || undefined } });
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const input = (k: keyof typeof f, label: string, type = "text") => (
    <div>
      <label htmlFor={k} className="label">{label}</label>
      <input id={k} type={type} required={k !== "setupToken" || requiresToken} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="input" dir={type === "text" && k === "name" ? "rtl" : "ltr"} />
    </div>
  );

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="glass w-full max-w-md space-y-4 rounded-3xl p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo href="/" />
          <h1 className="mt-2 flex items-center gap-2 text-xl font-extrabold"><ShieldCheck className="h-5 w-5 text-electric-400" /> إنشاء حساب المالك</h1>
          <p className="text-xs leading-6 text-white/50">هذه الخطوة تظهر مرة واحدة فقط عند تشغيل المتجر لأول مرة، وبعدها تُغلق نهائيًا.</p>
        </div>
        {input("name", "الاسم")}
        {input("email", "البريد الإلكتروني", "email")}
        {input("password", "كلمة المرور (10 أحرف على الأقل)", "password")}
        {input("confirm", "تأكيد كلمة المرور", "password")}
        {input("setupToken", "رمز الإعداد (ADMIN_SETUP_TOKEN)", "password")}
        {error && <p className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300" role="alert">{error}</p>}
        <button disabled={loading} className="btn-primary w-full">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "إنشاء الحساب والدخول"}</button>
      </form>
    </div>
  );
}
