"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { formatMoney } from "@/lib/format";

export function BarChart({ data, valueKey, label, color = "#2f6bff", money = true }: { data: { day: string; [k: string]: number | string | null }[]; valueKey: string; label: string; color?: string; money?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const values = data.map((d) => Number(d[valueKey] ?? 0));
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  const h = hover != null ? data[hover] : null;
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-sm text-white/55">{label}</p>
        <p className="text-sm font-bold">
          {h ? (
            <>
              <span className="text-white/45">{h.day}: </span>
              {money ? formatMoney(Number(h[valueKey] ?? 0)) : Number(h[valueKey] ?? 0)}
            </>
          ) : money ? (
            formatMoney(total)
          ) : (
            total
          )}
        </p>
      </div>
      <div className="flex h-44 items-end gap-[2px]" dir="ltr" onMouseLeave={() => setHover(null)}>
        {values.map((v, i) => (
          <div key={i} className="flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)}>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(v > 0 ? 3 : 1, (v / max) * 100)}%` }}
              transition={{ duration: 0.6, delay: i * 0.008 }}
              className="w-full rounded-t-[3px]"
              style={{ background: v > 0 ? color : "rgba(255,255,255,0.07)", opacity: hover == null || hover === i ? 1 : 0.45 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-white/35" dir="ltr">
        <span>{data[0]?.day}</span>
        <span>{data[data.length - 1]?.day}</span>
      </div>
    </div>
  );
}

export function HBar({ label, value, max, suffix }: { label: string; value: number; max: number; suffix?: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-white/65">{label}</span>
        <span className="font-bold">{value}{suffix}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <motion.div initial={{ width: 0 }} animate={{ width: `${max ? (value / max) * 100 : 0}%` }} transition={{ duration: 0.7 }} className="h-full rounded-full bg-electric-500" />
      </div>
    </div>
  );
}
