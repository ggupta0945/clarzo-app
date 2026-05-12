import { generateText } from 'ai'
import { Resend } from 'resend'
import { aggregateByMcap, aggregateBySector, topHoldings } from '@/lib/allocation'
import { chatModel, chatProviderOptions } from '@/lib/ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { computePortfolioSummary, getUserHoldings, type EnrichedHolding } from '@/lib/portfolio'

type DigestUser = {
  id: string
  email: string
  name: string | null
}

type DigestData = {
  name: string
  netWorth: number
  invested: number
  pnl: number
  pnlPct: number
  holdingsCount: number
  insight: string
}

export async function getUsersWithHoldings(): Promise<string[]> {
  const admin = createAdminClient()
  const { data, error } = await admin.from('holdings').select('user_id').limit(10000)
  if (error) throw error

  return [...new Set((data ?? []).map((row) => row.user_id as string).filter(Boolean))]
}

// Resend errors that aren't really "failures" — they're delivery configuration
// gaps we can do nothing about per-user. Classify and skip instead of throwing
// so the cron's error log doesn't fill up with one line per non-account-owner
// user every week. The right fix is verifying the sender domain in Resend;
// until then we degrade gracefully.
const RESEND_CONFIG_PATTERNS: ReadonlyArray<RegExp> = [
  /only send testing emails/i,           // free tier: from = onboarding@resend.dev
  /domain is not verified/i,             // FROM domain not configured in Resend
  /verify a domain/i,                    // same family of error
  /testing\.\s*Please verify/i,          // wording variant
]

const RESEND_RECIPIENT_PATTERNS: ReadonlyArray<RegExp> = [
  /invalid.*email/i,
  /invalid.*recipient/i,
  /suppressed/i,                         // recipient on Resend's suppression list
  /bounced/i,
]

type ResendSkipReason = 'domain_unverified' | 'recipient_invalid' | null

function classifyResendError(message: string | undefined | null): ResendSkipReason {
  if (!message) return null
  if (RESEND_CONFIG_PATTERNS.some((p) => p.test(message))) return 'domain_unverified'
  if (RESEND_RECIPIENT_PATTERNS.some((p) => p.test(message))) return 'recipient_invalid'
  return null
}

export type DigestResult =
  | { skipped: true; reason: 'missing_email' | 'no_holdings' | 'domain_unverified' | 'recipient_invalid'; detail?: string }
  | { skipped: false; emailId: string | null }

export async function sendWeeklyDigestForUser(
  userId: string,
  options?: { sample?: boolean },
): Promise<DigestResult> {
  const admin = createAdminClient()
  const user = await getDigestUser(userId)
  if (!user?.email) return { skipped: true, reason: 'missing_email' }

  const holdings = await getUserHoldings(userId, admin)
  if (holdings.length === 0) return { skipped: true, reason: 'no_holdings' }

  const data = await buildDigestData(user, holdings)
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY missing.')

  const resend = new Resend(apiKey)
  const subjectPrefix = options?.sample ? '[Sample] ' : ''
  const response = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Clarzo <onboarding@resend.dev>',
    to: user.email,
    subject: `${subjectPrefix}Your Clarzo this week - ${formatInr(data.netWorth)}`,
    html: buildWeeklyDigestHtml(data),
    text: buildWeeklyDigestText(data),
    headers: {
      'List-Unsubscribe': '<mailto:hello@clarzo.ai?subject=Unsubscribe%20from%20Clarzo%20weekly%20digest>',
    },
  })

  if (response.error) {
    const classification = classifyResendError(response.error.message)
    if (classification) {
      return { skipped: true, reason: classification, detail: response.error.message }
    }
    // Unknown Resend error — bubble up so the route can count + log it.
    throw new Error(response.error.message)
  }

  return { skipped: false, emailId: response.data?.id ?? null }
}

async function getDigestUser(userId: string): Promise<DigestUser | null> {
  const admin = createAdminClient()

  const [{ data: profile }, authResult] = await Promise.all([
    admin.from('profiles').select('name').eq('id', userId).maybeSingle(),
    admin.auth.admin.getUserById(userId),
  ])

  const authUser = authResult.data.user
  const email = authUser?.email
  if (!email) return null

  const rawName =
    (profile?.name as string | null | undefined) ??
    (authUser.user_metadata?.name as string | null | undefined) ??
    null

  return {
    id: userId,
    email,
    name: rawName,
  }
}

async function buildDigestData(user: DigestUser, holdings: EnrichedHolding[]): Promise<DigestData> {
  const summary = computePortfolioSummary(holdings)
  const insight = await generateDigestInsight(holdings)

  return {
    name: firstName(user.name) || 'there',
    netWorth: summary.netWorth,
    invested: summary.invested,
    pnl: summary.pnl,
    pnlPct: summary.pnlPct,
    holdingsCount: summary.count,
    insight,
  }
}

