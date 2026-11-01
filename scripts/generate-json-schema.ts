/** Regenerates data/product.schema.json from the Zod schema (npm run schema:json). */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { productFileSchema } from "../src/lib/products/schema";

const schema = z.toJSONSchema(productFileSchema, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
const items = schema.items as Record<string, unknown>;

// Rules enforced in Zod's superRefine, expressed in JSON Schema so editors can show them too.
items.allOf = [
  {
    if: { properties: { is_live_animal: { const: true } }, required: ["is_live_animal"] },
    then: {
      required: ["species_scientific_name", "care_level", "adult_size", "lifespan", "diet", "temperature_range", "humidity_range"],
      properties: {
        species_scientific_name: { type: "string", minLength: 1 },
        care_level: { enum: ["beginner", "intermediate", "advanced"] },
      },
    },
  },
];

const out = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://github.com/ClarenceAtim/van/data/product.schema.json",
  title: "Product catalog file",
  description: "Each file in data/products/ is an array of products. Validated by scripts/sync-products.ts.",
  ...schema,
};
fs.writeFileSync(path.join(process.cwd(), "data", "product.schema.json"), JSON.stringify(out, null, 2) + "\n");
console.log("Wrote data/product.schema.json");
