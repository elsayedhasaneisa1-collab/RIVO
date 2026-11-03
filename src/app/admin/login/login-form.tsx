"use client";

import { motion } from "framer-motion";
import { Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/store/logo";
import { api } from "@/lib/client/api";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api("/api/admin/auth/login", { method: "POST", json: { email, password } });
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-electric-500/20 blur-[120px]" />
      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="glass relative w-full max-w-sm space-y-5 rounded-3xl p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo href="/" />
          <h1 className="mt-2 text-xl font-extrabold">دخول لوحة الإدارة</h1>
          <p className="flex items-center gap-1.5 text-xs text-white/45"><Lock className="h-3.5 w-3.5" /> منطقة مخصصة لفريق العمل فقط</p>
        </div>
        <div>
          <label htmlFor="email" className="label">البريد الإلكتروني</label>
          <input id="email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="input" dir="ltr" />
        </div>
        <div>
          <label htmlFor="password" className="label">كلمة المرور</label>
          <input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" dir="ltr" />
        </div>
        {error && <p className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300" role="alert">{error}</p>}
        <button disabled={loading} className="btn-primary w-full">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "تسجيل الدخول"}</button>
      </motion.form>
    </div>
  );
}
