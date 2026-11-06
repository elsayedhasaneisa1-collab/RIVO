import type { Metadata } from "next";
import { getSettings } from "@/lib/server/settings";
import { CheckoutForm } from "./checkout-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "إتمام الطلب", robots: { index: false } };

export default async function CheckoutPage() {
  const s = await getSettings();
  return <CheckoutForm paymentMethods={s.paymentMethods} />;
}
