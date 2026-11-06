import type { Metadata } from "next";
import { SuccessView } from "./success-view";

export const metadata: Metadata = { title: "تم إنشاء طلبك", robots: { index: false } };

export default function OrderSuccessPage() {
  return <SuccessView />;
}
