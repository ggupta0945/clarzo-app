-- Tracks the user's previous dashboard visit so we can render a "what
-- changed since last time" banner — a high-impact retention surface.
--
-- last_dashboard_visit_at: timestamp of the prior visit. Updated on the
--   current visit only if at least 24h has elapsed (so opening the tab
--   three times in an afternoon doesn't lose the "yesterday" reference).
-- last_visit_snapshot: jsonb capturing net worth + per-holding prices at
--   the prior visit, used to compute diffs without needing a historical
--   price store.
--
-- Run this in the Supabase SQL editor before deploying the banner.

alter table public.profiles
  add column if not exists last_dashboard_visit_at timestamptz,
  add column if not exists last_visit_snapshot jsonb;
