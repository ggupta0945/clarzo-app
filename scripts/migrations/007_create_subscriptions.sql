-- Per-user subscription state. One row per user, defaulted to 'free'. Razorpay
-- IDs are nullable until a paid plan kicks in. We read this on every
-- ClarzoGPT request to gate free-tier limits.
--
-- Don't try to keep current_period_end in sync via cron — let the Razorpay
-- webhook be the source of truth and just trust the row.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'free' check (status in ('free', 'active', 'past_due', 'cancelled')),
  plan text not null default 'free',
  razorpay_subscription_id text,
  razorpay_customer_id text,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_subscriptions_user
  on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;

drop policy if exists "users read own subscription" on public.subscriptions;
create policy "users read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Writes happen only via service role from the Razorpay webhook handler;
-- no client-side insert/update policy on purpose.
