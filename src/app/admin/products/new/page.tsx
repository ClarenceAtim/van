import { ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/admin";
import { getCategories } from "@/lib/catalog";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await getCategories();
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-3xl font-semibold">New product</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
