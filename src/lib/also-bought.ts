import "server-only";
import { getAllProducts, type CatalogProduct } from "@/lib/catalog";

/** Tags shared by this many products or more are too generic to link products (e.g. "captive bred"). */
const GENERIC_TAG_THRESHOLD = 15;

/**
 * "Customers also buy": products from *other* categories that share a species or use tag,
 * e.g. a leopard gecko with its starter kit, heat lamp, insects and calcium.
 */
export async function getAlsoBought(product: CatalogProduct, exclude: string[] = [], limit = 4): Promise<CatalogProduct[]> {
  const all = await getAllProducts();
  const tagCounts = new Map<string, number>();
  for (const p of all) for (const t of p.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const tags = new Set(product.tags.filter((t) => (tagCounts.get(t) ?? 0) < GENERIC_TAG_THRESHOLD));
  if (tags.size === 0) return [];
  const skip = new Set([product.id, ...exclude]);
  return all
    .filter((p) => p.category !== product.category && !skip.has(p.id) && p.stock_quantity > 0)
    .map((p) => ({ p, score: p.tags.filter((t) => tags.has(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.sales_count - a.p.sales_count)
    .slice(0, limit)
    .map((x) => x.p);
}
