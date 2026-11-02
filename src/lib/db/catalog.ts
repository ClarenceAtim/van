import { one, type Queryable } from "./types";

/** Product row as JSON (timestamps as ISO strings) with its images, in display order. */
const PRODUCT_JSON = `
  (to_jsonb(p) - 'search') || jsonb_build_object('images', coalesce(
    jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object(
        'url', i.url, 'thumbnail_url', i.thumbnail_url, 'alt', i.alt, 'width', i.width, 'height', i.height,
        'credit', i.credit, 'license', i.license, 'source_url', i.source_url,
        'placeholder', nullif(i.placeholder, false), 'representative', nullif(i.representative, false)
      )) order by i.position
    ) filter (where i.id is not null), '[]'::jsonb)) as product`;

export async function listActiveProducts<T>(q: Queryable): Promise<T[]> {
  const { rows } = await q.query<{ product: T }>(
    `select ${PRODUCT_JSON} from products p left join product_images i on i.product_id = p.id
     where p.active group by p.id order by p.name`,
  );
  return rows.map((r) => r.product);
}

/** Full-text search over name, tags, species and descriptions (ranked). */
export async function searchProductSlugs(q: Queryable, term: string, limit: number): Promise<string[]> {
  const { rows } = await q.query<{ slug: string }>("select slug from search_products($1, $2)", [term, limit]);
  return rows.map((r) => r.slug);
}

export async function liveStock(q: Queryable, slugs: string[]): Promise<Map<string, number>> {
  const { rows } = await q.query<{ slug: string; stock_quantity: number }>(
    "select slug, stock_quantity from products where active and slug = any($1::text[])",
    [slugs],
  );
  return new Map(rows.map((r) => [r.slug, r.stock_quantity]));
}

export async function productIdBySlug(q: Queryable, slug: string): Promise<string | null> {
  return (await one<{ id: string }>(q, "select id from products where slug = $1 and active", [slug]))?.id ?? null;
}

export type ReviewRow = { id: string; author_name: string; rating: number; title: string; body: string; created_at: string };

export async function approvedReviews(q: Queryable, productId: string): Promise<ReviewRow[]> {
  const { rows } = await q.query<ReviewRow>(
    `select id, author_name, rating, title, body, to_char(created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at
       from reviews where product_id = $1 and status = 'approved' order by created_at desc limit 50`,
    [productId],
  );
  return rows;
}

export async function regionAllowed(q: Queryable, code: string): Promise<{ allowed: boolean; name: string } | null> {
  return one(q, "select allowed, name from live_animal_regions where code = $1", [code]);
}
