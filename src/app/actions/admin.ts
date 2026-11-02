"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import sharp, { type OutputInfo } from "sharp";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { CATALOG_TAG } from "@/lib/catalog";
import * as admin from "@/lib/db/admin";
import { paymentMethods } from "@/config/payments";
import { getOrder, savePaymentTemplate as savePaymentTemplateRow } from "@/lib/db/orders";
import type { Queryable } from "@/lib/db/types";
import * as service from "@/lib/order-service";
import { productInputSchema } from "@/lib/products/schema";
import { isStorageConfigured, uploadPublic } from "@/lib/storage";
import type { FormState } from "@/lib/validation";

const uuid = z.uuid();
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function revalidateCatalog() {
  revalidateTag(CATALOG_TAG, "max");
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
  const { q } = await requireAdmin();
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

  let productId: string;
  try {
    const saved = id ? await admin.updateProduct(q, id, row) : await admin.upsertProduct(q, row);
    if (!saved) return { ok: false, message: "Product not found." };
    productId = saved;
  } catch (e) {
    const code = (e as { code?: string }).code;
    return { ok: false, message: code === "23505" ? "That slug or SKU is already used." : "Could not save the product." };
  }

  const upload = form.get("image");
  if (upload instanceof File && upload.size > 0) {
    const problem = await uploadImage(q, productId, row.slug, upload, optional(form.get("image_alt")) ?? row.name);
    if (problem) return { ok: false, message: problem };
  }
  revalidateCatalog();
  if (!id) redirect(`/admin/products/${productId}?created=1`);
  return { ok: true, message: "Product saved." };
}

async function uploadImage(q: Queryable, productId: string, slug: string, file: File, alt: string) {
  if (!isStorageConfigured()) return "Image uploads need Neon Object Storage — run `neon deploy` and set the AWS_* variables.";
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
  // New key per upload: objects are immutable, so CDN and browser caches never serve a stale image.
  const stamp = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  try {
    const url = await uploadPublic(`products/${slug}-${stamp}.webp`, full.data, "image/webp");
    const thumbnailUrl = await uploadPublic(`products/${slug}-${stamp}-thumb.webp`, thumb, "image/webp");
    await admin.addProductImage(q, productId, {
      url,
      thumbnail_url: thumbnailUrl,
      alt: alt.slice(0, 200),
      width: full.info.width,
      height: full.info.height,
      credit: "ScaleHaven Reptiles",
      license: "Own work",
      source_url: "",
      placeholder: false,
      representative: false,
    });
  } catch (e) {
    console.error("image upload:", (e as Error).message);
    return "Upload failed. Please try again.";
  }
  return null;
}

export async function deleteProductImage(form: FormData) {
  const { q } = await requireAdmin();
  const id = uuid.safeParse(form.get("imageId"));
  if (!id.success) return;
  await admin.deleteProductImage(q, id.data);
  revalidateCatalog();
  revalidatePath(`/admin/products/${form.get("productId")}`);
}

export async function toggleProductFlag(form: FormData) {
  const { q } = await requireAdmin();
  const id = uuid.safeParse(form.get("id"));
  const flag = form.get("flag");
  if (!id.success || (flag !== "featured" && flag !== "active")) return;
  await admin.setProductFlag(q, id.data, flag, form.get("value") === "true");
  revalidateCatalog();
}

export async function deleteProduct(form: FormData) {
  const { q } = await requireAdmin();
  const id = uuid.safeParse(form.get("id"));
  if (!id.success) return;
  // Products referenced by orders keep their history (order_items.product_id is set to null).
  await admin.deleteProduct(q, id.data);
  revalidateCatalog();
  redirect("/admin/products");
}

// ───────────── Orders ─────────────

