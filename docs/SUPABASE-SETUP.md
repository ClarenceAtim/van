# Supabase setup

1. **Create a project** at [supabase.com](https://supabase.com) (free tier is fine). Choose a strong database password and a region close to your customers.
2. **Copy the keys** from *Project Settings → API* into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — `anon` / publishable key
   - `SUPABASE_SERVICE_ROLE_KEY` — `service_role` / secret key (**server only**)
   - `SUPABASE_PROJECT_ID` — the project reference (the `xxxx` in `xxxx.supabase.co`)
3. **Run the migrations.** Either:
   - **CLI (recommended):** `npx supabase login`, `npx supabase link --project-ref <id>`, then `npx supabase db push`.
   - **Dashboard:** open *SQL Editor* and run each file in `supabase/migrations/` in filename order.
4. **Generate types (optional):** `npm run db:types` writes `src/lib/supabase/database.types.ts`.
5. **Auth settings** (*Authentication → URL Configuration*):
   - Site URL: your production URL (e.g. `https://scalehaven.vercel.app`)
   - Redirect URLs: `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback`
6. **Bot protection for auth** (*Authentication → Attack Protection*): enable CAPTCHA, choose **Turnstile**, and paste your Turnstile **secret** key. The login and signup forms already send the token.
7. **Load products:** `npm run sync:products` (validates JSON, uploads images to the `products` bucket and upserts products).
8. **Make yourself an admin:** sign up on the site, then run in the SQL editor:

   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

## What the migrations create

| Migration | Contents |
| --- | --- |
| `…01_schema.sql` | Enums, tables, indexes (slug, category, price, full-text `search` column), `updated_at` triggers, profile-on-signup trigger |
| `…02_rls.sql` | Row Level Security on every table (see `docs/SECURITY.md`) |
| `…03_functions_storage.sql` | `fulfill_order` (webhook), `rate_limit_hit`, `search_products`, the public `products` storage bucket |
| `…04_seed_regions.sql` | US states where live animals can ship (editable in `/admin/settings`) |

RLS rules are covered by automated tests: `npm test` runs every migration in an in-memory Postgres and checks access as anonymous visitors, two customers and an admin.
