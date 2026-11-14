import type { CatalogProduct } from "@/lib/catalog";

/**
 * Shared shop-listing logic: filtering, sorting and pagination happen on the
 * server, so listing pages only ship the 12 products on the current page
 * (previously the whole catalogue was serialised to the browser).
 * Pure functions + constants only — the client filter controls import the
 * buckets/sorts from here too, so both sides can never drift apart.
 */
export const PAGE_SIZE = 12;

export const PRICE_BUCKETS = [
  { id: "under-25", label: "Under $25", min: 0, max: 2499 },
  { id: "25-100", label: "$25 – $100", min: 2500, max: 10000 },
  { id: "100-250", label: "$100 – $250", min: 10001, max: 25000 },
  { id: "250-plus", label: "$250 and up", min: 25001, max: Infinity },
] as const;

export const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "popular", label: "Best selling" },
  { id: "newest", label: "Newest" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
] as const;

export type SortId = (typeof SORTS)[number]["id"];

export type ListingParams = {
  category: string;
  price: string;
  care: string[];
  inStock: boolean;
  sort: SortId;
  page: number;
};

export type ListingSearchParams = {
  category?: string | string[];
  price?: string | string[];
  care?: string | string[];
  instock?: string | string[];
  sort?: string | string[];
  page?: string | string[];
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseListingParams(sp: ListingSearchParams): ListingParams {
  const sortRaw = first(sp.sort) ?? "featured";
  return {
    category: first(sp.category) ?? "",
    price: first(sp.price) ?? "",
    care: sp.care === undefined ? [] : Array.isArray(sp.care) ? sp.care : [sp.care],
    inStock: first(sp.instock) === "1",
    sort: (SORTS.some((s) => s.id === sortRaw) ? sortRaw : "featured") as SortId,
    page: Math.max(1, Number(first(sp.page)) || 1),
  };
}

/** True when any filter (not just pagination) is active — filtered URLs keep the clean canonical. */
export function hasActiveFilters(params: ListingParams) {
  return params.category !== "" || params.price !== "" || params.care.length > 0 || params.inStock || params.sort !== "featured";
}

export function applyListing(products: CatalogProduct[], params: ListingParams) {
  const bucket = PRICE_BUCKETS.find((b) => b.id === params.price);
  const list = products.filter(
    (p) =>
      (!params.category || p.category === params.category) &&
      (!bucket || (p.price_cents >= bucket.min && p.price_cents <= bucket.max)) &&
      (!params.care.length || (p.care_level && params.care.includes(p.care_level))) &&
      (!params.inStock || p.stock_quantity > 0),
  );
  const sorters: Record<SortId, (a: CatalogProduct, b: CatalogProduct) => number> = {
    featured: (a, b) => Number(b.featured) - Number(a.featured) || b.sales_count - a.sales_count,
    popular: (a, b) => b.sales_count - a.sales_count,
    newest: (a, b) => b.created_at.localeCompare(a.created_at),
    "price-asc": (a, b) => a.price_cents - b.price_cents,
    "price-desc": (a, b) => b.price_cents - a.price_cents,
  };
  const sorted = [...list].sort(sorters[params.sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(params.page, pages);
  return { visible: sorted.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE), total: sorted.length, pages, current };
}
