-- ============================================================
-- CLARZO MARKET DATA SCHEMA — All 18 Databases
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- DB 01 — PRICE FEED DATA
-- ============================================================

CREATE TABLE IF NOT EXISTS price_eod (
  price_eod_id  BIGSERIAL PRIMARY KEY,
  symbol        VARCHAR(20)   NOT NULL,
  isin          CHAR(12),
  trade_date    DATE          NOT NULL,
  open          DECIMAL(12,2),
  high          DECIMAL(12,2),
  low           DECIMAL(12,2),
  close         DECIMAL(12,2),
  prev_close    DECIMAL(12,2),
  adj_close     DECIMAL(12,2),
  volume        BIGINT,
  value_cr      DECIMAL(16,2),
  delivery_qty  BIGINT,
  delivery_pct  DECIMAL(5,2),
  vwap          DECIMAL(12,2),
  upper_circuit DECIMAL(12,2),
  lower_circuit DECIMAL(12,2),
  week52_high   DECIMAL(12,2),
  week52_low    DECIMAL(12,2),
  market_cap_cr DECIMAL(18,2),
  exchange      CHAR(3)       DEFAULT 'NSE',
  series        VARCHAR(5)    DEFAULT 'EQ',
  UNIQUE (symbol, trade_date, exchange)
);
CREATE INDEX IF NOT EXISTS idx_price_eod_symbol_date ON price_eod (symbol, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_price_eod_isin        ON price_eod (isin) WHERE isin IS NOT NULL;

CREATE TABLE IF NOT EXISTS price_intraday (
  id          BIGSERIAL PRIMARY KEY,
  symbol      VARCHAR(20)  NOT NULL,
  candle_time TIMESTAMPTZ  NOT NULL,
  open        DECIMAL(12,2),
  high        DECIMAL(12,2),
  low         DECIMAL(12,2),
  close       DECIMAL(12,2),
  volume      BIGINT,
  timeframe   VARCHAR(5)   DEFAULT '1m',
  UNIQUE (symbol, candle_time, timeframe)
);
CREATE INDEX IF NOT EXISTS idx_intraday_symbol_time ON price_intraday (symbol, candle_time DESC);

CREATE TABLE IF NOT EXISTS corporate_actions (
  id                BIGSERIAL PRIMARY KEY,
  symbol            VARCHAR(20)  NOT NULL,
  action_type       VARCHAR(20)  NOT NULL,
  ex_date           DATE,
  record_date       DATE,
  amount            DECIMAL(10,2),
  ratio             VARCHAR(20),
  split_factor      DECIMAL(8,4),
  announcement_date DATE,
  created_at        TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_corp_actions_symbol ON corporate_actions (symbol, ex_date DESC);

-- ============================================================
-- DB 02 — STOCK DOCUMENT DATA (RAG)
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_documents (
  doc_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol           VARCHAR(20)  NOT NULL,
  isin             CHAR(12),
  doc_type         VARCHAR(30)  NOT NULL,
  fiscal_year      VARCHAR(6),
  quarter          VARCHAR(6),
  title            TEXT,
  source_url       TEXT,
  filing_date      DATE,
  storage_path     TEXT,
  page_count       INT,
  word_count       INT,
  processing_status VARCHAR(20) DEFAULT 'PENDING',
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_docs_symbol ON stock_documents (symbol, filing_date DESC);

CREATE TABLE IF NOT EXISTS document_chunks (
  chunk_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doc_id        UUID         REFERENCES stock_documents(doc_id) ON DELETE CASCADE,
  chunk_index   INT          NOT NULL,
  chunk_type    VARCHAR(20),
  speaker       VARCHAR(100),
  speaker_role  VARCHAR(50),
  page_number   INT,
  text_content  TEXT         NOT NULL,
  token_count   INT,
  embedding     VECTOR(1536),
  topics        TEXT[],
  sentiment     VARCHAR(10),
  key_metrics   JSONB,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chunks_doc_id   ON document_chunks (doc_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE IF NOT EXISTS concall_metadata (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol            VARCHAR(20)  NOT NULL,
  quarter           VARCHAR(6)   NOT NULL,
  call_date         DATE,
  management_tone   VARCHAR(10),
  tone_reason       TEXT,
  guidance_revenue  TEXT,
  guidance_margin   TEXT,
  guidance_capex    TEXT,
  key_highlights    TEXT[],
  red_flags         TEXT[],
  analyst_questions JSONB,
  participants      JSONB,
  UNIQUE (symbol, quarter)
);
CREATE INDEX IF NOT EXISTS idx_concall_symbol ON concall_metadata (symbol, quarter DESC);

-- ============================================================
-- DB 03 — TECHNICAL DATA
-- ============================================================

CREATE TABLE IF NOT EXISTS technical_indicators (
  id              BIGSERIAL PRIMARY KEY,
  symbol          VARCHAR(20)   NOT NULL,
  trade_date      DATE          NOT NULL,
  sma_20          DECIMAL(12,2),
  sma_50          DECIMAL(12,2),
  sma_200         DECIMAL(12,2),
  ema_12          DECIMAL(12,2),
  ema_26          DECIMAL(12,2),
  macd            DECIMAL(10,4),
  macd_signal     DECIMAL(10,4),
  macd_histogram  DECIMAL(10,4),
  rsi_14          DECIMAL(6,2),
  rsi_signal      VARCHAR(15),
  bb_upper        DECIMAL(12,2),
  bb_middle       DECIMAL(12,2),
  bb_lower        DECIMAL(12,2),
  bb_width        DECIMAL(8,4),
  stoch_k         DECIMAL(6,2),
  stoch_d         DECIMAL(6,2),
  atr_14          DECIMAL(10,4),
  adx_14          DECIMAL(6,2),
  cci_20          DECIMAL(10,4),
  obv             BIGINT,
  supertrend      DECIMAL(12,2),
  supertrend_signal VARCHAR(5),
  vwap            DECIMAL(12,2),
  pivot           DECIMAL(12,2),
  r1              DECIMAL(12,2),
  r2              DECIMAL(12,2),
  s1              DECIMAL(12,2),
  s2              DECIMAL(12,2),
  UNIQUE (symbol, trade_date)
);
CREATE INDEX IF NOT EXISTS idx_tech_symbol_date ON technical_indicators (symbol, trade_date DESC);

CREATE TABLE IF NOT EXISTS chart_patterns (
  id              BIGSERIAL PRIMARY KEY,
  symbol          VARCHAR(20)   NOT NULL,
  detected_date   DATE          NOT NULL,
  pattern_name    VARCHAR(50),
  pattern_type    VARCHAR(15),
  signal          VARCHAR(10),
  timeframe       VARCHAR(5)    DEFAULT '1d',
  confidence      DECIMAL(5,2),
  breakout_level  DECIMAL(12,2),
  target_price    DECIMAL(12,2),
  stop_loss       DECIMAL(12,2),
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patterns_symbol ON chart_patterns (symbol, detected_date DESC);

CREATE TABLE IF NOT EXISTS technical_summary (
  id                BIGSERIAL PRIMARY KEY,
  symbol            VARCHAR(20)   NOT NULL,
  trade_date        DATE          NOT NULL,
  ma_signal         VARCHAR(15),
  oscillator_signal VARCHAR(15),
  overall_signal    VARCHAR(15),
  buy_count         INT,
  sell_count        INT,
  neutral_count     INT,
  score             DECIMAL(5,2),
  UNIQUE (symbol, trade_date)
);

-- ============================================================
-- DB 04 — COMPANY FUNDAMENTALS
-- ============================================================

CREATE TABLE IF NOT EXISTS company_profile (
  id               BIGSERIAL PRIMARY KEY,
  symbol           VARCHAR(20)   NOT NULL UNIQUE,
  company_name     VARCHAR(200),
  sector           VARCHAR(100),
  industry         VARCHAR(100),
  mcap_category    VARCHAR(10),
  nse_symbol       VARCHAR(20),
  bse_code         CHAR(6),
  isin             CHAR(12),
  founded_year     INT,
  headquarters     VARCHAR(200),
  ceo_name         VARCHAR(100),
  employees        INT,
  business_summary TEXT,
  thematic_tags    TEXT[],
  index_membership TEXT[],
  listing_date     DATE,
  updated_at       TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_company_profile_isin ON company_profile (isin) WHERE isin IS NOT NULL;

CREATE TABLE IF NOT EXISTS company_fundamentals (
  id                  BIGSERIAL PRIMARY KEY,
  symbol              VARCHAR(20)   NOT NULL,
  as_of_date          DATE          NOT NULL,
  pe_ratio            DECIMAL(10,2),
  pb_ratio            DECIMAL(8,2),
  ps_ratio            DECIMAL(8,2),
  ev_ebitda           DECIMAL(8,2),
  ev_sales            DECIMAL(8,2),
  peg_ratio           DECIMAL(8,2),
  market_cap_cr       DECIMAL(18,2),
  enterprise_value_cr DECIMAL(18,2),
  roe                 DECIMAL(8,2),
  roce                DECIMAL(8,2),
  roa                 DECIMAL(8,2),
  roic                DECIMAL(8,2),
  gross_margin        DECIMAL(8,2),
  ebitda_margin       DECIMAL(8,2),
  pat_margin          DECIMAL(8,2),
  revenue_growth_1y   DECIMAL(8,2),
  revenue_growth_3y   DECIMAL(8,2),
  eps_growth_1y       DECIMAL(8,2),
  eps_growth_3y       DECIMAL(8,2),
  debt_to_equity      DECIMAL(8,4),
  interest_coverage   DECIMAL(8,2),
  current_ratio       DECIMAL(8,4),
  quick_ratio         DECIMAL(8,4),
  debtor_days         DECIMAL(8,2),
  inventory_days      DECIMAL(8,2),
  asset_turnover      DECIMAL(8,4),
  fcf_yield           DECIMAL(8,2),
  dividend_yield      DECIMAL(8,4),
  payout_ratio        DECIMAL(8,2),
  altman_z_score      DECIMAL(8,4),
  piotroski_score     INT,
  UNIQUE (symbol, as_of_date)
);
CREATE INDEX IF NOT EXISTS idx_fundamentals_symbol ON company_fundamentals (symbol, as_of_date DESC);

-- ============================================================
-- DB 05 — SHAREHOLDING PATTERNS
-- ============================================================

CREATE TABLE IF NOT EXISTS shareholding_quarterly (
  id                    BIGSERIAL PRIMARY KEY,
  symbol                VARCHAR(20)   NOT NULL,
  quarter_end           DATE          NOT NULL,
  total_shares          BIGINT,
  promoter_pct          DECIMAL(8,4),
  promoter_pledged_pct  DECIMAL(8,4),
  promoter_pledged_shares BIGINT,
  fii_pct               DECIMAL(8,4),
  dii_pct               DECIMAL(8,4),
  mf_pct                DECIMAL(8,4),
  insurance_pct         DECIMAL(8,4),
  retail_pct            DECIMAL(8,4),
  num_shareholders      INT,
  promoter_change_qoq   DECIMAL(6,4),
  fii_change_qoq        DECIMAL(6,4),
  dii_change_qoq        DECIMAL(6,4),
  UNIQUE (symbol, quarter_end)
);
CREATE INDEX IF NOT EXISTS idx_sh_quarterly_symbol ON shareholding_quarterly (symbol, quarter_end DESC);

CREATE TABLE IF NOT EXISTS top_shareholders (
  id               BIGSERIAL PRIMARY KEY,
  symbol           VARCHAR(20)   NOT NULL,
  quarter_end      DATE          NOT NULL,
  holder_name      VARCHAR(200),
  holder_type      VARCHAR(20),
  shares_held      BIGINT,
  holding_pct      DECIMAL(8,4),
  change_from_prev DECIMAL(6,4),
  rank             INT
);
CREATE INDEX IF NOT EXISTS idx_top_sh_symbol ON top_shareholders (symbol, quarter_end DESC);

CREATE TABLE IF NOT EXISTS insider_trades (
  id               BIGSERIAL PRIMARY KEY,
  symbol           VARCHAR(20)   NOT NULL,
  transaction_date DATE          NOT NULL,
  acquirer_name    VARCHAR(200),
  acquirer_type    VARCHAR(30),
  transaction_type VARCHAR(10),
  shares           BIGINT,
  avg_price        DECIMAL(12,2),
  value_cr         DECIMAL(14,2),
  pre_holding_pct  DECIMAL(8,4),
  post_holding_pct DECIMAL(8,4),
  filing_date      DATE
);
CREATE INDEX IF NOT EXISTS idx_insider_symbol ON insider_trades (symbol, transaction_date DESC);

CREATE TABLE IF NOT EXISTS bulk_block_deals (
  id               BIGSERIAL PRIMARY KEY,
  symbol           VARCHAR(20)   NOT NULL,
  deal_date        DATE          NOT NULL,
  deal_type        VARCHAR(10),
  client_name      VARCHAR(200),
  transaction_type VARCHAR(5),
  quantity         BIGINT,
  price            DECIMAL(12,2),
  value_cr         DECIMAL(14,2),
  exchange         CHAR(3)       DEFAULT 'NSE'
);
CREATE INDEX IF NOT EXISTS idx_bulk_deals_symbol ON bulk_block_deals (symbol, deal_date DESC);

-- ============================================================
-- DB 06 — CONSOLIDATED P&L
-- ============================================================

CREATE TABLE IF NOT EXISTS annual_pnl (
  id                  BIGSERIAL PRIMARY KEY,
  symbol              VARCHAR(20)   NOT NULL,
  fiscal_year         VARCHAR(6)    NOT NULL,
  period_end          DATE,
  statement_type      VARCHAR(15)   DEFAULT 'CONSOLIDATED',
  revenue             DECIMAL(18,2),
  other_income        DECIMAL(14,2),
  total_income        DECIMAL(18,2),
  raw_material_cost   DECIMAL(16,2),
  employee_cost       DECIMAL(14,2),
  other_expenses      DECIMAL(14,2),
  ebitda              DECIMAL(16,2),
  ebitda_margin       DECIMAL(6,2),
  depreciation        DECIMAL(12,2),
  ebit                DECIMAL(16,2),
  finance_cost        DECIMAL(12,2),
  pbt                 DECIMAL(16,2),
  tax_expense         DECIMAL(14,2),
  effective_tax_rate  DECIMAL(6,2),
  pat                 DECIMAL(16,2),
  minority_interest   DECIMAL(12,2),
  pat_margin          DECIMAL(6,2),
  eps_basic           DECIMAL(10,2),
  eps_diluted         DECIMAL(10,2),
  revenue_growth_yoy  DECIMAL(8,2),
  pat_growth_yoy      DECIMAL(8,2),
  eps_growth_yoy      DECIMAL(8,2),
  UNIQUE (symbol, fiscal_year, statement_type)
);
CREATE INDEX IF NOT EXISTS idx_annual_pnl_symbol ON annual_pnl (symbol, fiscal_year DESC);

CREATE TABLE IF NOT EXISTS segment_pnl (
  id                    BIGSERIAL PRIMARY KEY,
  symbol                VARCHAR(20)   NOT NULL,
  fiscal_year           VARCHAR(6)    NOT NULL,
  segment_name          VARCHAR(100),
  segment_revenue       DECIMAL(16,2),
  segment_ebit          DECIMAL(14,2),
  segment_margin        DECIMAL(6,2),
  revenue_contribution  DECIMAL(6,2),
  revenue_growth_yoy    DECIMAL(8,2)
);
CREATE INDEX IF NOT EXISTS idx_segment_pnl_symbol ON segment_pnl (symbol, fiscal_year DESC);

-- ============================================================
-- DB 07 — QUARTERLY RESULTS
-- ============================================================

CREATE TABLE IF NOT EXISTS quarterly_results (
  id                  BIGSERIAL PRIMARY KEY,
  symbol              VARCHAR(20)   NOT NULL,
  quarter             VARCHAR(6)    NOT NULL,
  period_end          DATE,
  result_date         DATE,
  statement_type      VARCHAR(15)   DEFAULT 'CONSOLIDATED',
  revenue             DECIMAL(16,2),
  other_income        DECIMAL(12,2),
  total_income        DECIMAL(16,2),
  operating_expenses  DECIMAL(14,2),
  ebitda              DECIMAL(14,2),
  ebitda_margin       DECIMAL(6,2),
  depreciation        DECIMAL(12,2),
  finance_cost        DECIMAL(12,2),
  provisions          DECIMAL(12,2),
  pbt                 DECIMAL(14,2),
  tax                 DECIMAL(12,2),
  pat                 DECIMAL(14,2),
  pat_margin          DECIMAL(6,2),
  eps                 DECIMAL(10,2),
  revenue_qoq         DECIMAL(8,2),
  revenue_yoy         DECIMAL(8,2),
  pat_qoq             DECIMAL(8,2),
  pat_yoy             DECIMAL(8,2),
  consensus_revenue   DECIMAL(16,2),
  consensus_pat       DECIMAL(14,2),
  revenue_beat_pct    DECIMAL(8,2),
  pat_beat_pct        DECIMAL(8,2),
  beat_miss_label     VARCHAR(15),
  UNIQUE (symbol, quarter, statement_type)
);
CREATE INDEX IF NOT EXISTS idx_qr_symbol ON quarterly_results (symbol, quarter DESC);

CREATE TABLE IF NOT EXISTS quarterly_key_metrics (
  id             BIGSERIAL PRIMARY KEY,
  symbol         VARCHAR(20)   NOT NULL,
  quarter        VARCHAR(6)    NOT NULL,
  metric_name    VARCHAR(60)   NOT NULL,
  metric_value   DECIMAL(14,4),
  metric_unit    VARCHAR(20),
  sector_context VARCHAR(30),
  UNIQUE (symbol, quarter, metric_name)
);
CREATE INDEX IF NOT EXISTS idx_qkm_symbol ON quarterly_key_metrics (symbol, quarter DESC);

-- ============================================================
-- DB 08 — ANALYST PRICE TARGETS
-- ============================================================

CREATE TABLE IF NOT EXISTS analyst_targets (
  target_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol             VARCHAR(20)   NOT NULL,
  brokerage          VARCHAR(100),
  analyst_name       VARCHAR(100),
  report_date        DATE          NOT NULL,
  rating             VARCHAR(15),
  prev_rating        VARCHAR(15),
  rating_change      VARCHAR(15),
  target_price       DECIMAL(12,2),
  prev_target_price  DECIMAL(12,2),
  target_change_pct  DECIMAL(8,2),
  upside_pct         DECIMAL(8,2),
  cmp_at_report      DECIMAL(12,2),
  thesis             TEXT,
  revenue_est_fy25   DECIMAL(16,2),
  pat_est_fy25       DECIMAL(14,2),
  eps_est_fy25       DECIMAL(10,2),
  revenue_est_fy26   DECIMAL(16,2),
  pat_est_fy26       DECIMAL(14,2),
  eps_est_fy26       DECIMAL(10,2),
  valuation_method   VARCHAR(30),
  risk_factors       TEXT,
  created_at         TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analyst_symbol ON analyst_targets (symbol, report_date DESC);

CREATE TABLE IF NOT EXISTS consensus_targets (
  id                  BIGSERIAL PRIMARY KEY,
  symbol              VARCHAR(20)   NOT NULL,
  as_of_date          DATE          NOT NULL,
  consensus_target    DECIMAL(12,2),
  mean_target         DECIMAL(12,2),
  high_target         DECIMAL(12,2),
  low_target          DECIMAL(12,2),
  std_dev             DECIMAL(10,2),
  cmp                 DECIMAL(12,2),
  upside_to_consensus DECIMAL(8,2),
  buy_count           INT,
  hold_count          INT,
  sell_count          INT,
  total_analysts      INT,
  consensus_rating    VARCHAR(15),
  buy_pct             DECIMAL(6,2),
  last_upgrade_date   DATE,
  last_downgrade_date DATE,
  consensus_eps_fy25  DECIMAL(10,2),
  consensus_eps_fy26  DECIMAL(10,2),
  consensus_rev_fy26  DECIMAL(16,2),
  UNIQUE (symbol, as_of_date)
);
CREATE INDEX IF NOT EXISTS idx_consensus_symbol ON consensus_targets (symbol, as_of_date DESC);

-- ============================================================
-- DB 09 — NEWS & SENTIMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS news_articles (
  article_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol            VARCHAR(20),
  symbols_mentioned TEXT[],
  headline          TEXT          NOT NULL,
  summary           TEXT,
  source_name       VARCHAR(100),
  source_tier       VARCHAR(10)   DEFAULT 'TIER2',
  article_url       TEXT,
  published_at      TIMESTAMPTZ   NOT NULL,
  sentiment_score   DECIMAL(5,4),
  sentiment_label   VARCHAR(10),
  topics            TEXT[],
  event_type        VARCHAR(30),
  relevance_score   DECIMAL(5,4),
  embedding         VECTOR(1536),
  created_at        TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_news_symbol     ON news_articles (symbol, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_published  ON news_articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_embedding  ON news_articles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE IF NOT EXISTS news_sentiment_daily (
  id               BIGSERIAL PRIMARY KEY,
  symbol           VARCHAR(20)   NOT NULL,
  sentiment_date   DATE          NOT NULL,
  article_count    INT,
  avg_sentiment    DECIMAL(5,4),
  positive_count   INT,
  negative_count   INT,
  neutral_count    INT,
  sentiment_7d_avg DECIMAL(5,4),
  sentiment_30d_avg DECIMAL(5,4),
  buzz_rank        INT,
  sentiment_trend  VARCHAR(10),
  UNIQUE (symbol, sentiment_date)
);
CREATE INDEX IF NOT EXISTS idx_sentiment_daily ON news_sentiment_daily (symbol, sentiment_date DESC);

CREATE TABLE IF NOT EXISTS social_media_buzz (
  id             BIGSERIAL PRIMARY KEY,
  symbol         VARCHAR(20)   NOT NULL,
  buzz_date      DATE          NOT NULL,
  platform       VARCHAR(20),
  mention_count  INT,
  bullish_count  INT,
  bearish_count  INT,
  bullish_pct    DECIMAL(6,2),
  trending_rank  INT,
  top_hashtags   TEXT[],
  UNIQUE (symbol, buzz_date, platform)
);

-- ============================================================
-- DB 10 — CREDIT RATINGS & DEBT
-- ============================================================

CREATE TABLE IF NOT EXISTS credit_ratings (
  rating_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol           VARCHAR(20)   NOT NULL,
  credit_agency    VARCHAR(30),
  instrument_type  VARCHAR(30),
  instrument_name  VARCHAR(200),
  rating           VARCHAR(10),
  prev_rating      VARCHAR(10),
  rating_action    VARCHAR(20),
  outlook          VARCHAR(15),
  rating_date      DATE,
  prev_rating_date DATE,
  debt_amount_cr   DECIMAL(14,2),
  maturity_date    DATE,
  coupon_rate      DECIMAL(6,2),
  rationale        TEXT,
  is_active        BOOLEAN       DEFAULT TRUE,
  created_at       TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_credit_symbol ON credit_ratings (symbol, rating_date DESC);

CREATE TABLE IF NOT EXISTS debt_summary (
  id                  BIGSERIAL PRIMARY KEY,
  symbol              VARCHAR(20)   NOT NULL,
  as_of_date          DATE          NOT NULL,
  total_debt_cr       DECIMAL(16,2),
  long_term_debt_cr   DECIMAL(16,2),
  short_term_debt_cr  DECIMAL(16,2),
  cash_and_equiv_cr   DECIMAL(14,2),
  net_debt_cr         DECIMAL(16,2),
  net_debt_ebitda     DECIMAL(8,2),
  highest_rating      VARCHAR(10),
  lowest_rating       VARCHAR(10),
  active_watch_flags  INT,
  debt_maturity_fy25  DECIMAL(14,2),
  debt_maturity_fy26  DECIMAL(14,2),
  UNIQUE (symbol, as_of_date)
);

-- ============================================================
-- DB 11 — MACROECONOMIC INDICATORS
-- ============================================================

CREATE TABLE IF NOT EXISTS macro_indicators (
  indicator_id    BIGSERIAL PRIMARY KEY,
  indicator_code  VARCHAR(40)   NOT NULL,
  indicator_name  VARCHAR(200),
  value           DECIMAL(16,4),
  unit            VARCHAR(30),
  period_date     DATE          NOT NULL,
  frequency       VARCHAR(10),
  source          VARCHAR(50),
  prev_value      DECIMAL(16,4),
  change          DECIMAL(10,4),
  change_pct      DECIMAL(8,4),
  yoy_value       DECIMAL(16,4),
  yoy_change      DECIMAL(10,4),
  UNIQUE (indicator_code, period_date)
);
CREATE INDEX IF NOT EXISTS idx_macro_code_date ON macro_indicators (indicator_code, period_date DESC);

CREATE TABLE IF NOT EXISTS macro_events (
  id               BIGSERIAL PRIMARY KEY,
  event_date       DATE          NOT NULL,
  event_type       VARCHAR(40),
  decision         TEXT,
  commentary       TEXT,
  market_impact    TEXT,
  next_event_date  DATE,
  created_at       TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_macro_events_date ON macro_events (event_date DESC);

-- ============================================================
-- DB 12 — SECTOR & INDUSTRY BENCHMARKS
-- ============================================================

CREATE TABLE IF NOT EXISTS sector_benchmarks (
  id                      BIGSERIAL PRIMARY KEY,
  sector                  VARCHAR(100)  NOT NULL,
  as_of_quarter           VARCHAR(6)    NOT NULL,
  company_count           INT,
  median_pe               DECIMAL(8,2),
  median_pb               DECIMAL(8,2),
  median_ev_ebitda        DECIMAL(8,2),
  median_ebitda_margin    DECIMAL(8,2),
  median_pat_margin       DECIMAL(8,2),
  median_revenue_growth   DECIMAL(8,2),
  median_pat_growth       DECIMAL(8,2),
  median_roe              DECIMAL(8,2),
  median_roce             DECIMAL(8,2),
  median_debt_equity      DECIMAL(8,4),
  top_quartile_margin     DECIMAL(8,2),
  bottom_quartile_margin  DECIMAL(8,2),
  sector_rev_growth_avg   DECIMAL(8,2),
  sector_index_return_1y  DECIMAL(8,2),
  sector_index_return_3y  DECIMAL(8,2),
  UNIQUE (sector, as_of_quarter)
);

CREATE TABLE IF NOT EXISTS industry_benchmarks (
  id                   BIGSERIAL PRIMARY KEY,
  industry             VARCHAR(100)  NOT NULL,
  sector               VARCHAR(100),
  as_of_quarter        VARCHAR(6)    NOT NULL,
  company_count        INT,
  median_nim           DECIMAL(8,2),
  median_gnpa          DECIMAL(8,2),
  median_casa          DECIMAL(8,2),
  median_credit_growth DECIMAL(8,2),
  notes                TEXT,
  UNIQUE (industry, as_of_quarter)
);

-- ============================================================
-- DB 13 — BALANCE SHEET & CASH FLOW
-- ============================================================

CREATE TABLE IF NOT EXISTS annual_balance_sheet (
  id                   BIGSERIAL PRIMARY KEY,
  symbol               VARCHAR(20)   NOT NULL,
  fiscal_year          VARCHAR(6)    NOT NULL,
  period_end           DATE,
  statement_type       VARCHAR(15)   DEFAULT 'CONSOLIDATED',
  fixed_assets_net     DECIMAL(16,2),
  cwip                 DECIMAL(14,2),
  goodwill             DECIMAL(14,2),
  intangible_assets    DECIMAL(14,2),
  long_term_investments DECIMAL(14,2),
  deferred_tax_asset   DECIMAL(12,2),
  inventories          DECIMAL(14,2),
  trade_receivables    DECIMAL(14,2),
  cash_and_equiv       DECIMAL(14,2),
  short_term_investments DECIMAL(14,2),
  other_current_assets DECIMAL(12,2),
  total_assets         DECIMAL(18,2),
  equity_share_capital DECIMAL(12,2),
  other_equity         DECIMAL(16,2),
  total_equity         DECIMAL(16,2),
  long_term_debt       DECIMAL(14,2),
  short_term_debt      DECIMAL(14,2),
  total_debt           DECIMAL(14,2),
  trade_payables       DECIMAL(14,2),
  other_current_liab   DECIMAL(12,2),
  total_liabilities    DECIMAL(18,2),
  book_value_per_share DECIMAL(10,2),
  net_debt             DECIMAL(14,2),
  working_capital      DECIMAL(14,2),
  UNIQUE (symbol, fiscal_year, statement_type)
);
CREATE INDEX IF NOT EXISTS idx_bs_symbol ON annual_balance_sheet (symbol, fiscal_year DESC);

CREATE TABLE IF NOT EXISTS annual_cashflow (
  id                 BIGSERIAL PRIMARY KEY,
  symbol             VARCHAR(20)   NOT NULL,
  fiscal_year        VARCHAR(6)    NOT NULL,
  cfo                DECIMAL(16,2),
  pat_to_cfo_ratio   DECIMAL(8,4),
  capex              DECIMAL(14,2),
  fcf                DECIMAL(16,2),
  fcf_margin         DECIMAL(6,2),
  cfi                DECIMAL(16,2),
  acquisitions       DECIMAL(14,2),
  cff                DECIMAL(16,2),
  dividends_paid     DECIMAL(12,2),
  debt_raised        DECIMAL(14,2),
  debt_repaid        DECIMAL(14,2),
  net_change_in_cash DECIMAL(14,2),
  opening_cash       DECIMAL(14,2),
  closing_cash       DECIMAL(14,2),
  UNIQUE (symbol, fiscal_year)
);
CREATE INDEX IF NOT EXISTS idx_cashflow_symbol ON annual_cashflow (symbol, fiscal_year DESC);

CREATE TABLE IF NOT EXISTS working_capital_trends (
  id               BIGSERIAL PRIMARY KEY,
  symbol           VARCHAR(20)   NOT NULL,
  quarter          VARCHAR(6)    NOT NULL,
  debtor_days      DECIMAL(8,2),
  inventory_days   DECIMAL(8,2),
  creditor_days    DECIMAL(8,2),
  cash_conv_cycle  DECIMAL(8,2),
  debtor_days_yoy  DECIMAL(8,2),
  inv_days_yoy     DECIMAL(8,2),
  UNIQUE (symbol, quarter)
);

-- ============================================================
-- DB 14 — ESG & GOVERNANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS esg_scores (
  id                   BIGSERIAL PRIMARY KEY,
  symbol               VARCHAR(20)   NOT NULL,
  fiscal_year          VARCHAR(6)    NOT NULL,
  esg_score_overall    DECIMAL(6,2),
  environmental_score  DECIMAL(6,2),
  social_score         DECIMAL(6,2),
  governance_score     DECIMAL(6,2),
  esg_rating           VARCHAR(5),
  esg_rater            VARCHAR(50),
  esg_percentile       DECIMAL(6,2),
  brsr_compliance      VARCHAR(10),
  controversies_count  INT,
  controversies_detail TEXT[],
  UNIQUE (symbol, fiscal_year)
);

CREATE TABLE IF NOT EXISTS environmental_data (
  id                    BIGSERIAL PRIMARY KEY,
  symbol                VARCHAR(20)   NOT NULL,
  fiscal_year           VARCHAR(6)    NOT NULL,
  scope1_emissions      DECIMAL(14,2),
  scope2_emissions      DECIMAL(14,2),
  scope3_emissions      DECIMAL(14,2),
  emission_intensity    DECIMAL(10,4),
  renewable_energy_pct  DECIMAL(6,2),
  water_withdrawal_kl   DECIMAL(16,2),
  water_recycled_pct    DECIMAL(6,2),
  waste_generated_mt    DECIMAL(12,2),
  waste_recycled_pct    DECIMAL(6,2),
  net_zero_target_year  INT,
  carbon_offset_mt      DECIMAL(12,2),
  UNIQUE (symbol, fiscal_year)
);

CREATE TABLE IF NOT EXISTS governance_data (
  id                    BIGSERIAL PRIMARY KEY,
  symbol                VARCHAR(20)   NOT NULL,
  fiscal_year           VARCHAR(6)    NOT NULL,
  board_size            INT,
  independent_dir_pct   DECIMAL(6,2),
  women_board_pct       DECIMAL(6,2),
  board_avg_tenure_yrs  DECIMAL(6,2),
  ceo_pay_ratio         DECIMAL(8,2),
  promoter_family_dirs  INT,
  audit_committee_size  INT,
  related_party_txn_cr  DECIMAL(14,2),
  rpt_as_pct_revenue    DECIMAL(6,2),
  auditor_name          VARCHAR(100),
  auditor_qualifications BOOLEAN,
  sebi_actions          TEXT[],
  dividend_policy       TEXT,
  UNIQUE (symbol, fiscal_year)
);

-- ============================================================
-- DB 15 — MUTUAL FUND HOLDINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS mf_holdings (
  holding_id     BIGSERIAL PRIMARY KEY,
  symbol         VARCHAR(20)   NOT NULL,
  isin           CHAR(12),
  fund_house     VARCHAR(100),
  scheme_name    VARCHAR(200),
  scheme_type    VARCHAR(30),
  amfi_code      VARCHAR(20),
  portfolio_date DATE          NOT NULL,
  shares_held    BIGINT,
  value_cr       DECIMAL(14,2),
  portfolio_pct  DECIMAL(8,4),
  shares_prev    BIGINT,
  shares_change  BIGINT,
  action         VARCHAR(15),
  action_pct     DECIMAL(8,2),
  UNIQUE (symbol, scheme_name, portfolio_date)
);
CREATE INDEX IF NOT EXISTS idx_mf_holdings_symbol ON mf_holdings (symbol, portfolio_date DESC);

CREATE TABLE IF NOT EXISTS mf_stock_summary (
  id                      BIGSERIAL PRIMARY KEY,
  symbol                  VARCHAR(20)   NOT NULL,
  portfolio_date          DATE          NOT NULL,
  num_schemes_holding     INT,
  num_fund_houses         INT,
  total_value_cr          DECIMAL(16,2),
  total_shares            BIGINT,
  mf_holding_pct          DECIMAL(8,4),
  schemes_increased       INT,
  schemes_decreased       INT,
  schemes_initiated       INT,
  schemes_exited          INT,
  net_action              VARCHAR(15),
  total_value_change_cr   DECIMAL(14,2),
  top_holder_fund_house   VARCHAR(100),
  top_holder_value_cr     DECIMAL(14,2),
  UNIQUE (symbol, portfolio_date)
);
CREATE INDEX IF NOT EXISTS idx_mf_summary_symbol ON mf_stock_summary (symbol, portfolio_date DESC);

-- ============================================================
-- DB 16 — MANAGEMENT TRACK RECORD
-- ============================================================

CREATE TABLE IF NOT EXISTS guidance_tracker (
  tracking_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol             VARCHAR(20)   NOT NULL,
  guidance_quarter   VARCHAR(6),
  guidance_date      DATE,
  target_quarter     VARCHAR(6),
  metric             VARCHAR(60),
  guidance_text      TEXT,
  guidance_low       DECIMAL(16,2),
  guidance_high      DECIMAL(16,2),
  guidance_unit      VARCHAR(20),
  actual_value       DECIMAL(16,2),
  delivery_pct       DECIMAL(8,2),
  outcome            VARCHAR(15),
  resolution_quarter VARCHAR(6),
  notes              TEXT,
  created_at         TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_guidance_symbol ON guidance_tracker (symbol, guidance_date DESC);

CREATE TABLE IF NOT EXISTS management_profiles (
  person_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol             VARCHAR(20)   NOT NULL,
  name               VARCHAR(100),
  role               VARCHAR(50),
  appointment_date   DATE,
  resignation_date   DATE,
  tenure_years       DECIMAL(6,2),
  education          TEXT,
  prev_companies     TEXT[],
  age                INT,
  compensation_cr    DECIMAL(8,2),
  regulatory_actions TEXT[],
  is_active          BOOLEAN       DEFAULT TRUE,
  updated_at         TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mgmt_symbol ON management_profiles (symbol);

CREATE TABLE IF NOT EXISTS related_party_flags (
  id                BIGSERIAL PRIMARY KEY,
  symbol            VARCHAR(20)   NOT NULL,
  fiscal_year       VARCHAR(6)    NOT NULL,
  counterparty      VARCHAR(200),
  relationship      VARCHAR(100),
  transaction_type  VARCHAR(100),
  amount_cr         DECIMAL(14,2),
  as_pct_revenue    DECIMAL(6,2),
  board_approved    BOOLEAN       DEFAULT TRUE,
  is_flagged        BOOLEAN       DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_rpt_symbol ON related_party_flags (symbol, fiscal_year DESC);

-- ============================================================
-- DB 17 — ALERTS & EVENT CALENDAR
-- ============================================================

CREATE TABLE IF NOT EXISTS event_calendar (
  event_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol           VARCHAR(20),
  event_type       VARCHAR(40)   NOT NULL,
  event_date       DATE          NOT NULL,
  event_time       TIME,
  title            TEXT,
  description      TEXT,
  importance       VARCHAR(10)   DEFAULT 'MEDIUM',
  is_confirmed     BOOLEAN       DEFAULT FALSE,
  source_url       TEXT,
  is_market_event  BOOLEAN       DEFAULT FALSE,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_date   ON event_calendar (event_date);
CREATE INDEX IF NOT EXISTS idx_events_symbol ON event_calendar (symbol, event_date) WHERE symbol IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_event_alerts (
  alert_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol      VARCHAR(20)   NOT NULL,
  alert_type  VARCHAR(30),
  days_before INT           DEFAULT 3,
  notify_via  TEXT[]        DEFAULT ARRAY['EMAIL'],
  is_active   BOOLEAN       DEFAULT TRUE,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);
ALTER TABLE user_event_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_alerts" ON user_event_alerts
  USING (auth.uid() = user_id);

-- ============================================================
-- DB 18 — VALUATION MODELS & DCF
-- ============================================================

CREATE TABLE IF NOT EXISTS valuation_models (
  model_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol               VARCHAR(20)   NOT NULL,
  model_type           VARCHAR(20),
  run_date             DATE          NOT NULL,
  based_on_quarter     VARCHAR(6),
  cmp_at_run           DECIMAL(12,2),
  bear_case_value      DECIMAL(12,2),
  base_case_value      DECIMAL(12,2),
  bull_case_value      DECIMAL(12,2),
  margin_of_safety     DECIMAL(8,2),
  valuation_verdict    VARCHAR(20),
  wacc                 DECIMAL(6,2),
  terminal_growth      DECIMAL(6,2),
  projection_years     INT,
  revenue_cagr_est     DECIMAL(6,2),
  margin_assumption    DECIMAL(6,2),
  risk_free_rate       DECIMAL(6,2),
  equity_risk_premium  DECIMAL(6,2),
  beta                 DECIMAL(6,4),
  assumptions_summary  TEXT,
  sensitivity_table    JSONB,
  model_version        INT           DEFAULT 1,
  created_at           TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_valuation_symbol ON valuation_models (symbol, run_date DESC);

CREATE TABLE IF NOT EXISTS sotp_breakup (
  id                 BIGSERIAL PRIMARY KEY,
  model_id           UUID          REFERENCES valuation_models(model_id) ON DELETE CASCADE,
  symbol             VARCHAR(20)   NOT NULL,
  segment_name       VARCHAR(100),
  valuation_method   VARCHAR(20),
  multiple_used      DECIMAL(8,2),
  segment_ebitda     DECIMAL(14,2),
  enterprise_value   DECIMAL(16,2),
  equity_value       DECIMAL(16,2),
  value_per_share    DECIMAL(10,2),
  contribution_pct   DECIMAL(6,2)
);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('documents',  'documents',  false, 52428800,  -- 50MB limit
   ARRAY['application/pdf','text/plain','text/csv',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('exports',    'exports',    false, 10485760,   -- 10MB limit
   ARRAY['text/csv','application/json',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('avatars',    'avatars',    true,  2097152,    -- 2MB limit
   ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies — documents (private, user-scoped)
CREATE POLICY "documents_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
CREATE POLICY "documents_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "documents_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage RLS policies — exports (private, user-scoped)
CREATE POLICY "exports_all" ON storage.objects FOR ALL
  USING (bucket_id = 'exports' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'exports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage RLS policies — avatars (public read, owner write)
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars_auth_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "avatars_owner_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- HELPER: search documents by semantic similarity
-- ============================================================

CREATE OR REPLACE FUNCTION search_document_chunks(
  query_embedding VECTOR(1536),
  match_symbol    TEXT DEFAULT NULL,
  match_count     INT  DEFAULT 5
)
RETURNS TABLE (
  chunk_id     UUID,
  doc_id       UUID,
  text_content TEXT,
  similarity   FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.chunk_id,
    dc.doc_id,
    dc.text_content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  JOIN stock_documents sd ON dc.doc_id = sd.doc_id
  WHERE (match_symbol IS NULL OR sd.symbol = match_symbol)
    AND dc.embedding IS NOT NULL
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION search_news(
  query_embedding VECTOR(1536),
  match_symbol    TEXT DEFAULT NULL,
  match_count     INT  DEFAULT 10
)
RETURNS TABLE (
  article_id   UUID,
  headline     TEXT,
  summary      TEXT,
  published_at TIMESTAMPTZ,
  similarity   FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    na.article_id,
    na.headline,
    na.summary,
    na.published_at,
    1 - (na.embedding <=> query_embedding) AS similarity
  FROM news_articles na
  WHERE (match_symbol IS NULL OR na.symbol = match_symbol OR match_symbol = ANY(na.symbols_mentioned))
    AND na.embedding IS NOT NULL
  ORDER BY na.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
