import { productFileSchema, type ProductInput } from "./schema";

/**
 * Validate already-parsed product file contents. Pure — no filesystem access —
 * so the runtime can call it on statically imported JSON (see catalog.ts)
 * without the deploy tracing the whole project into the serverless functions.
 * Returns the products plus every problem found; callers decide how to report
 * them. `priorProblems` (e.g. JSON parse errors) are carried through.
 */
export function parseProductData(
  files: { name: string; raw: unknown }[],
  priorProblems: string[] = [],
): { products: ProductInput[]; problems: string[] } {
  const problems: string[] = [...priorProblems];
  const products: ProductInput[] = [];
  const seenSlugs = new Map<string, string>();
  const seenSkus = new Map<string, string>();

  for (const { name, raw } of files) {
    const parsed = productFileSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const [index, ...rest] = issue.path;
        const slug = typeof index === "number" ? (raw as { slug?: string }[])[index]?.slug : undefined;
        problems.push(`${name} → product #${String(index)}${slug ? ` (${slug})` : ""} → ${rest.join(".") || "(root)"}: ${issue.message}`);
      }
      continue;
    }
    for (const p of parsed.data) {
      const prevSlug = seenSlugs.get(p.slug);
      if (prevSlug) problems.push(`${name}: duplicate slug "${p.slug}" (also in ${prevSlug})`);
      const prevSku = seenSkus.get(p.sku);
      if (prevSku) problems.push(`${name}: duplicate sku "${p.sku}" (also in ${prevSku})`);
      seenSlugs.set(p.slug, name);
      seenSkus.set(p.sku, name);
      products.push(p);
    }
  }
  return { products, problems };
}
