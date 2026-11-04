import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="glass flex flex-col items-center justify-center rounded-3xl px-6 py-16 text-center">
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-electric-500/10 text-electric-400 ring-1 ring-electric-500/20">
        <Icon className="h-7 w-7" aria-hidden />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm leading-7 text-white/55">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-white/20 border-t-white ${className}`} aria-hidden />;
}
