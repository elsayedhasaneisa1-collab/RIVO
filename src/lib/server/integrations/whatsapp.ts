import { STATUS_LABELS, type OrderStatus } from "@/lib/constants";

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  return digits;
}

export async function notifyWhatsappOrderStatus(phone: string, customerName: string, reference: string, status: string) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_STATUS_TEMPLATE_NAME;
  if (!accessToken || !phoneNumberId || !templateName) return;
  const to = normalizePhone(phone);
  if (!/^\d{10,15}$/.test(to)) return;
  const version = process.env.WHATSAPP_GRAPH_API_VERSION || "v23.0";
  const statusLabel = STATUS_LABELS[status as OrderStatus] ?? status;
  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "ar" },
          components: [{ type: "body", parameters: [{ type: "text", text: customerName.slice(0, 80) }, { type: "text", text: reference }, { type: "text", text: statusLabel }] }],
        },
      }),
      cache: "no-store",
    });
    if (!response.ok) console.error("whatsapp_status_notification_failed", response.status);
  } catch (error) {
    console.error("whatsapp_status_notification_failed", error instanceof Error ? error.message : "unknown");
  }
}
