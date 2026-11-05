import { guardPage } from "@/lib/server/admin-page";
import { AnalyticsView } from "./view";

export default async function Page() {
  await guardPage("analytics");
  return <AnalyticsView />;
}
