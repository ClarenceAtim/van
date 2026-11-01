import "server-only";
import { NextResponse } from "next/server";

/**
 * CSRF defence for JSON routes: browsers always send Origin on cross-site
 * POST/PATCH/DELETE, so reject requests whose Origin doesn't match our host.
 */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return request.method === "GET" || request.method === "HEAD";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const jsonError = (message: string, status: number) => NextResponse.json({ error: message }, { status });
