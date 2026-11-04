"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/client/api";

export function ReviewForm({ productId }: { productId: number }) {
  const [rating, setRating] = useState(5);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    setError(null);
    try {
      await api("/api/reviews", { method: "POST", json: { productId, name, rating, comment } });
      setState("done");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  };

  if (state === "done") {
    return <div className="glass rounded-2xl p-5 text-sm text-emerald-300">شكرًا لك! سيظهر تقييمك بعد مراجعته.</div>;
  }

  return (
    <form onSubmit={submit} className="glass space-y-4 rounded-2xl p-5">
      <h3 className="font-bold">أضف تقييمك</h3>
      <div className="flex gap-1" role="radiogroup" aria-label="التقييم">
        {[1, 2, 3, 4, 5].map((i) => (
          <button type="button" key={i} role="radio" aria-checked={rating === i} aria-label={`${i} نجوم`} onClick={() => setRating(i)}>
            <Star className={`h-6 w-6 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-white/25"}`} />
          </button>
        ))}
      </div>
      <div>
        <label htmlFor="rv-name" className="label">الاسم</label>
        <input id="rv-name" required minLength={2} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className="input" />
      </div>
      <div>
        <label htmlFor="rv-comment" className="label">رأيك في المنتج</label>
        <textarea id="rv-comment" required minLength={3} maxLength={1000} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} className="input resize-none" />
      </div>
      {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
      <button disabled={state === "loading"} className="btn-primary">{state === "loading" ? "جارٍ الإرسال…" : "إرسال التقييم"}</button>
    </form>
  );
}
