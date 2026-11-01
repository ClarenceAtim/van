"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import sharp, { type OutputInfo } from "sharp";
import { z } from "zod";
import { CATALOG_TAG } from "@/lib/catalog";
import { requireAdmin } from "@/lib/admin";
import { sendShippingUpdate } from "@/lib/email";
import { ORDER_STATUSES } from "@/lib/orders";
import { productInputSchema } from "@/lib/products/schema";
import type { FormState } from "@/lib/validation";

const uuid = z.uuid();
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function revalidateCatalog() {
  revalidateTag(CATALOG_TAG);
  revalidatePath("/admin/products");
}

// ───────────── Products ─────────────

const optional = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};
const cents = (v: FormDataEntryValue | null) => {
  const s = optional(v);
  return s === null ? null : Math.round(Number(s) * 100);
};

export async function saveProduct(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = optional(form.get("id"));
  if (id && !uuid.safeParse(id).success) return { ok: false, message: "Invalid product id" };

  const candidate = {
    slug: optional(form.get("slug")),
    name: optional(form.get("name")),
    category: optional(form.get("category")),
    subcategory: optional(form.get("subcategory")) ?? undefined,
    short_description: optional(form.get("short_description")),
    long_description: optional(form.get("long_description")),
    price_cents: cents(form.get("price")),
    compare_at_price_cents: cents(form.get("compare_at_price")),
    currency: optional(form.get("currency")) ?? "USD",
    stock_quantity: Number(form.get("stock_quantity") ?? 0),
    sku: optional(form.get("sku"))?.toUpperCase(),
    featured: form.get("featured") === "on",
    active: form.get("active") === "on",
    is_live_animal: form.get("is_live_animal") === "on",
    species_scientific_name: optional(form.get("species_scientific_name")),
    care_level: optional(form.get("care_level")),
    adult_size: optional(form.get("adult_size")),
    lifespan: optional(form.get("lifespan")),
    diet: optional(form.get("diet")),
    temperature_range: optional(form.get("temperature_range")),
    humidity_range: optional(form.get("humidity_range")),
    tags: String(form.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    seo_title: optional(form.get("seo_title")),
    seo_description: optional(form.get("seo_description")),
  };
  // Same rules as the JSON files in data/products, so exported data always validates.
  const parsed = productInputSchema.safeParse(candidate);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) (errors[String(issue.path[0])] ??= []).push(issue.message);
    return { ok: false, errors, message: "Please fix the highlighted fields." };
  }
  const { images: _images, image_search: _hint, ...row } = parsed.data;
  const { data, error } = id
    ? await supabase.from("products").update(row).eq("id", id).select("id").single()
    : await supabase.from("products").insert(row).select("id").single();
  if (error) return { ok: false, message: error.code === "23505" ? "That slug or SKU is already used." : error.message };

  const upload = form.get("image");
  if (upload instanceof File && upload.size > 0) {
    const result = await uploadImage(supabase, data.id, row.slug, upload, optional(form.get("image_alt")) ?? row.name);
    if (result) return { ok: false, message: result };
  }
  revalidateCatalog();
  if (!id) redirect(`/admin/products/${data.id}?created=1`);
  return { ok: true, message: "Product saved." };
}

