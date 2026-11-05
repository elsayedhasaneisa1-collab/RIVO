import { guardPage } from "@/lib/server/admin-page";
import { InventoryView } from "./view";

export default async function Page() {
  await guardPage("inventory");
  return <InventoryView />;
}
