import { ProductForm } from "@/components/admin/product-form";
import { guardPage } from "@/lib/server/admin-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await guardPage("products");
  const { id } = await params;
  return <ProductForm id={id} />;
}
