import { guardPage } from "@/lib/server/admin-page";
import { AuditView } from "./view";

export default async function Page() {
  await guardPage("audit");
  return <AuditView />;
}
