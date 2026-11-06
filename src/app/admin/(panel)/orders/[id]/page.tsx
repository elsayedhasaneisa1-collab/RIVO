import { guardPage } from "@/lib/server/admin-page";
import { OrderDetail } from "./view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await guardPage("orders");
  const { id } = await params;
  return <OrderDetail id={id} />;
}
