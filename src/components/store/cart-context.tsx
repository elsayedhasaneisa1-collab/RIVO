"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = { productId: number; quantity: number; name: string; slug: string; image: string | null; price: number };

type CartContextValue = {
  items: CartItem[];
  count: number;
  ready: boolean;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const KEY = "rivo_cart_v1";

function sanitize(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((i) => i && typeof i.productId === "number" && typeof i.quantity === "number")
    .map((i) => ({
      productId: i.productId,
      quantity: Math.max(1, Math.min(100, Math.floor(i.quantity))),
      name: String(i.name ?? ""),
      slug: String(i.slug ?? ""),
      image: typeof i.image === "string" ? i.image : null,
      price: Number(i.price) || 0,
    }))
    .slice(0, 50);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      setItems(sanitize(JSON.parse(localStorage.getItem(KEY) ?? "[]")));
    } catch {
      setItems([]);
    }
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        try {
          setItems(sanitize(JSON.parse(e.newValue ?? "[]")));
        } catch {
          setItems([]);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, ready]);

  const add = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.productId === item.productId);
      if (existing) return prev.map((p) => (p.productId === item.productId ? { ...p, ...item, quantity: Math.min(100, p.quantity + quantity) } : p));
      return [...prev, { ...item, quantity }];
    });
  }, []);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    setItems((prev) => prev.map((p) => (p.productId === productId ? { ...p, quantity: Math.max(1, Math.min(100, quantity)) } : p)));
  }, []);

  const remove = useCallback((productId: number) => setItems((prev) => prev.filter((p) => p.productId !== productId)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, count: items.reduce((a, i) => a + i.quantity, 0), ready, add, setQuantity, remove, clear, drawerOpen, setDrawerOpen }),
    [items, ready, add, setQuantity, remove, clear, drawerOpen],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
