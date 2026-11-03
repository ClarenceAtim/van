# Security

This document explains what is protected in the ScaleHaven store and how. Report a security problem privately to the store owner rather than opening a public issue.

## Data access: Supabase Row Level Security

RLS is **enabled on every table** (`supabase/migrations/…02_rls.sql`).

| Data | Who can read | Who can write |
| --- | --- | --- |
| Products, categories, images, shipping regions | Everyone (active products only) | Admins |
| Reviews | Everyone sees **approved** reviews; authors see their own | Verified buyers insert (`pending`, only if they have a paid order with that product); admins approve/reject |
| Profiles | The user, admins | The user may change only `full_name` and `phone` (column privileges). **Nobody can promote themselves to admin** |
| Carts, addresses, wishlists | The owner | The owner |
| Orders, order items | The owner, admins | Created only by the server; status changed only by admins (and the daily unpaid-order job) |
| Contact messages, newsletter | Admins | Server only (after validation, rate limiting and Turnstile) |
| Rate-limit counters | Nobody | Server only |

`fulfill_order` and `rate_limit_hit` can only be executed with the service role.

**Tested:** `npm test` runs every migration in an in-memory Postgres and checks access as an anonymous visitor, two separate customers and an admin (`tests/db/rls.test.ts`). It covers reading another user's orders, addresses and profile, changing prices, changing order status, self-promotion to admin, reviewing without buying and self-approving reviews.

## Secrets

- The **service role key** is used only in server code (`src/lib/supabase/admin.ts`, `server-only` import) and the CLI scripts. It is never exposed to the browser; only `NEXT_PUBLIC_*` variables reach client bundles.
- `.env*` files are git-ignored (except `.env.example`, which has no values). GitHub Actions read secrets from **GitHub Secrets**.

## Payments

- **Prices are computed on the server** from the catalog (`src/lib/pricing.ts`, `src/lib/cart.ts`). The browser only sends a product slug and quantity; any price it sends is ignored.
- **No payments are taken on the website** (see [ORDERS-AND-PAYMENTS.md](ORDERS-AND-PAYMENTS.md)). Customers place an order request; payment details are emailed by the owner and are never shown on the site.
- "Place order" re-validates every step with Zod, recalculates prices, delivery and totals on the server, and rejects the order if the total the customer reviewed differs (`src/lib/order-service.ts`). Stock is reserved atomically (`stock_quantity >= qty` in the same `update`), so two customers can't buy the last item.
- **Orders are marked paid only by an admin** in /admin. Every status change is a guarded transition (only from the allowed previous statuses) and is logged in `order_events`.
- The confirmation page needs a signed link (HMAC with `CART_COOKIE_SECRET`) or the signed-in owner, so order numbers can't be guessed to view other orders.
- `/api/cron/orders` (reminders and releasing unpaid orders) requires `Authorization: Bearer $CRON_SECRET`.

## Authentication and sessions

- Supabase Auth with email + password or magic link. Passwords need 10+ characters with a letter and a number.
- Session cookies are set by `@supabase/ssr` (httpOnly, `Secure` in production, `SameSite=Lax`). The guest cart cookie is an **HMAC-signed**, httpOnly, SameSite cookie.
- Login errors don't reveal whether an email exists; magic-link and newsletter responses are identical either way.
- Redirects after login only allow same-site paths (open-redirect protection, unit tested).

## Admin area

- `/admin` is blocked in **middleware** (signed-out users → login; non-admins → 404) and **re-checked on the server** in the admin layout and in every admin action (`requireAdmin()`).
- Admin actions use the admin's own Supabase session, so RLS enforces the role a third time.
- Image uploads: JPG/PNG/WebP only, max 5 MB, and every file is **re-encoded with sharp** (proves it is an image and strips EXIF/GPS metadata).

## Input handling

- **Zod validation** on every form, server action and API route (`src/lib/validation.ts`). Strings are trimmed, control characters removed and lengths capped.
- User content (reviews, messages, names) is rendered as **plain text** by React. No user content is ever rendered as HTML. Markdown is only rendered for repo-controlled content, and raw HTML in Markdown is disabled.
- Email templates HTML-escape every user value.
- JSON API routes reject cross-site requests by checking the `Origin` header (CSRF). Server actions have Next.js's built-in origin checks.

## Abuse protection

- **Cloudflare Turnstile** on signup, login, magic link, contact, newsletter and checkout. If you enable CAPTCHA in Supabase Auth, set `SUPABASE_AUTH_CAPTCHA=true` so the token is verified by Supabase (protecting the Auth API directly) rather than twice.
- **Rate limiting** (`src/lib/rate-limit.ts`) on auth, contact, newsletter, search, cart, checkout and reviews: Upstash Redis if configured, otherwise a Postgres-backed limiter.
- Contact form honeypot field.

## HTTP security headers (`next.config.ts`)

`Content-Security-Policy` (self + Cloudflare Turnstile + Neon, `frame-ancestors 'none'`, `object-src 'none'`), `Strict-Transport-Security` (2 years, preload), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`. The `X-Powered-By` header is removed. Vercel serves HTTPS only.

> `script-src` includes `'unsafe-inline'` because Next.js inlines small bootstrap scripts; per-request nonces would disable static rendering. All other directives are strict.

## Dependencies

- `npm audit --omit=dev` is clean; CI fails on high/critical advisories (`.github/workflows/ci.yml`).
- A patched PostCSS is pinned through `overrides` in `package.json` (Next 15 bundles an older copy that is used only at build time).
- **Dependabot** opens weekly update PRs (`.github/dependabot.yml`).

## Before launch checklist

- [ ] Set `CART_COOKIE_SECRET`, `REVALIDATE_SECRET` and Turnstile keys in Vercel.
- [ ] Enable CAPTCHA (Turnstile) in Supabase Auth and set `SUPABASE_AUTH_CAPTCHA=true`.
- [ ] Set `CRON_SECRET` and the `ORDER_*` email variables in Vercel, and fill in the payment templates in /admin.
- [ ] Check [securityheaders.com](https://securityheaders.com) for the production URL.
- [ ] Turn on GitHub secret scanning and Dependabot alerts in the repository settings.
