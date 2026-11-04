import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/reveal";

export function Section({ eyebrow, title, href, linkLabel = "عرض الكل", children }: { eyebrow?: string; title: string; href?: string; linkLabel?: string; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <Reveal className="mb-8 flex items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.3em] text-electric-400" dir="ltr" style={{ textAlign: "right" }}>{eyebrow}</p>}
          <h2 className="text-2xl font-extrabold sm:text-3xl">{title}</h2>
        </div>
        {href && (
          <Link href={href} className="group flex shrink-0 items-center gap-1.5 text-sm font-semibold text-white/60 hover:text-white">
            {linkLabel} <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          </Link>
        )}
      </Reveal>
      {children}
    </section>
  );
}
