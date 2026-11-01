import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Refreshes the Supabase session cookie and guards /account and /admin.
 * Admin pages re-check the role on the server as well (defence in depth).
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const needsUser = pathname.startsWith("/account") || pathname.startsWith("/admin");
  const loginUrl = new URL(`/login?next=${encodeURIComponent(pathname + search)}`, request.url);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return needsUser ? NextResponse.redirect(loginUrl) : NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  // getUser() validates the JWT with Supabase (getSession() alone can be spoofed).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (needsUser && !user) return NextResponse.redirect(loginUrl);

  if (pathname.startsWith("/admin") && user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.rewrite(new URL("/not-found-admin", request.url), { status: 404 });
  }

  if ((pathname === "/login" || pathname === "/signup") && user) {
    return NextResponse.redirect(new URL("/account", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*", "/checkout/:path*", "/api/cart", "/login", "/signup", "/auth/:path*"],
};
