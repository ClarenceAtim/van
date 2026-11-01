import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getLiveStock, getProductsBySlugs, toCard, type ProductCardData } from "@/lib/catalog";
import { isSupabaseConfigured } from "@/lib/env";
import { MAX_QUANTITY_PER_LINE, computeTotals, validateLines, type CartProblem, type OrderTotals, type PricedLine } from "@/lib/pricing";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/server";

type Entry = { slug: string; quantity: number };

const CART_ID_COOKIE = "sh_cart_id";
const CART_DATA_COOKIE = "sh_cart"; // fallback when Supabase isn't configured
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

const dbEnabled = () => isSupabaseConfigured && isServiceRoleConfigured();

function secret() {
  const s = process.env.CART_COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s && process.env.NODE_ENV === "production") throw new Error("CART_COOKIE_SECRET is not set");
  return s || "development-only-cart-secret";
}

function sign(value: string) {
  const mac = crypto.createHmac("sha256", secret()).update(value).digest("base64url");
  return `${Buffer.from(value).toString("base64url")}.${mac}`;
}

function unsign(signed: string | undefined): string | null {
  if (!signed) return null;
  const [payload, mac] = signed.split(".");
  if (!payload || !mac) return null;
  const value = Buffer.from(payload, "base64url").toString();
  const expected = crypto.createHmac("sha256", secret()).update(value).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? value : null;
}

// ───────────── Storage: Supabase (service role) ─────────────

async function findCartId(create: boolean): Promise<string | null> {
  const db = createAdminClient();
  const user = await getUser();
  if (user) {
    const { data } = await db.from("carts").select("id").eq("user_id", user.id).maybeSingle();
    if (data) return data.id;
    if (!create) return null;
    const { data: created, error } = await db.from("carts").insert({ user_id: user.id }).select("id").single();
    if (error) throw new Error(error.message);
    return created.id;
  }
  const jar = await cookies();
  const cookieId = unsign(jar.get(CART_ID_COOKIE)?.value);
  if (cookieId) {
    const { data } = await db.from("carts").select("id").eq("id", cookieId).is("user_id", null).maybeSingle();
    if (data) return data.id;
  }
  if (!create) return null;
  const { data: created, error } = await db.from("carts").insert({}).select("id").single();
  if (error) throw new Error(error.message);
  jar.set(CART_ID_COOKIE, sign(created.id), COOKIE_OPTIONS);
  return created.id;
}

async function dbEntries(cartId: string): Promise<Entry[]> {
  const { data } = await createAdminClient()
    .from("cart_items")
    .select("quantity, products!inner(slug)")
    .eq("cart_id", cartId)
    .order("created_at");
  return ((data ?? []) as unknown as { quantity: number; products: { slug: string } }[]).map((r) => ({ slug: r.products.slug, quantity: r.quantity }));
}

// ───────────── Storage: signed cookie fallback ─────────────

async function cookieEntries(): Promise<Entry[]> {
  const raw = unsign((await cookies()).get(CART_DATA_COOKIE)?.value);
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as Entry[]).filter((e) => typeof e.slug === "string" && Number.isInteger(e.quantity)).slice(0, 50);
  } catch {
    return [];
  }
}

// ───────────── Public API ─────────────

export async function readEntries(): Promise<Entry[]> {
  if (!dbEnabled()) return cookieEntries();
  const id = await findCartId(false);
  return id ? dbEntries(id) : [];
}

