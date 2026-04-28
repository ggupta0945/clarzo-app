-- Adds last-known stock price columns to holdings.
-- Run this in the Supabase SQL editor before testing the new upload flow.
--
-- Why: stocks aren't in AMFI nav_latest (MF-only). Until we wire a daily
-- NSE/BSE price sync, we store the broker-provided current price/value at
-- upload time so the dashboard can compute returns for stocks.

alter table public.holdings
  add column if not exists current_price numeric,
  add column if not exists current_value_at_import numeric;
