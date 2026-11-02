import { auth, isAuthConfigured } from "@/lib/auth/server";

// Proxies Better Auth API calls (sessions, magic links, password reset…) to Neon Auth.
const notConfigured = () => Response.json({ error: "Auth is not configured" }, { status: 503 });

async function handle(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  if (!isAuthConfigured()) return notConfigured();
  const handlers = auth().handler();
  const method = request.method as keyof typeof handlers;
  const fn = handlers[method];
  return fn ? fn(request, ctx) : new Response(null, { status: 405 });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
