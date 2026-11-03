import { one, type Queryable } from "./types";

/** Columns an admin may write on a product (matches the JSON source of truth). */
export const PRODUCT_COLUMNS = [
  "slug", "name", "category", "subcategory", "short_description", "long_description", "price_cents", "compare_at_price_cents",
  "currency", "stock_quantity", "sku", "featured", "active", "is_live_animal", "species_scientific_name", "care_level",
  "adult_size", "lifespan", "diet", "temperature_range", "humidity_range", "tags", "seo_title", "seo_description",
] as const;
export type ProductRow = { [K in (typeof PRODUCT_COLUMNS)[number]]?: unknown } & { slug: string };

const values = (row: ProductRow) => PRODUCT_COLUMNS.map((c) => row[c] ?? null);

/** Insert or update by slug. Returns the product id. */
export async function upsertProduct(q: Queryable, row: ProductRow): Promise<string> {
  const cols = PRODUCT_COLUMNS.join(", ");
  const params = PRODUCT_COLUMNS.map((_, i) => `$${i + 1}`).join(", ");
  const updates = PRODUCT_COLUMNS.filter((c) => c !== "slug").map((c) => `${c} = excluded.${c}`).join(", ");
  return (await one<{ id: string }>(q, `insert into products (${cols}) values (${params}) on conflict (slug) do update set ${updates} returning id`, values(row)))!.id;
}

export async function updateProduct(q: Queryable, id: string, row: ProductRow): Promise<string | null> {
  const sets = PRODUCT_COLUMNS.map((c, i) => `${c} = $${i + 2}`).join(", ");
  return (await one<{ id: string }>(q, `update products set ${sets} where id = $1 returning id`, [id, ...values(row)]))?.id ?? null;
}

export type ImageRow = {
  url: string; thumbnail_url: string | null; alt: string; width: number; height: number; credit: string; license: string;
  source_url: string; placeholder: boolean; representative: boolean;
};

export async function replaceProductImages(q: Queryable, productId: string, images: ImageRow[]) {
  await q.query("delete from product_images where product_id = $1", [productId]);
  for (const [position, i] of images.entries()) await addProductImage(q, productId, i, position);
}

export async function addProductImage(q: Queryable, productId: string, i: ImageRow, position?: number) {
  await q.query(
    `insert into product_images (product_id, url, thumbnail_url, alt, width, height, credit, license, source_url, placeholder, representative, position)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, coalesce($12, (select count(*) from product_images where product_id = $1)))`,
    [productId, i.url, i.thumbnail_url, i.alt, i.width, i.height, i.credit, i.license, i.source_url, i.placeholder, i.representative, position ?? null],
  );
}

export async function deleteProductImage(q: Queryable, imageId: string) {
  await q.query("delete from product_images where id = $1", [imageId]);
}

export async function setProductFlag(q: Queryable, id: string, flag: "featured" | "active", value: boolean) {
  // `flag` is checked against a fixed list by the caller's type; never interpolate user input.
  await q.query(flag === "featured" ? "update products set featured = $2 where id = $1" : "update products set active = $2 where id = $1", [id, value]);
}

export async function deleteProduct(q: Queryable, id: string) {
  await q.query("delete from products where id = $1", [id]);
}

export async function listProducts(q: Queryable, search: string) {
  const { rows } = await q.query<{ id: string; name: string; slug: string; category: string; sku: string; price_cents: number; stock_quantity: number; featured: boolean; active: boolean }>(
    `select id, name, slug, category, sku, price_cents, stock_quantity, featured, active from products
      where $1 = '' or name ilike '%' || $1 || '%' or sku ilike '%' || $1 || '%' order by category, name`,
    [search],
  );
  return rows;
}

export type AdminProduct = Record<string, unknown> & {
  name: string;
  slug: string;
  category: string;
  images: { id: string; url: string; alt: string; placeholder: boolean }[];
};

export async function getProductWithImages(q: Queryable, id: string): Promise<AdminProduct | null> {
  const r = await one<{ p: AdminProduct }>(
    q,
    `select (to_jsonb(p) - 'search') || jsonb_build_object('images', coalesce(
       (select jsonb_agg(jsonb_build_object('id', i.id, 'url', i.url, 'alt', i.alt, 'placeholder', i.placeholder) order by i.position)
          from product_images i where i.product_id = p.id), '[]'::jsonb)) as p
       from products p where p.id = $1`,
    [id],
  );
  return r?.p ?? null;
}

export async function overview(q: Queryable, lowStock: number) {
  const sales = await one<{ revenue: number; orders: number }>(
    q,
    `select coalesce(sum(total_cents), 0)::int as revenue, count(*)::int as orders from orders
      where status in ('paid', 'processing', 'shipped', 'delivered') and created_at >= now() - interval '30 days'`,
  );
  const counts = await one<{ new_orders: number; awaiting_payment: number; to_ship: number; pending_reviews: number; unread: number }>(
    q,
    `select (select count(*) from orders where status = 'awaiting_confirmation')::int as new_orders,
            (select count(*) from orders where status = 'confirmation_sent')::int as awaiting_payment,
            (select count(*) from orders where status in ('paid', 'processing'))::int as to_ship,
            (select count(*) from reviews where status = 'pending')::int as pending_reviews,
            (select count(*) from contact_messages where not read)::int as unread`,
  );
  const { rows: low } = await q.query<{ id: string; name: string; stock_quantity: number }>(
    "select id, name, stock_quantity from products where active and stock_quantity <= $1 order by stock_quantity, name",
    [lowStock],
  );
  return { ...sales!, ...counts!, lowStock: low };
}

export async function listReviews(q: Queryable, pendingOnly: boolean) {
  const { rows } = await q.query<{ id: string; rating: number; title: string; body: string; author_name: string; status: string; created_at: string; product_name: string }>(
    `select r.id, r.rating, r.title, r.body, r.author_name, r.status, r.created_at::text, p.name as product_name
       from reviews r join products p on p.id = r.product_id
      where not $1 or r.status = 'pending' order by r.created_at desc limit 100`,
    [pendingOnly],
  );
  return rows;
}

export async function moderateReview(q: Queryable, id: string, status: "approved" | "rejected") {
  await q.query("update reviews set status = $2 where id = $1", [id, status]);
}

export async function listMessages(q: Queryable) {
  const { rows } = await q.query<{ id: string; name: string; email: string; subject: string; message: string; read: boolean; created_at: string }>(
    "select id, name, email, subject, message, read, created_at::text from contact_messages order by read, created_at desc limit 200",
  );
  return rows;
}

export async function setMessageRead(q: Queryable, id: string, read: boolean) {
  await q.query("update contact_messages set read = $2 where id = $1", [id, read]);
}
