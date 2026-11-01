import Link from "next/link";
import { ReviewForm } from "@/components/account/review-form";
import { getProductsBySlugs } from "@/lib/catalog";
import { productPath } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { slug as slugSchema } from "@/lib/validation";

export const metadata = { title: "Write a review" };

export default async function NewReviewPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const slug = slugSchema.safeParse((await searchParams).product);
  const [product] = slug.success ? await getProductsBySlugs([slug.data]) : [];
  if (!product) return <p>Product not found.</p>;

  const supabase = await createClient();
  const { data: row } = await supabase.from("products").select("id").eq("slug", product.slug).maybeSingle();
  const { data: purchased } = row ? await supabase.rpc("has_purchased", { p_product_id: row.id }) : { data: false };

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-3xl font-semibold">Review {product.name}</h1>
      {purchased ? (
        <ReviewForm productSlug={product.slug} />
      ) : (
        <p className="rounded-xl bg-muted p-5">
          Reviews are only open to customers who bought this product, so every review comes from a verified buyer.{" "}
          <Link href={productPath(product)} className="font-medium text-primary underline">
            Back to the product
          </Link>
        </p>
      )}
    </div>
  );
}
