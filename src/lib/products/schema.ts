import { z } from "zod";
import categories from "../../../data/categories.json";

export const CATEGORY_SLUGS = categories.map((c) => c.slug) as [string, ...string[]];
export const CARE_LEVELS = ["beginner", "intermediate", "advanced"] as const;

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be lowercase letters, numbers and single hyphens");

export const productImageSchema = z.object({
  url: z.string().min(1),
  thumbnail_url: z.string().min(1).optional(),
  alt: z.string().min(10, "alt text must be descriptive (10+ characters)"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  credit: z.string().min(1),
  license: z.string().min(1),
  source_url: z.union([z.url(), z.literal("")]),
  /** true when the image is a generated illustration that should be replaced with a real photo */
  placeholder: z.boolean().optional(),
  /** true when the photo shows this type of item or species, not the exact product/morph sold */
  representative: z.boolean().optional(),
});

/**
 * Shape of a product in data/products/*.json (the source of truth).
 * id, created_at and updated_at are managed by the database.
 */
export const productInputSchema = z
  .object({
    slug,
    name: z.string().min(3).max(120),
    category: z.enum(CATEGORY_SLUGS),
    subcategory: slug.optional(),
    short_description: z.string().min(20).max(300),
    long_description: z.string().min(80),
    price_cents: z.number().int().positive(),
    compare_at_price_cents: z.number().int().positive().nullable().optional(),
    currency: z.string().length(3).toUpperCase().default("USD"),
    stock_quantity: z.number().int().min(0),
    sku: z.string().regex(/^[A-Z0-9-]{4,32}$/, "use uppercase letters, numbers and hyphens"),
    images: z.array(productImageSchema).default([]),
    featured: z.boolean().default(false),
    active: z.boolean().default(true),
    is_live_animal: z.boolean().default(false),
    species_scientific_name: z.string().nullable().optional(),
    care_level: z.enum(CARE_LEVELS).nullable().optional(),
    adult_size: z.string().nullable().optional(),
    lifespan: z.string().nullable().optional(),
    diet: z.string().nullable().optional(),
    temperature_range: z.string().nullable().optional(),
    humidity_range: z.string().nullable().optional(),
    tags: z.array(z.string().min(1)).default([]),
    seo_title: z.string().min(10).max(70),
    seo_description: z.string().min(50).max(170),
    /** Hint used by scripts/fetch-images.ts; not shown on the site */
    image_search: z
      .object({ query: z.string().min(2), alt: z.string().min(10) })
      .optional(),
  })
  .superRefine((p, ctx) => {
    if (p.compare_at_price_cents != null && p.compare_at_price_cents <= p.price_cents) {
      ctx.addIssue({
        code: "custom",
        path: ["compare_at_price_cents"],
        message: "compare_at_price_cents must be higher than price_cents",
      });
    }
    if (p.is_live_animal) {
      for (const key of [
        "species_scientific_name",
        "care_level",
        "adult_size",
        "lifespan",
        "diet",
        "temperature_range",
        "humidity_range",
      ] as const) {
        if (!p[key]) {
          ctx.addIssue({ code: "custom", path: [key], message: `${key} is required for live animals` });
        }
      }
    }
  });

export const productFileSchema = z.array(productInputSchema);

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductImage = z.infer<typeof productImageSchema>;

/** A product as stored in the database / served to pages. */
export type Product = Omit<ProductInput, "image_search"> & {
  id: string;
  created_at: string;
  updated_at: string;
};
