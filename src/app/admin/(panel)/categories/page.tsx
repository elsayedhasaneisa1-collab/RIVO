import { guardPage } from "@/lib/server/admin-page";
import { CategoriesView } from "./view";

export default async function Page() {
  await guardPage("categories");
  return <CategoriesView />;
}
