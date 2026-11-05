"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, X, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/client/api";
import { STATUS_LABELS, STATUS_STYLES, type OrderStatus } from "@/lib/constants";

export function useAdminData<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    api<T>(url)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: Error & { status?: number }) => {
        if (cancelled) return;
        if (e.status === 401) window.location.href = "/admin/login";
        setError(e.message);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [url, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload, setData };
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-white/50">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl p-5 ${className}`}>{children}</div>;
}

export function StatCard({ label, value, icon: Icon, hint, accent = false }: { label: string; value: ReactNode; icon: LucideIcon; hint?: string; accent?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 ${accent ? "bg-gradient-to-br from-electric-500 to-electric-700 shadow-xl shadow-electric-500/20" : "glass"}`}>
      <div className="flex items-start justify-between">
        <p className={`text-sm ${accent ? "text-white/80" : "text-white/55"}`}>{label}</p>
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${accent ? "bg-white/20" : "bg-electric-500/15 text-electric-300"}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-extrabold">{value}</p>
      {hint && <p className={`mt-1 text-xs ${accent ? "text-white/75" : "text-white/40"}`}>{hint}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = status as OrderStatus;
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${STATUS_STYLES[s] ?? "bg-white/10 ring-white/20"}`}>{STATUS_LABELS[s] ?? status}</span>;
}

export function Loading() {
  return (
    <div className="flex items-center justify-center py-20 text-white/50">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-rose-500/10 p-6 text-center text-rose-200">
      <AlertCircle className="h-6 w-6" />
      <p className="text-sm">{message}</p>
      {onRetry && <button onClick={onRetry} className="btn-ghost !py-2 text-sm">إعادة المحاولة</button>}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="py-14 text-center text-sm text-white/45">{text}</p>;
}

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-2 text-sm">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="btn-ghost !p-2" aria-label="السابق"><ChevronRight className="h-4 w-4" /></button>
      <span className="text-white/60">صفحة {page} من {pages}</span>
      <button disabled={page >= pages} onClick={() => onChange(page + 1)} className="btn-ghost !p-2" aria-label="التالي"><ChevronLeft className="h-4 w-4" /></button>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className={`glass-strong relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl p-6 sm:rounded-3xl ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">{title}</h2>
              <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/5" aria-label="إغلاق"><X className="h-5 w-5" /></button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-electric-500" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? "right-0.5" : "right-[22px]"}`} />
      </button>
    </label>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-white/10 text-right text-xs text-white/45">
            {head.map((h) => <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">{children}</tbody>
      </table>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  const node = (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          role="status"
          className={`fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-2xl ${toast.type === "ok" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}
        >
          {toast.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
  return { show: (text: string, type: "ok" | "err" = "ok") => setToast({ text, type }), node };
}
