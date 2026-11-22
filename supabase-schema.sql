create table if not exists public.orders (
  id bigint generated always as identity primary key,
  order_id text not null unique,
  customer_name text not null,
  phone text not null,
  delivery_address text not null,
  product text not null,
  color text not null,
  size text not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;
-- No public policies: browser clients cannot read or write this table directly.
-- The Next.js API route uses the service-role key on the server only.