export function formatMoney(minor: number | null | undefined): string {
  const value = (minor ?? 0) / 100;
  return `${new Intl.NumberFormat("ar-EG", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)} ج.م`;
}

export function toMinor(major: number): number {
  return Math.round(major * 100);
}

export function toMajor(minor: number | null | undefined): number {
  return Math.round(minor ?? 0) / 100;
}

export function discountPercent(price: number, compareAt: number | null | undefined): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("ar-EG").format(n);
}

export function slugify(input: string): string {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function maskPhone(phone: string): string {
  if (phone.length < 6) return "***";
  return `${phone.slice(0, 3)}****${phone.slice(-3)}`;
}
