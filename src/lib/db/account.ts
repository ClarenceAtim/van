import { one, type Queryable } from "./types";

export type Profile = { id: string; email: string | null; full_name: string | null; phone: string | null; role: "customer" | "admin" };

/** Creates the profile on first sign-in. Never changes `role` (admins are promoted in SQL only). */
export async function ensureProfile(q: Queryable, user: { id: string; email: string; name?: string | null }): Promise<Profile> {
  return (await one<Profile>(
    q,
    `insert into profiles (id, email, full_name) values ($1, $2, nullif($3, ''))
     on conflict (id) do update set email = excluded.email
     returning id, email, full_name, phone, role`,
    [user.id, user.email, user.name ?? ""],
  ))!;
}

/** Customers may only change their name and phone. */
export async function updateProfile(q: Queryable, userId: string, data: { full_name: string; phone?: string | null }) {
  await q.query("update profiles set full_name = $2, phone = $3 where id = $1", [userId, data.full_name, data.phone || null]);
}

export type Address = {
  id: string;
  full_name: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  postal_code: string;
  phone: string | null;
  is_default: boolean;
};
export type AddressInput = Omit<Address, "id" | "line2" | "phone"> & { line2?: string | null; phone?: string | null };

export async function listAddresses(q: Queryable, userId: string): Promise<Address[]> {
  const { rows } = await q.query<Address>(
    "select id, full_name, line1, line2, city, region, postal_code, phone, is_default from addresses where user_id = $1 order by is_default desc, created_at",
    [userId],
  );
  return rows;
}

/** Inserts, or updates an address owned by this user. Returns false if the id isn't theirs. */
export async function saveAddress(q: Queryable, userId: string, a: AddressInput, id?: string): Promise<boolean> {
  if (a.is_default) await q.query("update addresses set is_default = false where user_id = $1", [userId]);
  const values = [userId, a.full_name, a.line1, a.line2 || null, a.city, a.region, a.postal_code, a.phone || null, a.is_default];
  if (id) {
    const r = await q.query<{ id: string }>(
      `update addresses set full_name = $2, line1 = $3, line2 = $4, city = $5, region = $6, postal_code = $7, phone = $8, is_default = $9
        where user_id = $1 and id = $10 returning id`,
      [...values, id],
    );
    return r.rows.length === 1;
  }
  await q.query(
    "insert into addresses (user_id, full_name, line1, line2, city, region, postal_code, phone, is_default) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
    values,
  );
  return true;
}

export async function deleteAddress(q: Queryable, userId: string, id: string) {
  await q.query("delete from addresses where id = $1 and user_id = $2", [id, userId]);
}

export async function wishlistSlugs(q: Queryable, userId: string): Promise<{ product_id: string; slug: string }[]> {
  const { rows } = await q.query<{ product_id: string; slug: string }>(
    "select w.product_id, p.slug from wishlists w join products p on p.id = w.product_id where w.user_id = $1 order by w.created_at desc",
    [userId],
  );
  return rows;
}

/** Adds or removes a product; returns the new state. */
export async function toggleWishlist(q: Queryable, userId: string, productId: string): Promise<"added" | "removed"> {
  const removed = await q.query("delete from wishlists where user_id = $1 and product_id = $2 returning product_id", [userId, productId]);
  if (removed.rows.length) return "removed";
  await q.query("insert into wishlists (user_id, product_id) values ($1, $2) on conflict do nothing", [userId, productId]);
  return "added";
}

export async function removeFromWishlist(q: Queryable, userId: string, productId: string) {
  await q.query("delete from wishlists where user_id = $1 and product_id = $2", [userId, productId]);
}

/** True when the user has a paid (or later) order containing the product. */
export async function hasPurchased(q: Queryable, userId: string, productId: string): Promise<boolean> {
  return !!(await one(
    q,
    `select 1 from orders o join order_items oi on oi.order_id = o.id
      where o.user_id = $1 and oi.product_id = $2 and o.status in ('paid', 'processing', 'shipped', 'delivered') limit 1`,
    [userId, productId],
  ));
}

export type ReviewResult = "created" | "not-purchased" | "duplicate";

/** Verified-buyer reviews only; always created as `pending` for moderation. */
export async function submitReview(
  q: Queryable,
  userId: string,
  r: { productId: string; authorName: string; rating: number; title: string; body: string },
): Promise<ReviewResult> {
  if (!(await hasPurchased(q, userId, r.productId))) return "not-purchased";
  const inserted = await q.query(
    `insert into reviews (product_id, user_id, author_name, rating, title, body, status)
     values ($1, $2, $3, $4, $5, $6, 'pending') on conflict (product_id, user_id) do nothing returning id`,
    [r.productId, userId, r.authorName, r.rating, r.title, r.body],
  );
  return inserted.rows.length ? "created" : "duplicate";
}
