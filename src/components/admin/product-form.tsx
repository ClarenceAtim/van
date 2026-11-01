"use client";

import { useActionState } from "react";
import { saveProduct } from "@/app/actions/admin";
import { Field } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type ProductFormValues = {
  id?: string;
  slug?: string;
  name?: string;
  category?: string;
  subcategory?: string | null;
  short_description?: string;
  long_description?: string;
  price_cents?: number;
  compare_at_price_cents?: number | null;
  stock_quantity?: number;
  sku?: string;
  featured?: boolean;
  active?: boolean;
  is_live_animal?: boolean;
  species_scientific_name?: string | null;
  care_level?: string | null;
  adult_size?: string | null;
  lifespan?: string | null;
  diet?: string | null;
  temperature_range?: string | null;
  humidity_range?: string | null;
  tags?: string[];
  seo_title?: string | null;
  seo_description?: string | null;
};

const dollars = (c?: number | null) => (c == null ? "" : (c / 100).toFixed(2));
const select = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";

export function ProductForm({ product = {}, categories }: { product?: ProductFormValues; categories: { slug: string; name: string }[] }) {
  const [state, action, pending] = useActionState(saveProduct, null);
  const e = state?.errors ?? {};
  const p = product;
  return (
    <form action={action} className="space-y-8" noValidate>
      {state?.message && (
        <p role={state.ok ? "status" : "alert"} className={`rounded-lg p-3 text-sm ${state.ok ? "bg-sand/60" : "bg-destructive/10 text-destructive"}`}>
          {state.message}
        </p>
      )}
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <input type="hidden" name="currency" value="USD" />

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">Basics</legend>
        <Field label="Name" name="name" error={e.name}><Input name="name" defaultValue={p.name} required /></Field>
        <Field label="Slug (URL)" name="slug" error={e.slug} hint="lowercase-with-hyphens. Avoid changing after launch."><Input name="slug" defaultValue={p.slug} required pattern="[a-z0-9-]+" /></Field>
        <Field label="Category" name="category" error={e.category}>
          <select name="category" defaultValue={p.category ?? ""} className={select} required>
            <option value="" disabled>Choose…</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Subcategory" name="subcategory" error={e.subcategory}><Input name="subcategory" defaultValue={p.subcategory ?? ""} /></Field>
        <Field label="SKU" name="sku" error={e.sku}><Input name="sku" defaultValue={p.sku} required /></Field>
        <Field label="Tags (comma separated)" name="tags" error={e.tags}><Input name="tags" defaultValue={p.tags?.join(", ")} /></Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-lg font-semibold">Price & stock</legend>
        <Field label="Price ($)" name="price" error={e.price_cents}><Input name="price" type="number" step="0.01" min="0.01" defaultValue={dollars(p.price_cents)} required /></Field>
        <Field label="Compare-at price ($, optional)" name="compare_at_price" error={e.compare_at_price_cents}><Input name="compare_at_price" type="number" step="0.01" min="0" defaultValue={dollars(p.compare_at_price_cents)} /></Field>
        <Field label="Stock quantity" name="stock_quantity" error={e.stock_quantity}><Input name="stock_quantity" type="number" min="0" step="1" defaultValue={p.stock_quantity ?? 0} required /></Field>
        <div className="flex flex-wrap gap-6 sm:col-span-3">
          {(["active", "featured", "is_live_animal"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name={k} defaultChecked={k === "active" ? p.active ?? true : !!p[k]} className="size-4 accent-primary" />
              {k === "is_live_animal" ? "Live animal" : k[0].toUpperCase() + k.slice(1)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold">Description</legend>
        <Field label="Short description" name="short_description" error={e.short_description}><Textarea name="short_description" rows={2} defaultValue={p.short_description} required /></Field>
        <Field label="Long description (Markdown)" name="long_description" error={e.long_description}><Textarea name="long_description" rows={10} defaultValue={p.long_description} required /></Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">Care sheet (live animals)</legend>
        <Field label="Scientific name" name="species_scientific_name" error={e.species_scientific_name}><Input name="species_scientific_name" defaultValue={p.species_scientific_name ?? ""} /></Field>
        <Field label="Care level" name="care_level" error={e.care_level}>
          <select name="care_level" defaultValue={p.care_level ?? ""} className={select}>
            <option value="">—</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </Field>
        <Field label="Adult size" name="adult_size" error={e.adult_size}><Input name="adult_size" defaultValue={p.adult_size ?? ""} /></Field>
        <Field label="Lifespan" name="lifespan" error={e.lifespan}><Input name="lifespan" defaultValue={p.lifespan ?? ""} /></Field>
        <Field label="Diet" name="diet" error={e.diet}><Input name="diet" defaultValue={p.diet ?? ""} /></Field>
        <Field label="Temperature range" name="temperature_range" error={e.temperature_range}><Input name="temperature_range" defaultValue={p.temperature_range ?? ""} /></Field>
        <Field label="Humidity range" name="humidity_range" error={e.humidity_range}><Input name="humidity_range" defaultValue={p.humidity_range ?? ""} /></Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">SEO</legend>
        <Field label="SEO title (10–70 characters)" name="seo_title" error={e.seo_title}><Input name="seo_title" maxLength={70} defaultValue={p.seo_title ?? ""} required /></Field>
        <Field label="SEO description (50–170 characters)" name="seo_description" error={e.seo_description}><Textarea name="seo_description" rows={2} maxLength={170} defaultValue={p.seo_description ?? ""} required /></Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">Add an image</legend>
        <Field label="Image file (JPG, PNG or WebP, max 5 MB)" name="image">
          <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2" />
        </Field>
        <Field label="Image alt text" name="image_alt" hint="Describe the photo, e.g. “Pastel ball python coiled on cork bark”."><Input name="image_alt" maxLength={200} /></Field>
      </fieldset>

      <Button type="submit" size="lg" disabled={pending}>{pending ? "Saving…" : "Save product"}</Button>
    </form>
  );
}
