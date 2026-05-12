-- Market data layer: the lean schema for daily-refresh pipelines + RAG.
--
-- Adds 7 new tables and extends the existing `companies` table with two
-- JSONB columns (fundamentals, profile) so we can append metrics over time
-- without an ALTER TABLE per field.
--
-- Run order: this migration is idempotent (every CREATE/ALTER uses IF NOT
-- EXISTS). Apply via Supabase SQL editor before the first daily-refresh
-- cron run.
--
-- Why these tables, not the 45-table mega-schema in scripts/market_schema.sql:
-- the goal was "lean, JSONB-heavy, daily-batch-friendly". Fewer tables =
-- fewer joins, fewer migrations when we want to track a new metric.

-- ============================================
-- 0. Extensions
-- ============================================
-- pgvector for future RAG over `documents.embedding` and `conversations.embedding`.
-- The columns are nullable today; embedding generation is a follow-up.
create extension if not exists vector;

-- ============================================
-- 1. companies (extend the existing table)
-- ============================================
-- The existing `companies` table from migration 003 has isin/symbol/name/
-- sector/industry/mcap_category/corp_group/updated_at. We append two JSONB
-- columns so daily refreshes can stash whatever they pulled without
-- schema churn.
alter table public.companies
  add column if not exists fundamentals jsonb,
  add column if not exists profile jsonb,
  add column if not exists last_refreshed_at timestamptz;

create index if not exists idx_companies_last_refreshed
  on public.companies (last_refreshed_at);

-- ============================================
-- 2. prices — daily OHLCV time-series
-- ============================================
-- 500 stocks * 250 trading days * 1 year ≈ 125k rows. Trivial for Postgres.
-- Composite PK on (isin, date) for idempotent upserts.
create table if not exists public.prices (
  isin          text not null references public.companies(isin) on delete cascade,
  date          date not null,
  open          numeric,
  high          numeric,
  low           numeric,
  close         numeric,
  prev_close    numeric,
  volume        bigint,
  delivery_pct  numeric,
  source        text default 'yahoo',
  fetched_at    timestamptz default now(),
  primary key (isin, date)
);
create index if not exists idx_prices_isin_date_desc
  on public.prices (isin, date desc);

-- World-readable so dashboard server components can join without a service
-- role; writes happen from the cron with service-role credentials.
alter table public.prices enable row level security;
drop policy if exists "prices are world-readable" on public.prices;
create policy "prices are world-readable"
  on public.prices for select using (true);

-- ============================================
-- 3. fundamentals_history — quarterly snapshots
-- ============================================
-- One row per ticker per quarter-end. Keeps the long view that
-- companies.fundamentals (current-only) can't.
create table if not exists public.fundamentals_history (
  isin       text not null references public.companies(isin) on delete cascade,
  period     date not null,         -- quarter-end date, e.g. 2025-03-31
  data       jsonb not null,        -- same shape as companies.fundamentals
  source     text default 'yahoo',
  fetched_at timestamptz default now(),
  primary key (isin, period)
);
create index if not exists idx_fundamentals_history_period
  on public.fundamentals_history (period desc);

alter table public.fundamentals_history enable row level security;
drop policy if exists "fundamentals are world-readable" on public.fundamentals_history;
create policy "fundamentals are world-readable"
  on public.fundamentals_history for select using (true);

-- ============================================
-- 4. documents — news, reports, transcripts (RAG-ready)
-- ============================================
-- isin nullable so market-wide news (FII flows commentary, RBI policy)
-- can sit alongside per-company news.
-- `embedding` stays null today; populated by a follow-up job once we wire
-- the RAG retrieval path in /api/ask.
create table if not exists public.documents (
  id            bigserial primary key,
  isin          text references public.companies(isin) on delete cascade,
  doc_type      text not null,        -- 'news' | 'announcement' | 'report' | 'transcript' | 'broker_note'
  source        text not null,        -- 'finnhub' | 'moneycontrol' | 'bse' | 'nse' | 'manual'
  source_id     text,                 -- provider-specific id for dedup
  title         text,
  content       text,                 -- chunked text (~500-1000 tokens per row)
  summary       text,                 -- AI-generated 2-3 line summary, populated lazily
  metadata      jsonb,                -- {sentiment, category, tags, author, ...}
  embedding     vector(1536),         -- nullable until the embedder runs
  source_url    text,
  published_at  timestamptz,
  fetched_at    timestamptz default now(),
  unique (source, source_id)
);
create index if not exists idx_documents_isin_published
  on public.documents (isin, published_at desc);
