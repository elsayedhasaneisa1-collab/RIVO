export const ORDER_STATUSES = [
  "pending",
  "payment_review",
  "paid",
  "sent_to_supplier",
  "shipping",
  "delivered",
  "cancelled",
  "returned",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "بانتظار الدفع",
  payment_review: "مراجعة الدفع",
  paid: "مدفوع",
  sent_to_supplier: "أُرسل للمورد",
  shipping: "قيد الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  returned: "مرتجع",
};

export const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  payment_review: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  paid: "bg-blue-500/15 text-blue-300 ring-blue-500/30",
  sent_to_supplier: "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30",
  shipping: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  delivered: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  cancelled: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  returned: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
};

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["payment_review", "paid", "cancelled"],
  payment_review: ["paid", "pending", "cancelled"],
  paid: ["sent_to_supplier", "cancelled"],
  sent_to_supplier: ["shipping", "cancelled"],
  shipping: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export const STOCK_RELEASING_STATUSES: OrderStatus[] = ["cancelled", "returned"];
export const PENDING_PROFIT_STATUSES: OrderStatus[] = ["paid", "sent_to_supplier", "shipping"];
export const EXPECTED_PROFIT_STATUSES: OrderStatus[] = ["pending", "payment_review", "paid", "sent_to_supplier", "shipping", "delivered"];

export function canTransition(from: string, to: string): boolean {
  const allowed = STATUS_TRANSITIONS[from as OrderStatus];
  return Array.isArray(allowed) && allowed.includes(to as OrderStatus);
}

export const ROLES = ["owner", "admin", "staff"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "مالك",
  admin: "مدير",
  staff: "موظف",
};

export type Permission =
  | "products"
  | "categories"
  | "orders"
  | "customers"
  | "coupons"
  | "inventory"
  | "analytics"
  | "profits"
  | "audit"
  | "settings"
  | "users"
  | "reviews";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ["products", "categories", "orders", "customers", "coupons", "inventory", "analytics", "profits", "audit", "settings", "users", "reviews"],
  admin: ["products", "categories", "orders", "customers", "coupons", "inventory", "analytics", "profits", "settings", "reviews"],
  staff: ["orders", "customers", "inventory", "reviews"],
};

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role as Role];
  return Array.isArray(perms) && perms.includes(permission);
}

export const GOVERNORATES = [
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "القليوبية",
  "الشرقية",
  "الدقهلية",
  "الغربية",
  "المنوفية",
  "البحيرة",
  "كفر الشيخ",
  "دمياط",
  "بورسعيد",
  "الإسماعيلية",
  "السويس",
  "الفيوم",
  "بني سويف",
  "المنيا",
  "أسيوط",
  "سوهاج",
  "قنا",
  "الأقصر",
  "أسوان",
  "البحر الأحمر",
  "الوادي الجديد",
  "مطروح",
  "شمال سيناء",
  "جنوب سيناء",
] as const;

export const SORT_OPTIONS = [
  { value: "newest", label: "الأحدث" },
  { value: "price_asc", label: "السعر: من الأقل" },
  { value: "price_desc", label: "السعر: من الأعلى" },
  { value: "best_selling", label: "الأكثر مبيعًا" },
  { value: "discount", label: "أعلى خصم" },
] as const;

export const PAGE_SIZE = 12;
