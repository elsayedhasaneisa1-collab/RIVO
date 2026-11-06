import { guardPage } from "@/lib/server/admin-page";
import { CouponsView } from "./view";

export default async function Page() {
  await guardPage("coupons");
  return <CouponsView />;
}
