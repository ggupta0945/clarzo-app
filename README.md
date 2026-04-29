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

Analytics intentionally avoids sending portfolio values, goal amounts, holdings names, or chat content.

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

## Days 4-7 Plan

- Day 4: Stranger-test the full onboarding flow, read friend feedback, fix the highest-friction moments.
- Day 5: Add one delight feature only if feedback clearly points to it.
- Day 6: Launch prep, copy polish, social cards, analytics dashboard.
- Day 7: Send to 15 friends, watch the funnel, reply fast.
