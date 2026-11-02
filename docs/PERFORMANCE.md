# Performance

Measured November 2026 on the **production build** (`npm run build` + `npm start`) with Lighthouse 12.8 in mobile mode (Moto G-class emulation: slow 4G and 4× CPU slowdown).

## Results

Before means the build at the start of this work; after means the build with the changes below. The pages are the home page, `/shop`, `/shop/live-reptiles`, `/shop/live-reptiles/leopard-gecko-normal` and `/blog/leopard-gecko-care-guide`.

### Standard mobile settings (4× CPU slowdown)

| Page | Performance | LCP | TBT | CLS | FCP | SEO | Accessibility | Best Practices |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | 61 → 59 | 3.7 s → 3.8 s | 2,130 → 2,500 ms | 0 → 0 | 1.0 → 0.9 s | 100 | 100 | 100 |
| Shop | 63 → 65 | 3.9 s → 3.8 s | 1,310 → 1,240 ms | 0 → 0 | 1.2 → 1.2 s | 100 | 100 | 100 |
| Category | 64 → 68 | 4.0 s → 3.7 s | 1,140 → 820 ms | 0 → 0 | 1.3 → 1.9 s | 100 | 100 | 100 |
| Product | 59 → 68 | 3.8 s → 3.7 s | 2,370 → 980 ms | 0 → 0 | 1.0 → 1.0 s | 100 | 100 | 100 |
| Blog post | 78 → 79 | 3.3 s → 2.4 s | 570 → 760 ms | 0 → 0 | 1.3 → 1.4 s | 100 | 100 | 100 |

### Calibrated for this computer (2× CPU slowdown, after only)

| Page | Performance | LCP | TBT | CLS |
| --- | --- | --- | --- | --- |
| Home | 81 | 3.5 s | 400 ms | 0 |
| Shop | 85 | 3.5 s | 280 ms | 0 |
| Category | 82 | 3.4 s | 380 ms | 0 |
| Product | 89 | 3.2 s | 240 ms | 0 |
| Blog post | 92 | 3.2 s | 130 ms | 0 |

**INP** can't be measured by a Lighthouse page-load test. Total Blocking Time (TBT) is the lab proxy for it; real INP will show in PageSpeed Insights' field data and in Vercel Speed Insights once the site has traffic.

## Why the local numbers are unreliable

- **Slow CPU.** Lighthouse measured this computer's CPU benchmark at 750–940 during the runs. It expects a machine scoring roughly 1,500 or more before applying its 4× slowdown, so a slower machine is throttled far below a real mid-range phone. Lighthouse printed a warning to this effect on every run. Its documentation recommends a lower multiplier for slow machines, which is why the calibrated table exists.
- **High run-to-run variance.** About a third of the runs failed outright with trace errors (`NO_FCP` / `NO_NAVSTART`) and had to be repeated. Scores for the same build varied by 10+ points between runs.
- **Image cache.** The first run after a server restart optimises every image on the fly (AVIF encoding is slow). One cold home-page run scored 46 with a 10.8 s Speed Index, so that run was repeated after warming the cache.

On the product page, the parts of LCP that are measured rather than simulated are now all under 1 s: time to first byte 60 ms, image load delay 67 ms and image download 89 ms (down from 1,097 ms). The remaining reported LCP comes from Lighthouse's simulation of main-thread CPU time on this machine.

**Test on real infrastructure after deploying to Vercel.** Run each URL through [PageSpeed Insights](https://pagespeed.web.dev/) (mobile):

1. `https://<your-domain>/`
2. `https://<your-domain>/shop`
3. `https://<your-domain>/shop/live-reptiles`
4. `https://<your-domain>/shop/live-reptiles/leopard-gecko-normal`
5. `https://<your-domain>/shop/food-supplements/live-hornworms-25` (a new product)
6. `https://<your-domain>/blog`
7. `https://<your-domain>/blog/leopard-gecko-care-guide`

Open each page once before testing, so Vercel has optimised and cached its images.

## What was changed

**Images**
- Re-compressed 134 product and blog photos that were over budget. Every full-size photo is now ≤ 150 KB and every thumbnail ≤ 40 KB, cutting the image folders from about 43 MB to 26 MB. Quality is lowered first; only the most detailed textures were narrowed (never below 700 px). Product JSON dimensions were updated to match. Re-run `npx tsx scripts/compress-images.ts --write` after adding photos.
- Above-the-fold images (home hero, product gallery, blog covers, the first two category cards) now use `preload` plus `fetchPriority="high"`. Next.js 16's deprecated `priority` prop only preloaded. Everything else lazy-loads.
- Every image already used `next/image` with `fill` inside fixed-aspect boxes (CLS 0) and responsive `sizes`, served as AVIF/WebP. Optimised images are now cached for 31 days (`images.minimumCacheTTL`). Static photos in `/products` and `/blog` get a one-week `Cache-Control` with background revalidation.

**JavaScript**
- `Button`, `Input` and `Badge` are now plain HTML elements instead of Base UI components. That removed the UI library (about 18 KB gzipped) from every public page; it now loads only with the cart drawer, mobile menu and admin dialogs. `Button` still defaults to `type="button"` like before.
- The toast library (sonner) loads with a plain `import()` after the page is idle, or on the first toast (`src/lib/toast.ts`). `next/dynamic` had still been preloading it on every page.
- Cloudflare Turnstile now loads only when a form that uses it scrolls into view or someone starts typing in it. The footer newsletter form previously pulled it into every page. Its space is reserved, so nothing shifts.
- Product cards sent to the browser no longer carry image credit, licence and source URL. On `/shop`, which sends all products for client-side filtering, the HTML dropped from 48.5 KB to 41 KB gzipped.
- Gzipped JavaScript per page is about 205 KB, down from about 220 KB. About 147 KB of that is React and the Next.js runtime itself.
- Already in place and confirmed: pages are Server Components; the cart drawer, mobile menu and image zoom load on demand; admin code is never imported by public routes; no payment provider script loads in the browser (checkout is an order request).

**CSS and fonts**
- Removed the header's `backdrop-blur` (expensive to paint and recalculate on phones).
- Dropped the unused 700 weight of the Fraunces display font. Both fonts use `next/font` with `display: swap` and are preloaded and self-hosted.
- Tailwind v4 already only emits classes that are used. Inlining the CSS into the HTML (`experimental.inlineCss`) was tried and reverted: it embedded the stylesheet 12 times in the page and tripled the HTML size.

**Data and caching**
- Already in place: home, shop, category, product and blog pages are statically generated with hourly revalidation. The catalog query is cached under a tag that `/admin` and the product sync invalidate. The database already has indexes on category, product images, reviews, orders and full-text search; no slow or duplicate queries were found.

## Still to do

- Confirm the scores on PageSpeed Insights after deploying. If mobile Performance there is still below 90, the next step is reducing client-side JavaScript on the home and category pages: each product card hydrates its own "Add to cart" button, and `/shop` ships the whole catalog for client-side filtering.
- Add Vercel Speed Insights to collect real-user Core Web Vitals, including INP.
