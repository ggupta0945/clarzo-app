-- Extend companies with NSE index membership and tighten the mcap_category
-- domain. Day 2: the NSE sync script populates these from public Nifty 100/
-- Midcap 150 / Smallcap 250 lists, replacing the hand-curated starter.

alter table public.companies
  add column if not exists index_membership text[];

create index if not exists idx_companies_mcap on public.companies (mcap_category);

-- Allow 'micro' and 'unknown' as additional buckets. Drop existing constraint
-- if any, then re-add with the wider domain. Use a do-block so this is
-- idempotent across re-runs.
do $$
begin
  alter table public.companies drop constraint if exists companies_mcap_category_check;
exception when undefined_object then null;
end $$;

alter table public.companies
  add constraint companies_mcap_category_check
  check (mcap_category is null or mcap_category in ('large', 'mid', 'small', 'micro', 'unknown'));