function revalidateOrder(id: string) {
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

const text = (max: number) => z.string().trim().max(max);
/** "12.50" → 1250. Empty is not allowed: the confirmation must state a shipping cost (0 for free). */
const money = z
  .string()
  .trim()
  .regex(/^\d{1,6}([.,]\d{1,2})?$/, "Enter the shipping cost, e.g. 12.50 (0 for free shipping)")
  .transform((v) => Math.round(Number(v.replace(",", ".")) * 100));
const methodId = z.string().refine((id) => service.knownPaymentMethodIds().includes(id), "Choose a payment method");

const orderActionInput = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send-confirmation"),
    id: z.uuid(),
    method_id: methodId,
    shipping: money,
    subject: text(200).min(3, "Add a subject"),
    body: text(20_000).min(20, "The email is too short"),
  }),
  z.object({ action: z.literal("mark-paid"), id: z.uuid(), reference: text(200).optional() }),
  z.object({
    action: z.literal("add-tracking"),
    id: z.uuid(),
    carrier: text(50).optional(),
    tracking_number: text(100).min(4, "Enter the tracking number").regex(/^[A-Za-z0-9 -]*$/, "Letters, numbers, spaces and dashes only"),
  }),
  z.object({ action: z.literal("cancel"), id: z.uuid(), reason: text(500).min(3, "Add a short reason for the customer") }),
  z.object({ action: z.literal("set-status"), id: z.uuid(), status: z.enum(["processing", "delivered", "refunded"]) }),
]);

/** Every admin order button posts here with an `action` field. */
export async function orderAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { q } = await requireAdmin();
  const parsed = orderActionInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;
  let result: { ok: boolean; message: string };
  switch (d.action) {
    case "send-confirmation":
      result = await service.sendConfirmation(q, d.id, { methodId: d.method_id, shippingCents: d.shipping, subject: d.subject, body: d.body });
      break;
    case "mark-paid":
      result = await service.markOrderPaid(q, d.id, d.reference || null);
      break;
    case "add-tracking":
      result = await service.addTracking(q, d.id, d.carrier || null, d.tracking_number);
      break;
    case "cancel":
      result = await service.cancelOrderAndNotify(q, d.id, d.reason);
      revalidateCatalog();
      break;
    case "set-status":
      result = await service.setManualStatus(q, d.id, d.status);
      break;
  }
  revalidateOrder(d.id);
  return result;
}

/** Fills the confirmation template for a method and shipping cost, for the admin to edit before sending. */
export async function draftConfirmation(input: { id: string; methodId: string; shipping: string }) {
  const { q } = await requireAdmin();
  const parsed = z.object({ id: z.uuid(), methodId, shipping: money }).safeParse(input);
  if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0].message };
  const order = await getOrder(q, parsed.data.id);
  if (!order) return { ok: false as const, message: "Order not found." };
  const draft = await service.confirmationDraft(q, order, parsed.data.methodId, parsed.data.shipping);
  return { ok: true as const, ...draft };
}

const templateInput = z.object({
  method_id: methodId,
  subject: text(200).min(3, "Add a subject"),
  body: text(20_000).min(20, "The template is too short"),
});

export async function savePaymentTemplate(_prev: FormState, form: FormData): Promise<FormState> {
  const { q } = await requireAdmin();
  const parsed = templateInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const method = paymentMethods.find((m) => m.id === parsed.data.method_id)!;
  const details: Record<string, string> = {};
  for (const f of method.fields) {
    const v = form.get(`detail_${f.key}`);
    if (typeof v === "string" && v.trim()) details[f.key] = v.trim().slice(0, 500);
  }
  await savePaymentTemplateRow(q, method.id, { subject: parsed.data.subject, body: parsed.data.body, details });
  revalidatePath("/admin/settings/payment-templates");
  return { ok: true, message: `${method.name} template saved.` };
}

// ───────────── Reviews and messages ─────────────

export async function moderateReview(form: FormData) {
  const { q } = await requireAdmin();
  const id = uuid.safeParse(form.get("id"));
  const status = form.get("status");
  if (!id.success || (status !== "approved" && status !== "rejected")) return;
  await admin.moderateReview(q, id.data, status);
  revalidateTag("reviews", "max");
  revalidatePath("/admin/reviews");
}

export async function markMessageRead(form: FormData) {
  const { q } = await requireAdmin();
  const id = uuid.safeParse(form.get("id"));
  if (!id.success) return;
  await admin.setMessageRead(q, id.data, form.get("read") === "true");
  revalidatePath("/admin/messages");
}
