/**
 * Posts a message to the store inbox via FormSubmit from the customer's browser. Server-side
 * posts from our hosting provider are refused (HTTP 403 in the Vercel logs, 2026-11-18), but
 * the same post from a real browser is accepted — so the checkout, contact and newsletter
 * forms all send through here when the database is down. The endpoint must be in the CSP
 * connect-src list (next.config.ts), or the browser blocks the post.
 */
export async function postToFormSubmit(endpoint: string, fields: Record<string, string>): Promise<boolean> {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(fields),
    });
    const data = (await res.json().catch(() => null)) as { success?: string } | null;
    return data?.success === "true";
  } catch {
    return false;
  }
}
