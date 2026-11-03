import { guardPage } from "@/lib/server/admin-page";
import { SettingsView } from "./view";

export default async function Page() {
  await guardPage("settings");
  return <SettingsView />;
}