create index if not exists idx_documents_type
  on public.documents (doc_type);
-- ivfflat index for cosine similarity. Built lazily — needs at least
-- a few hundred rows before it pays off. Safe to create on an empty table.
create index if not exists idx_documents_embedding
  on public.documents using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.documents enable row level security;
drop policy if exists "documents are world-readable" on public.documents;
create policy "documents are world-readable"
  on public.documents for select using (true);

-- ============================================
-- 5. corporate_events — dividends, splits, AGMs, earnings dates
-- ============================================
-- Structured event-type column for fast filtering ("show me upcoming
-- dividends"), JSONB details for type-specific payload so a new event
-- shape doesn't need a migration.
create table if not exists public.corporate_events (
  id             bigserial primary key,
  isin           text not null references public.companies(isin) on delete cascade,
  event_type     text not null,       -- 'dividend' | 'split' | 'bonus' | 'rights' | 'earnings' | 'agm' | 'buyback'
  event_date     date,                -- ex-date / effective date / earnings announcement date
  announced_at   date,                -- when the event was filed/announced
  details        jsonb,               -- {amount, ratio, quarter, ...}
  source         text default 'yahoo',
  source_url     text,
  created_at     timestamptz default now(),
  -- Dedup: same ticker + type + date is the same event regardless of source.
  unique (isin, event_type, event_date)
);
create index if not exists idx_corp_events_isin_date
  on public.corporate_events (isin, event_date desc);
-- Calendar index for "what's coming up across all stocks?" — plain btree
-- because partial indexes can't reference current_date (STABLE not IMMUTABLE).
-- Queries like `WHERE event_date >= CURRENT_DATE ORDER BY event_date` still
-- use this index for the range scan.
create index if not exists idx_corp_events_date
  on public.corporate_events (event_date desc nulls last);

alter table public.corporate_events enable row level security;
drop policy if exists "corp_events are world-readable" on public.corporate_events;
create policy "corp_events are world-readable"
  on public.corporate_events for select using (true);

-- ============================================
-- 6. market_data — daily macro snapshot
-- ============================================
-- One row per trading day. FII/DII flows + index closes + sector heatmap.
create table if not exists public.market_data (
  date                   date primary key,
  fii_equity_net_cr      numeric,
  dii_equity_net_cr      numeric,
  fii_debt_net_cr        numeric,
  indices                jsonb,      -- {"NIFTY50": 24318, "BANKNIFTY": 51200, "SENSEX": 79842, ...}
  sector_performance     jsonb,      -- {"capital_goods": 1.2, "it": -0.4, ...}
  bulk_deals             jsonb,      -- array of {symbol, qty, price, buyer/seller}
  block_deals            jsonb,
  fetched_at             timestamptz default now()
);

alter table public.market_data enable row level security;
drop policy if exists "market_data is world-readable" on public.market_data;
create policy "market_data is world-readable"
  on public.market_data for select using (true);

-- ============================================
-- 7. conversations — chat memory for semantic recall
-- ============================================
-- Separate from `chat_messages` (which is the linear history). This is
-- what Ask Clarzo will semantic-search to give "last month you were worried
-- about Dixon's high P/E…" type answers. `embedding` populated by a
-- follow-up job.
create table if not exists public.conversations (
  id               bigserial primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  session_id       uuid,
  role             text not null,        -- 'user' | 'assistant'
  content          text not null,
  related_tickers  text[],               -- extracted via NER or regex
  embedding        vector(1536),
  created_at       timestamptz default now()
);
create index if not exists idx_conversations_user_created
  on public.conversations (user_id, created_at desc);
create index if not exists idx_conversations_user_tickers
  on public.conversations using gin (related_tickers);
create index if not exists idx_conversations_embedding
  on public.conversations using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.conversations enable row level security;
drop policy if exists "users own conversations" on public.conversations;
create policy "users own conversations"
  on public.conversations
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- 8. portfolio_insights — precomputed per-user analytics
-- ============================================
-- One row per user. Recomputed on holdings change OR by a daily job, so
-- the dashboard never recalculates concentration / sector breakdown / tax
-- position on every page load.
create table if not exists public.portfolio_insights (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  snapshot       jsonb,
  last_computed  timestamptz default now()
);

alter table public.portfolio_insights enable row level security;
drop policy if exists "users own insights" on public.portfolio_insights;
create policy "users own insights"
  on public.portfolio_insights
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
