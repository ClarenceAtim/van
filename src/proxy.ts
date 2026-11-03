import { NextResponse, type NextRequest } from "next/server";
import { auth, isAuthConfigured } from "@/lib/auth/server";

/**
 * Signed-out visitors to /account or /admin are sent to /login by Neon Auth's middleware.
 * The admin role is re-checked on the server in app/admin/layout.tsx and every admin action.
 */
export default async function proxy(request: NextRequest) {
  if (!isAuthConfigured()) {
    const { pathname, search } = request.nextUrl;
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname + search)}`, request.url));
  }
  return auth().middleware({ loginUrl: "/login" })(request);
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
