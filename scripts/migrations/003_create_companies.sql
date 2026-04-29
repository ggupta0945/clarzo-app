-- Reference table for stock metadata: sector, industry, market-cap bucket,
-- and corporate group (Adani / Tata / Reliance / etc.) used by the dashboard
-- insights engine and allocation charts.
--
-- This is read-only reference data — populated once from NSE / a hand-curated
-- starter list, then refreshed periodically. Public read so RLS-friendly
-- joins work; writes are restricted to the service role.

create table if not exists public.companies (
  isin text primary key,
  symbol text,
  name text,
  sector text,
  industry text,
  mcap_category text,
  corp_group text,
  updated_at timestamptz default now()
);

create index if not exists idx_companies_sector on public.companies (sector);
create index if not exists idx_companies_corp_group on public.companies (corp_group);

alter table public.companies enable row level security;

drop policy if exists "companies are world-readable" on public.companies;
create policy "companies are world-readable"
  on public.companies for select
  using (true);
