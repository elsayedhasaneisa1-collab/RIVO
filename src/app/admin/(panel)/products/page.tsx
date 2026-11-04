import { guardPage } from "@/lib/server/admin-page";
import { ProductsView } from "./view";

export default async function Page() {
  await guardPage("products");
  return <ProductsView />;
}
