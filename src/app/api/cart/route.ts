import { NextResponse } from "next/server";
import { CartError, getCart, setQuantity } from "@/lib/cart";
import { isSameOrigin, jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { cartMutationSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getCart(), { headers: { "Cache-Control": "no-store" } });
}

async function mutate(request: Request, mode: "add" | "set") {
  if (!isSameOrigin(request)) return jsonError("Forbidden", 403);
  if (!(await rateLimit("cart"))) return jsonError("Too many requests. Please slow down.", 429);
  const parsed = cartMutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request", 400);
  try {
    const { notice } = await setQuantity(parsed.data.slug, parsed.data.quantity, mode);
    return NextResponse.json({ ...(await getCart()), notice });
  } catch (e) {
    if (e instanceof CartError) return jsonError(e.message, 409);
    console.error("cart error", e);
    return jsonError("Could not update your cart. Please try again.", 500);
  }
}

/** Add to cart: { slug, quantity } */
export const POST = (request: Request) => mutate(request, "add");
/** Set quantity (0 removes): { slug, quantity } */
export const PATCH = (request: Request) => mutate(request, "set");
