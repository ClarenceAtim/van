import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/catalog";
import { formatMoney, productPath } from "@/lib/format";
import { jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { searchQuerySchema } from "@/lib/validation";

export async function GET(request: Request) {
  if (!(await rateLimit("search"))) return jsonError("Too many searches. Please wait a moment.", 429);
  const parsed = searchQuerySchema.safeParse({ q: new URL(request.url).searchParams.get("q") ?? "" });
  if (!parsed.success) return NextResponse.json({ results: [] });
  const results = await searchProducts(parsed.data.q, 8);
  return NextResponse.json(
    {
      results: results.map((p) => ({
        slug: p.slug,
        name: p.name,
        url: productPath(p),
        price: formatMoney(p.price_cents, p.currency),
        image: p.images[0]?.thumbnail_url ?? p.images[0]?.url ?? null,
        alt: p.images[0]?.alt ?? p.name,
      })),
    },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
