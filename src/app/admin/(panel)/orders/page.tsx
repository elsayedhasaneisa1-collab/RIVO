import { Suspense } from "react";
import { guardPage } from "@/lib/server/admin-page";
import { OrdersView } from "./view";

export default async function Page() {
  await guardPage("orders");
  return (
    <Suspense>
      <OrdersView />
    </Suspense>
  );
}
