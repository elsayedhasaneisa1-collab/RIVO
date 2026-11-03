export type SupplierOrderPayload = {
  reference: string;
  customer: { name: string; phone: string; altPhone: string | null; governorate: string; city: string; area: string; address: string };
  items: { sku: string; supplierProductId: string | null; name: string; quantity: number; unitPrice: number }[];
  total: number;
  notes: string | null;
};

export type SupplierPushResult = { ok: true; supplierOrderRef: string } | { ok: false; mode: "manual"; reason: string };

export interface SupplierProvider {
  id: string;
  name: string;
  isConfigured(): boolean;
  describe(): { id: string; name: string; mode: "api" | "manual"; message: string };
  pushOrder(payload: SupplierOrderPayload): Promise<SupplierPushResult>;
}

class ManualProvider implements SupplierProvider {
  id = "manual";
  name = "إدارة يدوية";
  isConfigured() {
    return true;
  }
  describe() {
    return { id: this.id, name: this.name, mode: "manual" as const, message: "يتم تنفيذ الطلبات يدويًا مع المورد ثم تسجيل رقم طلب المورد." };
  }
  async pushOrder(): Promise<SupplierPushResult> {
    return { ok: false, mode: "manual", reason: "التنفيذ اليدوي مفعّل" };
  }
}

class TaagerProvider implements SupplierProvider {
  id = "taager";
  name = "Taager";
  isConfigured() {
    return Boolean(process.env.TAAGER_API_BASE_URL && process.env.TAAGER_API_KEY && process.env.TAAGER_ORDERS_PATH);
  }
  describe() {
    return this.isConfigured()
      ? { id: this.id, name: this.name, mode: "api" as const, message: "تم ضبط بيانات الربط الرسمية عبر متغيرات البيئة." }
      : {
          id: this.id,
          name: this.name,
          mode: "manual" as const,
          message: "لا يوجد ربط API رسمي مُفعّل. صدّر بيانات الطلب وأدخلها في لوحة Taager يدويًا، ثم سجّل رقم الطلب لدى المورد.",
        };
  }
  async pushOrder(payload: SupplierOrderPayload): Promise<SupplierPushResult> {
    if (!this.isConfigured()) return { ok: false, mode: "manual", reason: "ربط Taager غير مُفعّل" };
    const url = new URL(process.env.TAAGER_ORDERS_PATH as string, process.env.TAAGER_API_BASE_URL as string);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TAAGER_API_KEY}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { ok: false, mode: "manual", reason: `استجابة المورد ${res.status}` };
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const ref = String(data.id ?? data.orderId ?? data.reference ?? "");
    if (!ref) return { ok: false, mode: "manual", reason: "لم يُرجع المورد رقم طلب" };
    return { ok: true, supplierOrderRef: ref };
  }
}

const providers: Record<string, SupplierProvider> = {
  manual: new ManualProvider(),
  taager: new TaagerProvider(),
};

export function getSupplier(id: string | null | undefined): SupplierProvider {
  return providers[id ?? "manual"] ?? providers.manual;
}

export function listSuppliers() {
  return Object.values(providers).map((p) => p.describe());
}
