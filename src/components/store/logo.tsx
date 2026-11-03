import Link from "next/link";

export function Logo({ href = "/", small = false }: { href?: string; small?: boolean }) {
  return (
    <Link href={href} className="group flex items-center gap-2" aria-label="RIVO الرئيسية" dir="ltr">
      <span className={`grid place-items-center rounded-xl bg-gradient-to-br from-electric-400 to-electric-700 font-display font-black text-white shadow-lg shadow-electric-500/30 ${small ? "h-8 w-8 text-base" : "h-9 w-9 text-lg"}`}>R</span>
      <span className={`font-display font-bold tracking-[0.25em] ${small ? "text-lg" : "text-xl"}`}>RIVO</span>
    </Link>
  );
}
