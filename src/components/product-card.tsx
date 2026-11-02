import Image from "next/image";
import Link from "next/link";
import { AddToCart } from "@/components/cart/add-to-cart";
import { Badge } from "@/components/ui/badge";
import type { ProductCardData } from "@/lib/catalog";
import { formatMoney, productPath } from "@/lib/format";

export function ProductCard({ product, priority = false, headingLevel = "h3" }: { product: ProductCardData; priority?: boolean; headingLevel?: "h2" | "h3" }) {
  const href = productPath(product);
  const onSale = product.compare_at_price_cents != null && product.compare_at_price_cents > product.price_cents;
  const Heading = headingLevel;
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md">
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-muted" tabIndex={-1} aria-hidden>
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.alt}
            fill
            sizes="(min-width: 1280px) 300px, (min-width: 768px) 33vw, 50vw"
            priority={priority}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-muted-foreground">Photo coming soon</span>
        )}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {onSale && <Badge className="bg-destructive text-white">Sale</Badge>}
          {product.is_live_animal && <Badge className="bg-forest text-primary-foreground">Captive bred</Badge>}
          {product.stock_quantity === 0 && <Badge variant="secondary">Sold out</Badge>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Heading className="font-sans text-base leading-snug font-semibold">
          <Link href={href} className="hover:underline focus-visible:underline">
            {product.name}
          </Link>
        </Heading>
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.short_description}</p>
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="text-lg font-semibold">{formatMoney(product.price_cents, product.currency)}</span>
          {onSale && (
            <span className="text-sm text-muted-foreground line-through">
              <span className="sr-only">Was </span>
              {formatMoney(product.compare_at_price_cents!, product.currency)}
            </span>
          )}
          {product.care_level && <span className="ml-auto text-xs capitalize text-muted-foreground">{product.care_level}</span>}
        </div>
        <AddToCart slug={product.slug} name={product.name} stock={product.stock_quantity} />
      </div>
    </article>
  );
}
