-- Single-page order requests: customers tick one or more payment methods, ship worldwide, and the
-- store confirms each order by email with the shipping cost and payment details for one method.

-- Statuses: awaiting_confirmation → confirmation_sent → paid → processing → shipped → delivered (+ cancelled, refunded)
alter table public.orders drop constraint orders_status_check;
update public.orders set status = 'awaiting_confirmation' where status = 'awaiting_payment_details';
update public.orders set status = 'confirmation_sent' where status = 'payment_details_sent';
update public.order_events set status = 'awaiting_confirmation' where status = 'awaiting_payment_details';
update public.order_events set status = 'confirmation_sent' where status = 'payment_details_sent';
alter table public.orders alter column status set default 'awaiting_confirmation';
alter table public.orders add constraint orders_status_check check (status in (
  'awaiting_confirmation', 'confirmation_sent', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
));

-- One or more payment methods chosen by the customer, plus free text for "Other".
alter table public.orders add column payment_methods text[] not null default '{}';
update public.orders set payment_methods = array[payment_method] where payment_method is not null;
alter table public.orders add column payment_other text;
-- The method the store sent payment details for in the confirmation email.
alter table public.orders rename column payment_method to confirmed_payment_method;
drop index if exists public.orders_payment_method_idx;
create index orders_payment_methods_idx on public.orders using gin (payment_methods);

alter table public.orders rename column payment_details_sent_at to confirmation_sent_at;
-- Shipping is unknown until the store confirms it.
alter table public.orders add column shipping_confirmed boolean not null default false;
alter table public.orders add column company text;
alter table public.orders drop column whatsapp;

drop index if exists public.orders_payment_due_idx;
create index orders_payment_due_idx on public.orders (payment_due_at) where status = 'confirmation_sent';

-- Payment templates: the store's details for each method as named fields (shown only in emails).
alter table public.payment_templates add column details jsonb not null default '{}'::jsonb;

-- Saved addresses can be anywhere in the world now.
alter table public.addresses alter column region drop not null;
alter table public.addresses alter column postal_code drop not null;
alter table public.addresses add column company text;
