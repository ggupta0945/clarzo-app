-- Mutual Fund segment schema.
--
-- Five tables:
--   mf_schemes        — scheme master (one row per scheme)
--   mf_nav_history    — daily NAV per scheme (charts, returns)
--   mf_returns        — pre-computed 1Y/3Y/5Y/10Y/SI + category rank
--   mf_alerts         — change events (manager / category / name / objective / asset-mix)
--   mf_watchlist      — per-user fund watchlist
--
-- All public-readable reference tables (mf_schemes, mf_nav_history, mf_returns)
-- are RLS-enabled with a world-readable select policy so RSC pages and
-- portfolio enrichment joins work for anonymous and signed-in users.
-- mf_alerts and mf_watchlist are user-scoped under standard auth.uid() rules.

-- ============================================================
-- 1. mf_schemes — scheme master
-- ============================================================
create table if not exists public.mf_schemes (
  scheme_code text primary key,                    -- AMFI scheme code (preferred external id)
  isin_growth text,                                -- ISIN for growth option
  isin_div_reinvestment text,                      -- ISIN for IDCW reinvestment
  scheme_name text not null,
  amc text,                                         -- AMC short name (e.g. "HDFC", "Mirae")
  amc_full_name text,                               -- Full AMC name
  category text,                                    -- SEBI category: "Equity", "Debt", "Hybrid", etc.
  sub_category text,                                -- "Large Cap", "Mid Cap", "ELSS", "Flexi Cap" ...
  plan_type text,                                   -- "Direct" or "Regular"
  option_type text,                                 -- "Growth" or "IDCW"
  scheme_type text,                                 -- "open_ended" / "close_ended"
  benchmark text,                                   -- e.g. "NIFTY 50 TRI"
  fund_manager text,                                -- comma-separated names
  inception_date date,
  expense_ratio numeric,                            -- as percentage, e.g. 1.25
  aum_crores numeric,                               -- AUM in INR crores
  min_investment numeric,                           -- min lumpsum in INR
  min_sip numeric,                                  -- min SIP in INR
  exit_load text,                                   -- free text e.g. "1% if redeemed within 1Y"
  riskometer text,                                  -- "Low" .. "Very High"
  objective text,                                   -- investment objective (long text)
  is_active boolean default true,
  search_tokens text,                               -- normalised tokens for ILIKE search
  updated_at timestamptz default now()
);

create index if not exists idx_mf_schemes_amc on public.mf_schemes (amc);
create index if not exists idx_mf_schemes_category on public.mf_schemes (category);
create index if not exists idx_mf_schemes_sub_category on public.mf_schemes (sub_category);
create index if not exists idx_mf_schemes_plan_type on public.mf_schemes (plan_type);
create index if not exists idx_mf_schemes_search on public.mf_schemes using gin (to_tsvector('simple', coalesce(search_tokens, '')));
create index if not exists idx_mf_schemes_isin_growth on public.mf_schemes (isin_growth);

alter table public.mf_schemes enable row level security;

drop policy if exists "mf_schemes are world-readable" on public.mf_schemes;
create policy "mf_schemes are world-readable"
  on public.mf_schemes for select
  using (true);

-- ============================================================
-- 2. mf_nav_history — daily NAV history
-- ============================================================
create table if not exists public.mf_nav_history (
  scheme_code text not null references public.mf_schemes(scheme_code) on delete cascade,
  nav_date date not null,
  nav numeric not null,
  primary key (scheme_code, nav_date)
);

create index if not exists idx_mf_nav_history_date on public.mf_nav_history (nav_date);

alter table public.mf_nav_history enable row level security;

drop policy if exists "mf_nav_history is world-readable" on public.mf_nav_history;
create policy "mf_nav_history is world-readable"
  on public.mf_nav_history for select
  using (true);

-- ============================================================
-- 3. mf_returns — pre-computed returns + category rank
-- ============================================================
create table if not exists public.mf_returns (
  scheme_code text primary key references public.mf_schemes(scheme_code) on delete cascade,
  return_1m numeric,
  return_3m numeric,
  return_6m numeric,
  return_1y numeric,
  return_3y numeric,                                -- annualised CAGR
  return_5y numeric,                                -- annualised CAGR
  return_10y numeric,                               -- annualised CAGR
  return_si numeric,                                -- since inception, annualised
  benchmark_1y numeric,                             -- benchmark return over same window
  benchmark_3y numeric,
  benchmark_5y numeric,
  benchmark_10y numeric,
  alpha_5y numeric,                                 -- scheme - benchmark over 5Y
  category_rank_1y int,
  category_rank_3y int,
  category_rank_5y int,
  category_size_1y int,                             -- denominator for "rank N of M"
  category_size_3y int,
  category_size_5y int,
  beats_benchmark_5y boolean,
  beats_benchmark_10y boolean,
  beats_benchmark_15y boolean,
  computed_at timestamptz default now()
);

create index if not exists idx_mf_returns_1y on public.mf_returns (return_1y desc);
create index if not exists idx_mf_returns_3y on public.mf_returns (return_3y desc);
create index if not exists idx_mf_returns_5y on public.mf_returns (return_5y desc);

alter table public.mf_returns enable row level security;

drop policy if exists "mf_returns is world-readable" on public.mf_returns;
create policy "mf_returns is world-readable"
  on public.mf_returns for select
  using (true);

-- ============================================================
-- 4. mf_alerts — fund manager / category / name / objective / asset-mix changes
-- ============================================================
create table if not exists public.mf_alerts (
  id uuid primary key default gen_random_uuid(),
  scheme_code text not null references public.mf_schemes(scheme_code) on delete cascade,
  alert_type text not null,                         -- 'manager_change' | 'category_change' | 'name_change' | 'objective_change' | 'asset_mix_shift' | 'amc_change'
  prev_value text,
  new_value text,
  detected_at timestamptz default now(),
  message text                                       -- human-readable summary
);

create index if not exists idx_mf_alerts_scheme on public.mf_alerts (scheme_code);
create index if not exists idx_mf_alerts_detected on public.mf_alerts (detected_at desc);

alter table public.mf_alerts enable row level security;

drop policy if exists "mf_alerts are world-readable" on public.mf_alerts;
create policy "mf_alerts are world-readable"
  on public.mf_alerts for select
  using (true);

-- ============================================================
-- 5. mf_watchlist — per-user follow list
-- ============================================================
create table if not exists public.mf_watchlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  scheme_code text not null references public.mf_schemes(scheme_code) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, scheme_code)
);

create index if not exists idx_mf_watchlist_user on public.mf_watchlist (user_id);

alter table public.mf_watchlist enable row level security;

drop policy if exists "users read own watchlist" on public.mf_watchlist;
create policy "users read own watchlist"
  on public.mf_watchlist for select
  using (auth.uid() = user_id);

drop policy if exists "users write own watchlist" on public.mf_watchlist;
create policy "users write own watchlist"
  on public.mf_watchlist for insert
  with check (auth.uid() = user_id);

drop policy if exists "users delete own watchlist" on public.mf_watchlist;
create policy "users delete own watchlist"
  on public.mf_watchlist for delete
  using (auth.uid() = user_id);