async function generateDigestInsight(holdings: EnrichedHolding[]): Promise<string> {
  const sectors = aggregateBySector(holdings).slices.slice(0, 3)
  const mcaps = aggregateByMcap(holdings).slices.slice(0, 3)
  const top = topHoldings(holdings, 5)

  try {
    const result = await generateText({
      model: chatModel,
      system:
        'You write concise portfolio observations for Indian retail investors. Never give buy/sell advice. Be specific, calm, and plain-English.',
      prompt: `Write ONE useful sentence for a weekly portfolio email.

Rules:
- Max 25 words.
- Mention a concrete number from the data.
- Do not recommend buying, selling, switching, or timing markets.
- Do not say "consult an advisor".

Portfolio data:
- Holdings: ${holdings.length}
- Top sectors: ${sectors.map((s) => `${s.label} ${s.pct.toFixed(0)}%`).join(', ') || 'Unavailable'}
- Market-cap mix: ${mcaps.map((s) => `${s.label} ${s.pct.toFixed(0)}%`).join(', ') || 'Unavailable'}
- Top holdings by value: ${top.map((h) => `${h.scheme_name} ${percentOfPortfolio(h, holdings).toFixed(0)}%`).join(', ')}`,
      maxOutputTokens: 80,
      temperature: 0.35,
      providerOptions: chatProviderOptions,
    })

    const clean = result.text.replace(/^["']|["']$/g, '').trim()
    if (clean) return clean
  } catch (error) {
    console.error('weekly digest insight generation failed:', error)
  }

  return fallbackInsight(holdings)
}

function fallbackInsight(holdings: EnrichedHolding[]): string {
  const sector = aggregateBySector(holdings).slices[0]
  if (sector) {
    return `${sector.label} is your largest sector exposure at ${sector.pct.toFixed(0)}% of your portfolio.`
  }

  const top = topHoldings(holdings, 1)[0]
  if (top) {
    return `${top.scheme_name} is your largest holding at ${percentOfPortfolio(top, holdings).toFixed(0)}% of your portfolio.`
  }

  return `You currently have ${holdings.length} holdings tracked in Clarzo.`
}

function percentOfPortfolio(holding: EnrichedHolding, holdings: EnrichedHolding[]) {
  const total = holdings.reduce((sum, h) => sum + h.current_value, 0)
  return total > 0 ? (holding.current_value / total) * 100 : 0
}

function buildWeeklyDigestText(data: DigestData): string {
  const pnlPrefix = data.pnl >= 0 ? '+' : '-'

  return `Clarzo

Hi ${data.name}, here's your week.

Net worth: ${formatInr(data.netWorth)}
All-time P/L: ${pnlPrefix}${formatInr(Math.abs(data.pnl))} (${data.pnlPct.toFixed(1)}%)
Holdings tracked: ${data.holdingsCount}

One thing worth knowing:
${data.insight}

Open Clarzo: https://app.clarzo.ai/dashboard
`
}

function buildWeeklyDigestHtml(data: DigestData): string {
  const pnlColor = data.pnl >= 0 ? '#34d399' : '#ef4444'
  const pnlPrefix = data.pnl >= 0 ? '+' : '-'
  const pnlArrow = data.pnl >= 0 ? '▲' : '▼'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Clarzo this week</title>
</head>
<body style="margin:0; padding:0; background:#040f0a; color:#e4f0e8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#040f0a; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px; font-family:'Book Antiqua',Palatino,'Palatino Linotype',Georgia,serif;">
          <tr>
            <td style="font-family:'Book Antiqua',Palatino,'Palatino Linotype',Georgia,serif; font-size:30px; color:#34d399; padding-bottom:8px;">Clarzo</td>
          </tr>
          <tr>
            <td style="color:#88b098; font-size:15px; padding-bottom:28px;">Hi ${escapeHtml(data.name)}, here's your week.</td>
          </tr>
          <tr>
            <td style="background:#071a10; border:1px solid #1a4a2e; border-radius:16px; padding:24px;">
              <div style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#88b098; margin-bottom:8px;">Net worth</div>
              <div style="font-family:'Book Antiqua',Palatino,'Palatino Linotype',Georgia,serif; font-size:38px; line-height:1.1;">${formatInr(data.netWorth)}</div>
              <div style="font-family:'Courier New',monospace; color:${pnlColor}; margin-top:10px; font-size:14px;">
                ${pnlArrow} ${pnlPrefix}${formatInr(Math.abs(data.pnl))} (${data.pnlPct.toFixed(1)}%) all-time
              </div>
              <div style="color:#88b098; font-size:13px; margin-top:8px;">${data.holdingsCount} holdings tracked</div>
            </td>
          </tr>
          <tr>
            <td style="height:16px;"></td>
          </tr>
          <tr>
            <td style="background:#0c2418; border:1px solid #34d399; border-radius:14px; padding:20px;">
              <div style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#34d399; margin-bottom:8px;">One thing worth knowing</div>
              <div style="font-size:16px; line-height:1.6;">${escapeHtml(data.insight)}</div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 0 20px;">
              <a href="https://app.clarzo.ai/dashboard" style="display:inline-block; background:#059669; color:#ffffff; padding:14px 30px; border-radius:999px; text-decoration:none; font-weight:600;">Open Clarzo</a>
            </td>
          </tr>
          <tr>
            <td style="color:#4a7a5a; font-size:12px; line-height:1.6; text-align:center;">
              You are receiving this because you uploaded a portfolio to Clarzo.<br />
              To stop these emails, reply with "stop".
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function firstName(name: string | null) {
  return name?.trim().split(/\s+/)[0] ?? ''
}

function formatInr(amount: number) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
