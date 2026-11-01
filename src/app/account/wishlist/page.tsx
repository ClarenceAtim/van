import Image from "next/image";
import Link from "next/link";
import { removeFromWishlist } from "@/app/actions/account";
import { AddToCart } from "@/components/cart/add-to-cart";
import { Button } from "@/components/ui/button";
import { getAllProducts } from "@/lib/catalog";
import { formatMoney, productPath } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("wishlists").select("product_id, products(slug)").order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as { product_id: string; products: { slug: string } | null }[];
  const bySlug = new Map((await getAllProducts()).map((p) => [p.slug, p]));
  const items = rows.flatMap((r) => {
    const p = r.products && bySlug.get(r.products.slug);
    return p ? [{ productId: r.product_id, p }] : [];
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Wishlist</h1>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          Nothing saved yet. Tap “Save to wishlist” on any product.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {items.map(({ productId, p }) => (
            <li key={productId} className="flex flex-wrap items-center gap-4 p-4">
              {p.images[0] && <Image src={p.images[0].thumbnail_url ?? p.images[0].url} alt={p.images[0].alt} width={96} height={72} className="rounded-lg object-cover" />}
              <div className="min-w-40 flex-1">
                <Link href={productPath(p)} className="font-medium hover:underline">
                  {p.name}
                </Link>
                <p className="text-sm text-muted-foreground">{formatMoney(p.price_cents)}</p>
              </div>
              <div className="w-40">
                <AddToCart slug={p.slug} name={p.name} stock={p.stock_quantity} />
              </div>
              <form action={removeFromWishlist}>
                <input type="hidden" name="productId" value={productId} />
                <Button variant="ghost" size="sm" type="submit">
                  Remove
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
