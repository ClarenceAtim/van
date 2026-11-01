import { NextResponse } from "next/server";
import { mergeGuestCart } from "@/lib/cart";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/validation";

/** Handles magic-link and email-confirmation redirects from Supabase Auth (PKCE code exchange). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeRedirect(url.searchParams.get("next"));
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await mergeGuestCart(data.user.id);
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
