"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import type { ProductCardData } from "@/lib/catalog";
import { PRICE_BUCKETS, SORTS, type ListingParams } from "@/lib/listing";
import { cn } from "@/lib/utils";

type Props = {
  /** Only the products on the current page — filtering/sorting/pagination run on the server. */
  products: ProductCardData[];
  total: number;
  pages: number;
  current: number;
  params: ListingParams;
  categories?: { slug: string; name: string }[];
  showCare: boolean;
};

export function ProductBrowser({ products, total, pages, current, params, categories, showCare }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const { category, price, care, inStock, sort } = params;

  function buildHref(p: ListingParams) {
    const q = new URLSearchParams();
    if (p.category) q.set("category", p.category);
    if (p.price) q.set("price", p.price);
    p.care.forEach((c) => q.append("care", c));
    if (p.inStock) q.set("instock", "1");
    if (p.sort !== "featured") q.set("sort", p.sort);
    if (p.page > 1) q.set("page", String(p.page));
    const qs = q.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  /** Filter/sort changes re-render the grid server-side without moving the scroll position. */
  function navigate(next: ListingParams) {
    router.replace(buildHref(next), { scroll: false });
  }

  function setParam(mutator: (p: ListingParams) => ListingParams) {
    navigate({ ...mutator({ ...params, care: [...params.care] }), page: 1 });
  }

  const activeFilters = Number(!!category) + Number(!!price) + care.length + Number(inStock);

  const filters = (
    <div className="space-y-6">
      {categories && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Category</legend>
          <div className="space-y-1.5">
            {[{ slug: "", name: "All products" }, ...categories].map((c) => (
              <label key={c.slug || "all"} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name="category" className="size-4 accent-primary" checked={category === c.slug} onChange={() => setParam((p) => ({ ...p, category: c.slug }))} />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Price</legend>
        <div className="space-y-1.5">
          {[{ id: "", label: "Any price" }, ...PRICE_BUCKETS].map((b) => (
            <label key={b.id || "any"} className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" name="price" className="size-4 accent-primary" checked={price === b.id} onChange={() => setParam((p) => ({ ...p, price: b.id }))} />
              {b.label}
            </label>
          ))}
        </div>
      </fieldset>
      {showCare && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Care level</legend>
          <div className="space-y-1.5">
            {(["beginner", "intermediate", "advanced"] as const).map((level) => (
              <label key={level} className="flex cursor-pointer items-center gap-2 text-sm capitalize">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={care.includes(level)}
                  onChange={(e) =>
                    setParam((p) => ({ ...p, care: e.target.checked ? [...p.care, level] : p.care.filter((c) => c !== level) }))
                  }
                />
                {level}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="size-4 accent-primary" checked={inStock} onChange={(e) => setParam((p) => ({ ...p, inStock: e.target.checked }))} />
        In stock only
      </label>
      {activeFilters > 0 && (
        <Button variant="outline" size="sm" onClick={() => router.replace(pathname, { scroll: false })}>
          Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside aria-label="Filters">
        <details className="rounded-xl border p-4 lg:hidden">
          <summary className="flex cursor-pointer items-center gap-2 font-medium">
            <SlidersHorizontal className="size-4" aria-hidden /> Filters {activeFilters > 0 && `(${activeFilters})`}
          </summary>
          <div className="pt-4">{filters}</div>
        </details>
        <div className="hidden lg:block">{filters}</div>
      </aside>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {total} {total === 1 ? "product" : "products"}
          </p>
          <label className="flex items-center gap-2 text-sm">
            Sort by
            <select
              value={sort}
              onChange={(e) => setParam((p) => ({ ...p, sort: e.target.value as ListingParams["sort"] }))}
              className="h-10 rounded-lg border border-input bg-background px-3"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {products.length === 0 ? (
          <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">No products match these filters.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((p, i) => (
              <li key={p.id} className="relative">
                <ProductCard product={p} priority={i < 2 && current === 1} headingLevel="h2" />
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {current > 1 && (
              <Link href={buildHref({ ...params, page: current - 1 })} rel="prev" className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium hover:bg-muted">
                Previous
              </Link>
            )}
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={buildHref({ ...params, page: n })}
                aria-current={n === current ? "page" : undefined}
                aria-label={`Page ${n}`}
                className={cn("inline-flex size-10 items-center justify-center rounded-lg border text-sm font-medium", n === current ? "border-forest bg-forest text-primary-foreground" : "hover:bg-muted")}
              >
                {n}
              </Link>
            ))}
            {current < pages && (
              <Link href={buildHref({ ...params, page: current + 1 })} rel="next" className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium hover:bg-muted">
                Next
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
