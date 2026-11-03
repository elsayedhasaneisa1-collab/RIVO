import { guardPage } from "@/lib/server/admin-page";
import { UsersView } from "./view";

export default async function Page() {
  await guardPage("users");
  return <UsersView />;
}
