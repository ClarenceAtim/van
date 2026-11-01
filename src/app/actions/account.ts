"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { addressSchema, fieldErrors, profileSchema, reviewSchema, slug as slugSchema, type FormState } from "@/lib/validation";

async function requireUser() {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? { supabase, user: data.user } : null;
}

async function productIdFor(supabase: Awaited<ReturnType<typeof createClient>>, slug: string) {
  const { data } = await supabase.from("products").select("id").eq("slug", slug).single();
  return data?.id as string | undefined;
}

export async function toggleWishlist(slug: string): Promise<{ status: "added" | "removed" | "signed-out" | "error"; message?: string }> {
  if (!slugSchema.safeParse(slug).success) return { status: "error", message: "Unknown product" };
  const auth = await requireUser();
  if (!auth) return { status: "signed-out" };
  const { supabase, user } = auth;
  const productId = await productIdFor(supabase, slug);
  if (!productId) return { status: "error", message: "Unknown product" };
  const { data: existing } = await supabase.from("wishlists").select("product_id").eq("user_id", user.id).eq("product_id", productId).maybeSingle();
  if (existing) {
    await supabase.from("wishlists").delete().eq("user_id", user.id).eq("product_id", productId);
    revalidatePath("/account/wishlist");
    return { status: "removed" };
  }
  const { error } = await supabase.from("wishlists").insert({ user_id: user.id, product_id: productId });
  if (error) return { status: "error", message: "Could not save to your wishlist." };
  revalidatePath("/account/wishlist");
  return { status: "added" };
}

export async function removeFromWishlist(form: FormData) {
  const auth = await requireUser();
  const productId = String(form.get("productId") ?? "");
  if (!auth || !/^[0-9a-f-]{36}$/.test(productId)) return;
  await auth.supabase.from("wishlists").delete().eq("user_id", auth.user.id).eq("product_id", productId);
  revalidatePath("/account/wishlist");
}

export async function saveAddress(_prev: FormState, form: FormData): Promise<FormState> {
  const auth = await requireUser();
  if (!auth) redirect("/login?next=/account/addresses");
  const parsed = addressSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { id, ...address } = parsed.data;
  const { supabase, user } = auth;
  if (address.is_default) await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  // RLS guarantees users can only touch their own rows; user_id is set server-side, never from the form.
  const { error } = id
    ? await supabase.from("addresses").update(address).eq("id", id).eq("user_id", user.id)
    : await supabase.from("addresses").insert({ ...address, user_id: user.id });
  if (error) return { ok: false, message: "Could not save the address." };
  revalidatePath("/account/addresses");
  return { ok: true, message: "Address saved." };
}

export async function deleteAddress(form: FormData) {
  const auth = await requireUser();
  const id = String(form.get("id") ?? "");
  if (!auth || !/^[0-9a-f-]{36}$/.test(id)) return;
  await auth.supabase.from("addresses").delete().eq("id", id).eq("user_id", auth.user.id);
  revalidatePath("/account/addresses");
}

export async function saveProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const auth = await requireUser();
  if (!auth) redirect("/login?next=/account/settings");
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { error } = await auth.supabase.from("profiles").update(parsed.data).eq("id", auth.user.id);
  if (error) return { ok: false, message: "Could not save your details." };
  revalidatePath("/account");
  return { ok: true, message: "Details saved." };
}

export async function submitReview(_prev: FormState, form: FormData): Promise<FormState> {
  const auth = await requireUser();
  if (!auth) redirect("/login?next=/account/orders");
  const parsed = reviewSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  if (!(await rateLimit("review", auth.user.id))) return { ok: false, message: "Too many reviews. Please try again later." };
  const { supabase, user } = auth;
  const productId = await productIdFor(supabase, parsed.data.productSlug);
  if (!productId) return { ok: false, message: "Unknown product." };
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const authorName = (profile?.full_name as string | null)?.split(" ")[0] || "Verified buyer";
  // The RLS policy only allows this insert when the user has a paid order containing the product.
  const { error } = await supabase.from("reviews").insert({
    product_id: productId,
    user_id: user.id,
    author_name: authorName,
    rating: parsed.data.rating,
    title: parsed.data.title,
    body: parsed.data.body,
  });
  if (error) {
    return {
      ok: false,
      message: error.code === "23505" ? "You've already reviewed this product." : "Only customers who bought this product can review it.",
    };
  }
  revalidateTag("reviews");
  return { ok: true, message: "Thanks! Your review will appear once it's approved." };
}
