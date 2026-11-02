"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/server";
import * as account from "@/lib/db/account";
import { productIdBySlug } from "@/lib/db/catalog";
import { db, isDatabaseConfigured } from "@/lib/db/pool";
import { rateLimit } from "@/lib/rate-limit";
import { addressSchema, fieldErrors, profileSchema, reviewSchema, slug as slugSchema, type FormState } from "@/lib/validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Every action resolves the user from the Neon Auth session — never from form data. */
async function requireUser() {
  if (!isDatabaseConfigured()) return null;
  return getUser();
}

export async function toggleWishlist(slug: string): Promise<{ status: "added" | "removed" | "signed-out" | "error"; message?: string }> {
  if (!slugSchema.safeParse(slug).success) return { status: "error", message: "Unknown product" };
  const user = await requireUser();
  if (!user) return { status: "signed-out" };
  const productId = await productIdBySlug(db(), slug);
  if (!productId) return { status: "error", message: "Unknown product" };
  const status = await account.toggleWishlist(db(), user.id, productId);
  revalidatePath("/account/wishlist");
  return { status };
}

export async function removeFromWishlist(form: FormData) {
  const user = await requireUser();
  const productId = String(form.get("productId") ?? "");
  if (!user || !UUID.test(productId)) return;
  await account.removeFromWishlist(db(), user.id, productId);
  revalidatePath("/account/wishlist");
}

export async function saveAddress(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!user) redirect("/login?next=/account/addresses");
  const parsed = addressSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { id, ...address } = parsed.data;
  const saved = await account.saveAddress(db(), user.id, address, id || undefined);
  if (!saved) return { ok: false, message: "Could not save the address." };
  revalidatePath("/account/addresses");
  return { ok: true, message: "Address saved." };
}

export async function deleteAddress(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  if (!user || !UUID.test(id)) return;
  await account.deleteAddress(db(), user.id, id);
  revalidatePath("/account/addresses");
}

export async function saveProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!user) redirect("/login?next=/account/settings");
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  await account.ensureProfile(db(), user);
  await account.updateProfile(db(), user.id, parsed.data);
  revalidatePath("/account");
  return { ok: true, message: "Details saved." };
}

export async function submitReview(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!user) redirect("/login?next=/account/orders");
  const parsed = reviewSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  if (!(await rateLimit("review", user.id))) return { ok: false, message: "Too many reviews. Please try again later." };
  const productId = await productIdBySlug(db(), parsed.data.productSlug);
  if (!productId) return { ok: false, message: "Unknown product." };
  const profile = await account.ensureProfile(db(), user);
  const result = await account.submitReview(db(), user.id, {
    productId,
    authorName: profile.full_name?.split(" ")[0] || "Verified buyer",
    rating: parsed.data.rating,
    title: parsed.data.title,
    body: parsed.data.body,
  });
  if (result === "not-purchased") return { ok: false, message: "Only customers who bought this product can review it." };
  if (result === "duplicate") return { ok: false, message: "You've already reviewed this product." };
  revalidateTag("reviews", "max");
  return { ok: true, message: "Thanks! Your review will appear once it's approved." };
}
