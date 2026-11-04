import { ProductForm } from "@/components/admin/product-form";
import { guardPage } from "@/lib/server/admin-page";

export default async function Page() {
  await guardPage("products");
  return <ProductForm />;
}
