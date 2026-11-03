import { Star } from "lucide-react";

export function Stars({ value, size = 14, className = "" }: { value: number; size?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`} aria-label={`التقييم ${value} من 5`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} width={size} height={size} className={i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-white/20"} aria-hidden />
      ))}
    </div>
  );
}
