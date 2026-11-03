import { guardPage } from "@/lib/server/admin-page";
import { CustomersView } from "./view";

export default async function Page() {
  await guardPage("customers");
  return <CustomersView />;
}
