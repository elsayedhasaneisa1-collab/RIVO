import type { Metadata } from "next";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "سلة التسوق", robots: { index: false } };

export default function CartPage() {
  return <CartView />;
}