async function uploadImage(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"], productId: string, slug: string, file: File, alt: string) {
  if (!ALLOWED_TYPES.includes(file.type)) return "Images must be JPG, PNG or WebP.";
  if (file.size > MAX_UPLOAD_BYTES) return "Images must be 5 MB or smaller.";
  let full: { data: Buffer; info: OutputInfo };
  let thumb: Buffer;
  try {
    // Re-encoding with sharp proves the file is a real image and strips metadata (EXIF/GPS).
    full = await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
    thumb = await sharp(full.data).resize({ width: 600 }).webp({ quality: 75 }).toBuffer();
  } catch {
    return "That file isn't a valid image.";
  }
  const stamp = Date.now();
  const name = `${slug}-${stamp}.webp`;
  const thumbName = `${slug}-${stamp}-thumb.webp`;
  const bucket = supabase.storage.from("products");
  const up1 = await bucket.upload(name, full.data, { contentType: "image/webp", cacheControl: "31536000" });
  const up2 = await bucket.upload(thumbName, thumb, { contentType: "image/webp", cacheControl: "31536000" });
  if (up1.error || up2.error) return `Upload failed: ${(up1.error ?? up2.error)!.message}`;
  const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId);
  const { error } = await supabase.from("product_images").insert({
    product_id: productId,
    url: bucket.getPublicUrl(name).data.publicUrl,
    thumbnail_url: bucket.getPublicUrl(thumbName).data.publicUrl,
    alt: alt.slice(0, 200),
    width: full.info.width,
    height: full.info.height,
    credit: "ScaleHaven Reptiles",
    license: "Own work",
    position: count ?? 0,
  });
  return error ? error.message : null;
}

export async function deleteProductImage(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = uuid.safeParse(form.get("imageId"));
  if (!id.success) return;
  await supabase.from("product_images").delete().eq("id", id.data);
  revalidateCatalog();
  revalidatePath(`/admin/products/${form.get("productId")}`);
}

export async function toggleProductFlag(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = uuid.safeParse(form.get("id"));
  const flag = form.get("flag");
  if (!id.success || (flag !== "featured" && flag !== "active")) return;
  await supabase.from("products").update({ [flag]: form.get("value") === "true" }).eq("id", id.data);
  revalidateCatalog();
}

export async function deleteProduct(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = uuid.safeParse(form.get("id"));
  if (!id.success) return;
  // Products referenced by orders keep their history (order_items.product_id is set to null).
  await supabase.from("products").delete().eq("id", id.data);
  revalidateCatalog();
  redirect("/admin/products");
}

// ───────────── Orders ─────────────

const orderUpdate = z.object({
  id: z.uuid(),
  status: z.enum(ORDER_STATUSES),
  carrier: z.string().trim().max(50).optional(),
  tracking_number: z.string().trim().max(100).regex(/^[A-Za-z0-9 -]*$/, "Letters, numbers, spaces and dashes only").optional(),
});

export async function updateOrder(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const parsed = orderUpdate.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { id, status, carrier, tracking_number } = parsed.data;
  const { data: before } = await supabase.from("orders").select("tracking_number, email, order_number, contains_live_animals").eq("id", id).single();
  if (!before) return { ok: false, message: "Order not found." };

  const { error } = await supabase
    .from("orders")
    .update({ status, carrier: carrier || null, tracking_number: tracking_number || null })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  let emailed = false;
  if (tracking_number && tracking_number !== before.tracking_number) {
    emailed = await sendShippingUpdate({ email: before.email, order_number: before.order_number, carrier: carrier || null, tracking_number, contains_live_animals: before.contains_live_animals });
  }
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  return { ok: true, message: emailed ? "Order updated and tracking email sent." : "Order updated." };
}

// ───────────── Reviews, messages, regions ─────────────

export async function moderateReview(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = uuid.safeParse(form.get("id"));
  const status = form.get("status");
  if (!id.success || (status !== "approved" && status !== "rejected")) return;
  await supabase.from("reviews").update({ status }).eq("id", id.data);
  revalidateTag("reviews");
  revalidatePath("/admin/reviews");
}

export async function markMessageRead(form: FormData) {
  const { supabase } = await requireAdmin();
  const id = uuid.safeParse(form.get("id"));
  if (!id.success) return;
  await supabase.from("contact_messages").update({ read: form.get("read") === "true" }).eq("id", id.data);
  revalidatePath("/admin/messages");
}

export async function setRegionAllowed(form: FormData) {
  const { supabase } = await requireAdmin();
  const code = z.string().regex(/^US-[A-Z]{2}$/).safeParse(form.get("code"));
  if (!code.success) return;
  await supabase.from("live_animal_regions").update({ allowed: form.get("allowed") === "true" }).eq("code", code.data);
  revalidatePath("/admin/settings");
}
