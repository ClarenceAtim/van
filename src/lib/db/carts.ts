import { MAX_QUANTITY_PER_LINE } from "@/lib/pricing";
import { one, type Queryable } from "./types";

export type CartEntry = { slug: string; quantity: number };

export async function userCartId(q: Queryable, userId: string, create: boolean): Promise<string | null> {
  const found = await one<{ id: string }>(q, "select id from carts where user_id = $1", [userId]);
  if (found || !create) return found?.id ?? null;
  const created = await one<{ id: string }>(
    q,
    "insert into carts (user_id) values ($1) on conflict (user_id) do update set updated_at = now() returning id",
    [userId],
  );
  return created!.id;
}

/** Guest carts are only reachable through the id in the signed cookie, and never once claimed by a user. */
export async function guestCartExists(q: Queryable, cartId: string): Promise<boolean> {
  return !!(await one(q, "select 1 from carts where id = $1 and user_id is null", [cartId]));
}

export async function createGuestCart(q: Queryable): Promise<string> {
  return (await one<{ id: string }>(q, "insert into carts default values returning id"))!.id;
}

export async function cartEntries(q: Queryable, cartId: string): Promise<CartEntry[]> {
  const { rows } = await q.query<CartEntry>(
    `select p.slug, ci.quantity from cart_items ci join products p on p.id = ci.product_id
      where ci.cart_id = $1 order by ci.created_at`,
    [cartId],
  );
  return rows;
}

/** Sets a line's quantity; 0 removes it. */
export async function setCartItem(q: Queryable, cartId: string, slug: string, quantity: number) {
  if (quantity <= 0) {
    await q.query("delete from cart_items where cart_id = $1 and product_id = (select id from products where slug = $2)", [cartId, slug]);
  } else {
    await q.query(
      `insert into cart_items (cart_id, product_id, quantity)
       select $1, id, $3 from products where slug = $2 and active
       on conflict (cart_id, product_id) do update set quantity = excluded.quantity`,
      [cartId, slug, Math.min(quantity, MAX_QUANTITY_PER_LINE)],
    );
  }
  await q.query("update carts set updated_at = now() where id = $1", [cartId]);
}

export async function clearCart(q: Queryable, cartId: string) {
  await q.query("delete from cart_items where cart_id = $1", [cartId]);
}

/** Moves a guest cart's items into the user's cart (quantities add up, capped) and deletes the guest cart. */
export async function mergeGuestCart(q: Queryable, guestCartId: string, userId: string) {
  if (!(await guestCartExists(q, guestCartId))) return;
  const userCart = await userCartId(q, userId, true);
  await q.query(
    `insert into cart_items (cart_id, product_id, quantity)
     select $2, product_id, least(quantity, $3) from cart_items where cart_id = $1
     on conflict (cart_id, product_id) do update set quantity = least(cart_items.quantity + excluded.quantity, $3)`,
    [guestCartId, userCart, MAX_QUANTITY_PER_LINE],
  );
  await q.query("delete from carts where id = $1 and user_id is null", [guestCartId]);
}
