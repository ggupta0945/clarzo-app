# Clarzo App

AI money coach for Indian investors. Users sign in, upload portfolio holdings, see a plain-English portfolio snapshot, ask ClarzoGPT questions, set financial goals, and upgrade to Pro for unlimited usage.

## Status: Day 3 Complete

### Working in production

- Auth with Google OAuth via Supabase
- CSV/XLSX upload plus manual paste fallback
- Dashboard with net worth, insights, sector charts, market-cap charts, and top holdings
- ClarzoGPT with portfolio context
- Public `/ask` page with 3 free questions before signup
- Goals creation and ClarzoGPT goal prompts
- Free tier limits for portfolio chat
- Razorpay subscription checkout
- Razorpay webhook unlocks Pro
- PostHog analytics for the key funnel
- Weekly email digest cron via Vercel Cron + Resend
- Mutual Fund discover, detail, comparison, watchlist, news at `/funds`

### Analytics events

- `$pageview`
- `signup_clicked`
- `dashboard_viewed`
- `upload_succeeded`
- `upload_failed`
- `chat_message_sent`
- `chat_limit_hit`
- `public_chat_message_sent`
- `public_chat_limit_hit`
- `goal_created`
- `upgrade_clicked`
- `checkout_payment_confirmed`
- `subscription_activated`
- `weekly_digest_sample_clicked`
- `weekly_digest_sample_sent`
- `weekly_digest_sample_failed`

Analytics intentionally avoids sending portfolio values, goal amounts, holdings names, or chat content.

### Weekly Digest

Vercel Cron calls `/api/cron/weekly-digest` every Monday at 03:30 UTC, which is 9:00 AM IST. The route requires `CRON_SECRET` and sends one digest email to every user with holdings. Dashboard users can also trigger a sample email from the dashboard.

### Required env vars

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GOOGLE_GENERATIVE_AI_API_KEY=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
IP_SALT=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_PLAN_ID=
RAZORPAY_WEBHOOK_SECRET=

NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

RESEND_API_KEY=
RESEND_FROM_EMAIL=Clarzo <hello@clarzo.ai>
CRON_SECRET=
```

Optional server-side PostHog aliases:

```bash
POSTHOG_PROJECT_API_KEY=
POSTHOG_HOST=
```

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Mutual Fund segment (`/funds`)

The `/funds` segment is a discover-first MF research surface:

- `/funds` — top performers across all categories + curated rails (Large Cap, Mid Cap, Small Cap, Flexi Cap, ELSS, Aggressive Hybrid) + browse-by-category and browse-by-AMC tile grids.
- `/funds/[schemeCode]` — fund detail with NAV chart (1M / 3M / 6M / 1Y / 3Y / 5Y / All), returns vs benchmark, beat-the-benchmark scorecard, SIP & lumpsum projection, peer comparison, change history, and a Google News feed.
- `/funds/category/[category]` — leaderboard for any SEBI sub-category.
- `/funds/amc/[amc]` — every Direct/Growth scheme from a single AMC.
- `/funds/compare?codes=A,B,C` — side-by-side comparison of up to 4 funds.
- `/funds/search?q=...` — ILIKE search across scheme names.
- `/funds/watchlist` — signed-in users; tracks funds they want updates on.

### One-time data setup

After running migration `008_create_mutual_funds.sql` in Supabase, populate the new tables:

```bash
# 1. Seed scheme master from AMFI (≈ 12,000 schemes; ~30s)
npx dotenv -e .env.local -- npx tsx scripts/sync-mf-master.ts

# 2. Pull historical NAVs from mfapi.in (Direct/Growth only is enough to start)
#    This is the slow one — ~30 min for 4,000 schemes at concurrency=6.
npx dotenv -e .env.local -- npx tsx scripts/sync-mf-history.ts --only-direct --limit 4000

# 3. Compute 1Y / 3Y / 5Y / 10Y / SI returns + category ranks
npx dotenv -e .env.local -- npx tsx scripts/compute-mf-returns.ts
```

### Daily refresh

`vercel.json` schedules `/api/cron/sync-mf-nav` weekdays at 22:00 IST (after AMFI publishes). It refreshes `nav_latest` (used by portfolio enrichment) and appends today's NAV to `mf_nav_history`. Recompute returns on a weekly cadence by re-running `scripts/compute-mf-returns.ts`.

### Data sources

- **AMFI scheme master + daily NAV** — `https://www.amfiindia.com/spages/NAVAll.txt` (authoritative for Indian MFs)
- **Historical NAV** — `https://api.mfapi.in/mf/{scheme_code}` (free public mirror of AMFI)
- **News** — Google News RSS, fund-name keyword query
- **Category, plan, option, AMC** — inferred from scheme name via `lib/mutual-funds/categories.ts`

## Days 4-7 Plan

- Day 4: Stranger-test the full onboarding flow, read friend feedback, fix the highest-friction moments.
- Day 5: Polish weekly digest copy and add one delight feature only if feedback clearly points to it.
- Day 6: Launch prep, copy polish, social cards, analytics dashboard.
- Day 7: Send to 15 friends, watch the funnel, reply fast.
