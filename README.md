# ScaleHaven Reptiles

A production-ready e-commerce store for captive-bred reptiles and reptile supplies.

**Stack:** Next.js 15 (App Router, TypeScript strict) · Tailwind CSS + shadcn/ui · Supabase (Postgres, Auth, Storage) · order requests with manual payment (no card processing) · Resend · Cloudflare Turnstile · Vercel

- 112 products (43 live animals + 69 supplies) stored as JSON in [`data/products/`](data/products), synced to Supabase by a GitHub Action
- Storefront: home, shop with filters/sort/pagination, product pages with zoom gallery, care sheets and reviews, instant search, cart drawer + cart page, guest and account checkout
- Customer accounts: email/password and magic link, order history, addresses, wishlist, verified-buyer reviews
- Admin dashboard (`/admin`): sales overview, low stock, products (create/edit/images/flags), orders (status + tracking emails), reviews, messages, live-animal shipping regions
- Security: RLS on every table (tested), server-side pricing, server-recalculated order totals, Zod everywhere, Turnstile, rate limiting, strict headers — see [docs/SECURITY.md](docs/SECURITY.md)
- SEO: per-page metadata, canonical URLs, Product/Breadcrumb/Organization/WebSite/FAQ/Article JSON-LD, sitemap, robots, OG images, static generation + ISR

---

## 1. Set up from zero

**Requirements:** Node.js 20+ (22 recommended) and npm, Git, and free accounts at Neon, Resend, Cloudflare and Vercel.

```bash
git clone https://github.com/ClarenceAtim/van.git reptile-store
cd reptile-store
npm install
cp .env.example .env.local     # then fill in the values (see section 2)
npm run dev                    # http://localhost:3000
```

The site runs **before** any keys are added: products are read straight from the repo JSON, and cart/checkout/accounts show a friendly "not available yet" message. Add the services in this order:

1. **Supabase.** Follow [docs/SUPABASE-SETUP.md](docs/SUPABASE-SETUP.md) (create the project, run the migrations, `npm run sync:products`, make yourself admin).
2. **Orders and payments:** no payment provider is needed. Follow [docs/ORDERS-AND-PAYMENTS.md](docs/ORDERS-AND-PAYMENTS.md) to set the `ORDER_*` emails, `CRON_SECRET` and your payment templates.
3. **Resend:** create an API key and verify your sending domain. Set `RESEND_API_KEY` and `EMAIL_FROM`.
4. **Cloudflare Turnstile:** create a widget for your domains (and `localhost`). Set the site key and secret key. For local testing you can use Cloudflare's [test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).
5. **Optional:** Upstash Redis for rate limiting at scale; Unsplash/Pexels keys for the image fetcher.

## 2. Environment variables

All variables are listed with comments in [`.env.example`](.env.example).

| Variable | Where it's used | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs and links in emails | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server Supabase clients | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only: cart, orders, webhook, sync script | ✅ |
| `ORDER_FROM_EMAIL`, `ORDER_REPLY_TO_EMAIL`, `ORDER_NOTIFICATION_EMAIL` | Order email addresses | Recommended |
| `CRON_SECRET` | Daily payment reminders and releasing unpaid orders | ✅ for sales |
| `RESEND_API_KEY`, `EMAIL_FROM`, `CONTACT_INBOX_EMAIL` | Order, shipping and contact emails | ✅ for emails |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Bot protection | ✅ in production |
| `SUPABASE_AUTH_CAPTCHA` | `true` once CAPTCHA is enabled in Supabase Auth | optional |
| `CART_COOKIE_SECRET` | Signs the guest cart cookie (`openssl rand -hex 32`) | ✅ in production |
| `REVALIDATE_SECRET` | Lets the product sync refresh the live site | ✅ |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limiting (falls back to Postgres) | optional |
| `UNSPLASH_ACCESS_KEY`, `PEXELS_API_KEY` | `npm run fetch:images` | optional |
| `SUPABASE_PROJECT_ID` | `npm run db:types` | optional |

## 3. Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Develop, build and run the site |
| `npm run lint` / `typecheck` | ESLint and TypeScript checks |
| `npm test` | Unit tests (pricing, validation, product data) and **RLS tests** against all migrations |
| `npm run test:e2e` | Playwright end-to-end tests (start the site first or let Playwright start it) |
| `npm run validate:products` | Validate `data/products/*.json` without touching the database |
| `npm run sync:products` | Validate, upload new images to Storage, upsert products, print a summary (`-- --prune` hides products removed from JSON) |
| `npm run export:products` | Write products edited in `/admin` back to the JSON files |
| `npm run fetch:images` | Find and optimize licensed photos for products without one; regenerates `docs/IMAGES-TODO.md` |
| `npm run schema:json` | Regenerate `data/product.schema.json` from the Zod schema |
| `npm run db:types` | Generate Supabase TypeScript types |

## 4. Adding and editing products

Products are edited as JSON on GitHub; see the plain-English guide **[docs/ADDING-PRODUCTS.md](docs/ADDING-PRODUCTS.md)** (with a copy-paste template). Pushing to `main` runs `.github/workflows/sync-products.yml`, which validates the data, syncs Supabase and refreshes the live site. Pull requests are validated only.

Product photos and their licenses are listed at `/credits`. Products whose photo is representative (same species or same item type, not the exact product or morph) are listed in **[docs/IMAGES-TODO.md](docs/IMAGES-TODO.md)**. Replace those with your own photos when you can.

Care guides are Markdown files in `content/guides/`, and policy pages are in `content/pages/`.

## 5. Deploying to Vercel

1. Push the repo to GitHub, then in Vercel choose **Add New → Project** and import it. The framework is detected automatically.
2. Add every variable from section 2 under **Settings → Environment Variables** (Production and Preview). Set `NEXT_PUBLIC_SITE_URL` to your production URL.
3. Deploy. Then:
   - **Cron:** `vercel.json` schedules `/api/cron/orders` daily; Vercel sends `CRON_SECRET` automatically once it is set.
   - **Supabase Auth:** set the Site URL and add `https://<your-domain>/auth/callback` to the redirect URLs.
   - **GitHub Secrets** (repo → Settings → Secrets → Actions): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL`, `REVALIDATE_SECRET` for the product sync.
4. Optional: add your domain in Vercel → Settings → Domains, then update `NEXT_PUBLIC_SITE_URL`, the `ORDER_*` emails and the Supabase redirect URLs.

### Going live checklist

- [ ] Fill in your payment details in /admin → Settings → Payment templates.
- [ ] Verify your sending domain in Resend.
- [ ] Update the store details in [`src/config/site.ts`](src/config/site.ts): name, contact email, phone, address and shipping rates.
- [ ] Review the policy pages in `content/pages/` with your own terms.
- [ ] Replace representative photos listed in `docs/IMAGES-TODO.md`, starting with the live animals.
- [ ] Run PageSpeed Insights, the Rich Results Test and securityheaders.com against the live URL.

## 6. Project structure

```
data/                 products (JSON, source of truth), categories, JSON Schema
content/              care guides and policy pages (Markdown)
public/products/      optimized product photos (WebP + thumbnails)
scripts/              sync, export, image fetcher, schema generator
supabase/migrations/  schema, RLS, functions, storage, seed regions
src/app/              routes (storefront, account, admin, API, checkout)
src/components/       UI components (shadcn/ui in components/ui)
src/config/site.ts    store name, currency, contact details, shipping rates
src/lib/              catalog, cart, pricing, validation, security, SEO, email
tests/                unit, RLS (PGlite) and Playwright E2E tests
docs/                 setup, products, security and image guides
```
