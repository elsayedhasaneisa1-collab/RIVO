"use client";

import { useEffect, useRef, useState } from "react";
import type { CartItem } from "@/components/store/cart-context";
import { api } from "./api";

export type QuoteLine = { productId: number; name: string; slug: string; sku: string; image: string | null; unitPrice: number; quantity: number; lineTotal: number; maxQuantity: number; issue: string | null };
export type Quote = {
  lines: QuoteLine[];
  missing: number[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  coupon: { code: string; valid: boolean; message: string } | null;
  issues: string[];
};

export function useQuote(items: CartItem[], opts: { couponCode?: string | null; governorate?: string | null; enabled?: boolean } = {}) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const key = JSON.stringify([items.map((i) => [i.productId, i.quantity]), opts.couponCode ?? null, opts.governorate ?? null]);
  const enabled = opts.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;
    if (!items.length) {
      setQuote(null);
      setLoading(false);
      return;
    }
    const id = ++seq.current;
    setLoading(true);
    const t = setTimeout(() => {
      api<Quote>("/api/cart/quote", {
        method: "POST",
        json: { items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })), couponCode: opts.couponCode || null, governorate: opts.governorate || null },
      })
        .then((q) => {
          if (id === seq.current) {
            setQuote(q);
            setError(null);
          }
        })
        .catch((e: Error) => {
          if (id === seq.current) setError(e.message);
        })
        .finally(() => {
          if (id === seq.current) setLoading(false);
        });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return { quote, loading, error };
}