/** Sets the quantity for a product (0 removes it). `mode: "add"` adds to the existing quantity. */
export async function setQuantity(slug: string, quantity: number, mode: "set" | "add" = "set") {
  const [product] = await getProductsBySlugs([slug]);
  if (!product) throw new CartError("That product is no longer available.");
  const current = (await readEntries()).find((e) => e.slug === slug)?.quantity ?? 0;
  const stock = (await getLiveStock([slug])).get(slug) ?? 0;
  let next = Math.min(mode === "add" ? current + quantity : quantity, MAX_QUANTITY_PER_LINE);
  if (next > 0 && stock <= 0) throw new CartError(`${product.name} is sold out.`);
  let notice: string | undefined;
  if (next > stock) {
    next = stock;
    notice = `Only ${stock} available — we've added the maximum.`;
  }

  if (dbEnabled()) {
    const db = createAdminClient();
    const cartId = await findCartId(next > 0);
    if (!cartId) return { notice };
    const { data: row } = await db.from("products").select("id").eq("slug", slug).single();
    if (!row) throw new CartError("That product is no longer available.");
    if (next <= 0) await db.from("cart_items").delete().eq("cart_id", cartId).eq("product_id", row.id);
    else await db.from("cart_items").upsert({ cart_id: cartId, product_id: row.id, quantity: next }, { onConflict: "cart_id,product_id" });
    await db.from("carts").update({ updated_at: new Date().toISOString() }).eq("id", cartId);
  } else {
    const entries = (await cookieEntries()).filter((e) => e.slug !== slug);
    if (next > 0) entries.push({ slug, quantity: next });
    (await cookies()).set(CART_DATA_COOKIE, sign(JSON.stringify(entries)), COOKIE_OPTIONS);
  }
  return { notice };
}

/** The current visitor's cart id (stored on the Stripe session so the webhook can empty it after payment). */
export async function currentCartId() {
  return dbEnabled() ? findCartId(false) : null;
}

/** Empties a cart by id. Used by the Stripe webhook, which has no access to the shopper's cookies. */
export async function clearCartById(cartId: string) {
  await createAdminClient().from("cart_items").delete().eq("cart_id", cartId);
}

/** After sign-in, move items from the guest cart into the user's cart. */
export async function mergeGuestCart(userId: string) {
  if (!dbEnabled()) return;
  const jar = await cookies();
  const guestId = unsign(jar.get(CART_ID_COOKIE)?.value);
  if (!guestId) return;
  const db = createAdminClient();
  const { data: guest } = await db.from("carts").select("id").eq("id", guestId).is("user_id", null).maybeSingle();
  if (guest) {
    let { data: userCart } = await db.from("carts").select("id").eq("user_id", userId).maybeSingle();
    if (!userCart) userCart = (await db.from("carts").insert({ user_id: userId }).select("id").single()).data;
    if (userCart) {
      const { data: items } = await db.from("cart_items").select("product_id, quantity").eq("cart_id", guest.id);
      const { data: existing } = await db.from("cart_items").select("product_id, quantity").eq("cart_id", userCart.id);
      const qty = new Map((existing ?? []).map((i) => [i.product_id as string, i.quantity as number]));
      for (const item of items ?? []) {
        const merged = Math.min((qty.get(item.product_id) ?? 0) + item.quantity, MAX_QUANTITY_PER_LINE);
        await db.from("cart_items").upsert({ cart_id: userCart.id, product_id: item.product_id, quantity: merged }, { onConflict: "cart_id,product_id" });
      }
      await db.from("carts").delete().eq("id", guest.id);
    }
  }
  jar.delete(CART_ID_COOKIE);
}

export class CartError extends Error {}

export type CartLine = PricedLine & { product: ProductCardData; lineTotalCents: number };
export type Cart = { lines: CartLine[]; totals: OrderTotals; problems: CartProblem[]; count: number };

/** The cart with prices and stock taken from the catalog (never from the client). */
export async function getCart(): Promise<Cart> {
  const entries = await readEntries();
  const products = await getProductsBySlugs(entries.map((e) => e.slug));
  const stock = await getLiveStock(products.map((p) => p.slug));
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const lines: CartLine[] = entries.flatMap((e) => {
    const p = bySlug.get(e.slug);
    if (!p) return [];
    const line: PricedLine = {
      productId: p.id,
      slug: p.slug,
      name: p.name,
      sku: p.sku,
      unitPriceCents: p.price_cents,
      quantity: e.quantity,
      stock: stock.get(p.slug) ?? p.stock_quantity,
      isLiveAnimal: p.is_live_animal,
    };
    return [{ ...line, product: toCard(p), lineTotalCents: line.unitPriceCents * line.quantity }];
  });
  return {
    lines,
    totals: computeTotals(lines),
    problems: validateLines(lines),
    count: lines.reduce((n, l) => n + l.quantity, 0),
  };
}
