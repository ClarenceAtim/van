import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProduct, deleteProductImage } from "@/app/actions/admin";
import { ProductForm, type ProductFormValues } from "@/components/admin/product-form";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { getCategories } from "@/lib/catalog";
import { getProductWithImages } from "@/lib/db/admin";
import { productPath } from "@/lib/format";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { q } = await requireAdmin();
  const [data, categories, { created }] = await Promise.all([getProductWithImages(q, id), getCategories(), searchParams]);
  if (!data) notFound();
  const images = data.images;

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">{data.name}</h1>
        <Link href={productPath(data)} className="text-sm font-medium text-primary underline" target="_blank">View on site</Link>
      </div>
      {created && <p role="status" className="rounded-lg bg-sand/60 p-3 text-sm">Product created.</p>}

      <section aria-labelledby="images-heading" className="space-y-3">
        <h2 id="images-heading" className="text-lg font-semibold">Images</h2>
        {images.length ? (
          <ul className="flex flex-wrap gap-4">
            {images.map((img) => (
              <li key={img.id} className="w-40 space-y-2 text-xs">
                <Image src={img.url} alt={img.alt} width={160} height={120} className="aspect-[4/3] rounded-lg object-cover" />
                {img.placeholder && <p className="font-semibold text-amber-700">Placeholder</p>}
                <form action={deleteProductImage}>
                  <input type="hidden" name="imageId" value={img.id} />
                  <input type="hidden" name="productId" value={id} />
                  <Button type="submit" variant="outline" size="sm">Remove</Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No images yet.</p>
        )}
      </section>

      <ProductForm product={data as ProductFormValues} categories={categories} />

      <form action={deleteProduct} className="border-t pt-6">
        <input type="hidden" name="id" value={id} />
        <p className="mb-2 text-sm text-muted-foreground">Prefer unticking “Active” to hide a product. Deleting is permanent (past orders keep their details).</p>
        <Button type="submit" variant="destructive">Delete product</Button>
      </form>
    </div>
  );
}
