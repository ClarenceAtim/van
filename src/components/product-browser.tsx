"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import type { ProductCardData } from "@/lib/catalog";

const PAGE_SIZE = 12;

const PRICE_BUCKETS = [
  { id: "under-25", label: "Under $25", min: 0, max: 2499 },
  { id: "25-100", label: "$25 – $100", min: 2500, max: 10000 },
  { id: "100-250", label: "$100 – $250", min: 10001, max: 25000 },
  { id: "250-plus", label: "$250 and up", min: 25001, max: Infinity },
] as const;

const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "popular", label: "Best selling" },
  { id: "newest", label: "Newest" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
] as const;

type Props = {
  products: ProductCardData[];
  categories?: { slug: string; name: string }[];
};

export function ProductBrowser({ products, categories }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const category = params.get("category") ?? "";
  const price = params.get("price") ?? "";
  const care = params.getAll("care");
  const inStock = params.get("instock") === "1";
  const sort = params.get("sort") ?? "featured";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const showCare = products.some((p) => p.care_level);

  function setParam(mutator: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(params.toString());
    mutator(next);
    if (!next.has("page-keep")) next.delete("page");
    next.delete("page-keep");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const filtered = useMemo(() => {
    const bucket = PRICE_BUCKETS.find((b) => b.id === price);
    const list = products.filter(
      (p) =>
        (!category || p.category === category) &&
        (!bucket || (p.price_cents >= bucket.min && p.price_cents <= bucket.max)) &&
        (!care.length || (p.care_level && care.includes(p.care_level))) &&
        (!inStock || p.stock_quantity > 0),
    );
    const sorters: Record<string, (a: ProductCardData, b: ProductCardData) => number> = {
      featured: (a, b) => Number(b.featured) - Number(a.featured) || b.sales_count - a.sales_count,
      popular: (a, b) => b.sales_count - a.sales_count,
      newest: (a, b) => b.created_at.localeCompare(a.created_at),
      "price-asc": (a, b) => a.price_cents - b.price_cents,
      "price-desc": (a, b) => b.price_cents - a.price_cents,
    };
    return [...list].sort(sorters[sort] ?? sorters.featured);
  }, [products, category, price, care, inStock, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const activeFilters = Number(!!category) + Number(!!price) + care.length + Number(inStock);

  const filters = (
    <div className="space-y-6">
      {categories && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Category</legend>
          <div className="space-y-1.5">
            {[{ slug: "", name: "All products" }, ...categories].map((c) => (
              <label key={c.slug || "all"} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name="category" className="size-4 accent-primary" checked={category === c.slug} onChange={() => setParam((p) => (c.slug ? p.set("category", c.slug) : p.delete("category")))} />
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
              <input type="radio" name="price" className="size-4 accent-primary" checked={price === b.id} onChange={() => setParam((p) => (b.id ? p.set("price", b.id) : p.delete("price")))} />
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
                    setParam((p) => {
                      const next = e.target.checked ? [...care, level] : care.filter((c) => c !== level);
                      p.delete("care");
                      next.forEach((c) => p.append("care", c));
                    })
                  }
                />
                {level}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="size-4 accent-primary" checked={inStock} onChange={(e) => setParam((p) => (e.target.checked ? p.set("instock", "1") : p.delete("instock")))} />
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
            {filtered.length} {filtered.length === 1 ? "product" : "products"}
          </p>
          <label className="flex items-center gap-2 text-sm">
            Sort by
            <select
              value={sort}
              onChange={(e) => setParam((p) => (e.target.value === "featured" ? p.delete("sort") : p.set("sort", e.target.value)))}
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

        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">No products match these filters.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((p, i) => (
              <li key={p.id} className="relative">
                <ProductCard product={p} priority={i < 3 && current === 1} headingLevel="h2" />
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Button
                key={n}
                variant={n === current ? "default" : "outline"}
                size="icon"
                aria-label={`Page ${n}`}
                aria-current={n === current ? "page" : undefined}
                onClick={() => {
                  setParam((p) => {
                    if (n === 1) p.delete("page");
                    else p.set("page", String(n));
                    p.set("page-keep", "1");
                  });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                {n}
              </Button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
