-- Adds an is_sample flag to holdings so we can offer a "Try with sample
-- portfolio" demo path on the empty dashboard. Sample rows look like real
-- holdings to every downstream surface (insights, Ask Clarzo, rebalancer,
-- tax snapshot) — the flag exists only so we can render a "this is a demo"
-- banner and bulk-delete on conversion.
--
-- Run this in the Supabase SQL editor before deploying the demo flow.

alter table public.holdings
  add column if not exists is_sample boolean not null default false;

-- Partial index keeps the "does this user have a demo loaded?" check fast
-- without bloating the main holdings index.
create index if not exists holdings_user_is_sample_idx
  on public.holdings (user_id)
  where is_sample = true;
