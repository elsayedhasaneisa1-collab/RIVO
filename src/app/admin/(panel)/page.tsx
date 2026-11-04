import { guardPage } from "@/lib/server/admin-page";
import { DashboardView } from "./dashboard-view";

export default async function AdminHome() {
  const user = await guardPage();
  return <DashboardView name={user.name} />;
}
