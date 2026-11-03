import "server-only";
import { unstable_cache } from "next/cache";
import categoriesJson from "../../data/categories.json";
import * as repo from "@/lib/db/catalog";
import { db, isDatabaseConfigured } from "@/lib/db/pool";
import { loadProductData } from "@/lib/products/load";
import type { Product, ProductImage } from "@/lib/products/schema";

export type Category = (typeof categoriesJson)[number];
export type CatalogProduct = Omit<Product, "image_search"> & { sales_count: number };
export type Review = repo.ReviewRow;
export type Rating = { average: number; count: number };

export const CATALOG_TAG = "products";
const REVALIDATE_SECONDS = 3600;

/** Repo JSON fallback so the site works before the database is connected. */
function fromJson(): CatalogProduct[] {
  const stamp = "2026-11-01T00:00:00.000Z";
  return loadProductData()
    .filter((p) => p.active)
    .map(({ image_search: _hint, ...p }, i) => ({ ...p, id: p.slug, created_at: stamp, updated_at: stamp, sales_count: p.featured ? 50 - (i % 10) : i % 7 }));
}

const loadAll = unstable_cache(
  async (): Promise<CatalogProduct[]> => {
    if (!isDatabaseConfigured()) return fromJson();
    const rows = await repo.listActiveProducts<CatalogProduct>(db());
    // Not synced yet → fall back to repo data rather than show an empty store.
    return rows.length ? rows : fromJson();
  },
  ["catalog-all"],
  { tags: [CATALOG_TAG], revalidate: REVALIDATE_SECONDS },
);

export async function getAllProducts() {
  return loadAll();
}

export async function getCategories(): Promise<Category[]> {
  return [...categoriesJson].sort((a, b) => a.sort_order - b.sort_order);
}

export async function getCategory(slug: string) {
  return (await getCategories()).find((c) => c.slug === slug) ?? null;
}

export async function getProductsByCategory(category: string) {
  return (await loadAll()).filter((p) => p.category === category);
}

export async function getProduct(category: string, slug: string) {
  return (await loadAll()).find((p) => p.slug === slug && p.category === category) ?? null;
}

export async function getProductsBySlugs(slugs: string[]) {
  const set = new Set(slugs);
  return (await loadAll()).filter((p) => set.has(p.slug));
}

export async function getFeatured(limit = 8) {
  return (await loadAll()).filter((p) => p.featured && p.stock_quantity > 0).slice(0, limit);
}

export async function getBestSellers(limit = 8) {
  return [...(await loadAll())].sort((a, b) => b.sales_count - a.sales_count).slice(0, limit);
}

export async function getRelated(product: CatalogProduct, limit = 4) {
  const all = await loadAll();
  const tags = new Set(product.tags);
  return all
    .filter((p) => p.id !== product.id)
    .map((p) => ({
      p,
      score: (p.category === product.category ? 2 : 0) + (p.subcategory && p.subcategory === product.subcategory ? 3 : 0) + p.tags.filter((t) => tags.has(t)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.sales_count - a.p.sales_count)
    .slice(0, limit)
    .map((x) => x.p);
}

/** Full-text search: Postgres `search_products` when connected, simple matching otherwise. */
export async function searchProducts(query: string, limit = 8): Promise<CatalogProduct[]> {
  const q = query.trim().slice(0, 100);
  if (q.length < 2) return [];
  const all = await loadAll();
  if (isDatabaseConfigured()) {
    const bySlug = new Map(all.map((p) => [p.slug, p]));
    const slugs = await repo.searchProductSlugs(db(), q, limit);
    return slugs.map((s) => bySlug.get(s)).filter((p): p is CatalogProduct => !!p);
  }
  const terms = q.toLowerCase().split(/\s+/);
  return all
    .map((p) => {
      const hay = `${p.name} ${p.tags.join(" ")} ${p.species_scientific_name ?? ""} ${p.short_description}`.toLowerCase();
      const name = p.name.toLowerCase();
      const score = terms.reduce((s, t) => s + (name.includes(t) ? 3 : hay.includes(t) ? 1 : -10), 0);
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

export const getReviews = unstable_cache(
  async (productId: string): Promise<{ reviews: Review[]; rating: Rating | null }> => {
    // JSON-fallback products use their slug as id; only real database ids have reviews.
    if (!isDatabaseConfigured() || !/^[0-9a-f-]{36}$/.test(productId)) return { reviews: [], rating: null };
    const reviews = await repo.approvedReviews(db(), productId);
    const rating = reviews.length
      ? { average: Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10, count: reviews.length }
      : null;
    return { reviews, rating };
  },
  ["reviews"],
  { tags: ["reviews"], revalidate: REVALIDATE_SECONDS },
);

/** Live stock straight from the database (not cached) — used when adding to cart and at checkout. */
export async function getLiveStock(slugs: string[]): Promise<Map<string, number>> {
  if (!isDatabaseConfigured() || !slugs.length) {
    const all = await getProductsBySlugs(slugs);
    return new Map(all.map((p) => [p.slug, p.stock_quantity]));
  }
  return repo.liveStock(db(), slugs);
}

/** Lightweight shape sent to client components (keeps page payloads small). */
export type ProductCardData = Pick<
  CatalogProduct,
  "id" | "slug" | "name" | "category" | "subcategory" | "price_cents" | "compare_at_price_cents" | "currency" | "stock_quantity" | "is_live_animal" | "care_level" | "featured" | "sales_count" | "created_at" | "short_description"
> & { image: CardImage | null };

/** Only what a product card renders (credit and licence stay on the product page). */
export type CardImage = Pick<ProductImage, "url" | "thumbnail_url" | "alt" | "width" | "height">;

export function toCard(p: CatalogProduct): ProductCardData {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    subcategory: p.subcategory,
    price_cents: p.price_cents,
    compare_at_price_cents: p.compare_at_price_cents ?? null,
    currency: p.currency,
    stock_quantity: p.stock_quantity,
    is_live_animal: p.is_live_animal,
    care_level: p.care_level ?? null,
    featured: p.featured,
    sales_count: p.sales_count,
    created_at: p.created_at,
    short_description: p.short_description,
    image: p.images[0] ? { url: p.images[0].url, thumbnail_url: p.images[0].thumbnail_url, alt: p.images[0].alt, width: p.images[0].width, height: p.images[0].height } : null,
  };
}
