-- Order requests: no online payment. Customers choose a payment method at checkout, the store
-- emails payment details, and marks the order paid in /admin. Stock is reserved when the order
-- is placed and released if it is cancelled or never paid.

-- Status becomes text with a check constraint (easier to extend than an enum).
alter table public.orders alter column status drop default;
alter table public.orders alter column status type text using status::text;
update public.orders set status = 'awaiting_payment_details' where status = 'pending';
alter table public.orders alter column status set default 'awaiting_payment_details';
alter table public.orders add constraint orders_status_check check (status in (
  'awaiting_payment_details', 'payment_details_sent', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
));
drop function if exists public.fulfill_order(uuid, text);
drop type if exists public.order_status;

-- Stripe columns are no longer used.
alter table public.orders drop column if exists stripe_session_id;
alter table public.orders drop column if exists stripe_payment_intent_id;

alter table public.orders
  add column customer_name text,
  add column phone text,
  add column whatsapp text,
  add column delivery_notes text,
  add column preferred_delivery_date date,
  add column payment_method text,
  add column payment_reference text,
  add column payment_details_sent_at timestamptz,
  add column payment_due_at timestamptz,
  add column reminder_sent_at timestamptz,
  add column paid_at timestamptz,
  add column cancelled_at timestamptz,
  add column terms_accepted_at timestamptz,
  add column stock_reserved boolean not null default false,
  add column cart_id uuid;

create index orders_payment_method_idx on public.orders (payment_method, created_at desc);
create index orders_payment_due_idx on public.orders (payment_due_at) where status = 'payment_details_sent';

-- Every status change and email, for the order's history in /admin.
create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text,
  message text not null,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

-- One email template per payment method with the store's payment details (admin only).
create table public.payment_templates (
  method_id text primary key,
  subject text not null,
  body text not null,
  updated_at timestamptz not null default now()
);
create trigger payment_templates_updated before update on public.payment_templates for each row execute function public.set_updated_at();
