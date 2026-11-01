-- Row Level Security for every table.
-- The service role bypasses RLS and is only used on the server
-- (API routes, Stripe webhook, sync script).

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.wishlists enable row level security;
alter table public.contact_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.live_animal_regions enable row level security;
alter table public.rate_limits enable row level security;

-- ───────── Catalog: public read, admin write ─────────
create policy "categories readable by everyone" on public.categories
  for select using (true);
create policy "admins manage categories" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "active products readable by everyone" on public.products
  for select using (active or public.is_admin());
create policy "admins insert products" on public.products
  for insert to authenticated with check (public.is_admin());
create policy "admins update products" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete products" on public.products
  for delete to authenticated using (public.is_admin());

create policy "images of active products readable" on public.product_images
  for select using (
    exists (select 1 from public.products p where p.id = product_id and (p.active or public.is_admin()))
  );
create policy "admins manage images" on public.product_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "regions readable by everyone" on public.live_animal_regions
  for select using (true);
create policy "admins manage regions" on public.live_animal_regions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ───────── Profiles: own row; role cannot be self-escalated ─────────
create policy "users read own profile" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "admins update profiles" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Column privileges: customers may only change these columns, never `role`.
revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone) on public.profiles to authenticated;

-- ───────── Addresses & wishlists: owner only ─────────
create policy "owners manage addresses" on public.addresses
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "owners manage wishlist" on public.wishlists
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────── Carts: owner only (guest carts are server-side only) ─────────
create policy "owners manage cart" on public.carts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "owners manage cart items" on public.cart_items
  for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- ───────── Orders: read own; only admins update; created by server ─────────
create policy "users read own orders" on public.orders
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "admins update orders" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "users read own order items" on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
  );

-- ───────── Reviews: verified buyers write, admins moderate ─────────
create or replace function public.has_purchased(p_product_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.user_id = auth.uid()
      and oi.product_id = p_product_id
      and o.status in ('paid', 'processing', 'shipped', 'delivered')
  )
$$;

create policy "approved reviews readable" on public.reviews
  for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy "verified buyers submit reviews" on public.reviews
  for insert to authenticated with check (
    user_id = auth.uid() and status = 'pending' and public.has_purchased(product_id)
  );
create policy "admins moderate reviews" on public.reviews
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "authors or admins delete reviews" on public.reviews
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- ───────── Inbox tables: written by the server, read by admins ─────────
create policy "admins read messages" on public.contact_messages
  for select to authenticated using (public.is_admin());
create policy "admins update messages" on public.contact_messages
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete messages" on public.contact_messages
  for delete to authenticated using (public.is_admin());

create policy "admins read subscribers" on public.newsletter_subscribers
  for select to authenticated using (public.is_admin());
create policy "admins delete subscribers" on public.newsletter_subscribers
  for delete to authenticated using (public.is_admin());

-- rate_limits: no policies → only the service role can touch it.
