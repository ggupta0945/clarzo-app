// SEBI category taxonomy + heuristics to derive (category, sub_category) from
// raw AMFI scheme names. AMFI's NAVAll feed groups schemes under section
// headers like "Equity Scheme - Large Cap Fund" but the parser-friendly
// derivation is by name tokens, since individual rows don't carry the header.

import type { MfPlan, MfOption } from './types'

export type SebiCategory =
  | 'Equity'
  | 'Debt'
  | 'Hybrid'
  | 'Solution Oriented'
  | 'Other'
  | 'Index'
  | 'ETF'
  | 'Fund of Funds'

// Curated SEBI sub-categories. Used both for inference and for the
// category landing pages (display order matters here).
export const SUB_CATEGORIES: Record<SebiCategory, string[]> = {
  Equity: [
    'Large Cap',
    'Large & Mid Cap',
    'Mid Cap',
    'Small Cap',
    'Multi Cap',
    'Flexi Cap',
    'ELSS',
    'Focused',
    'Value',
    'Contra',
    'Dividend Yield',
    'Sectoral',
    'Thematic',
  ],
  Hybrid: [
    'Aggressive Hybrid',
    'Conservative Hybrid',
    'Balanced Advantage',
    'Multi Asset Allocation',
    'Equity Savings',
    'Arbitrage',
  ],
  Debt: [
    'Liquid',
    'Ultra Short Duration',
    'Low Duration',
    'Money Market',
    'Short Duration',
    'Medium Duration',
    'Medium to Long Duration',
    'Long Duration',
    'Dynamic Bond',
    'Corporate Bond',
    'Credit Risk',
    'Banking and PSU',
    'Floater',
    'Gilt',
    'Overnight',
  ],
  'Solution Oriented': ['Retirement', "Children's"],
  Index: ['Nifty 50 Index', 'Sensex Index', 'Nifty Next 50 Index', 'Other Index'],
  ETF: ['Equity ETF', 'Debt ETF', 'Gold ETF', 'Silver ETF', 'International ETF'],
  'Fund of Funds': ['Domestic FoF', 'International FoF'],
  Other: ['Other'],
}

// Token-driven inference from a scheme name. Order matters: more specific
// matches win. Returns null if nothing fits, in which case the caller should
// fall back to "Other".
export function inferCategory(name: string): {
  category: SebiCategory
  sub_category: string
} {
  const n = name.toLowerCase()

  // ETFs and Index funds first (they often also contain category words like "nifty 50")
  if (/\betf\b/.test(n)) {
    if (/gold/.test(n)) return { category: 'ETF', sub_category: 'Gold ETF' }
    if (/silver/.test(n)) return { category: 'ETF', sub_category: 'Silver ETF' }
    if (/nasdaq|s&p 500|hang seng|international|global|emerging|fang|us /.test(n))
      return { category: 'ETF', sub_category: 'International ETF' }
    if (/(g[- ]?sec|gilt|liquid|money market|bond|debt)/.test(n))
      return { category: 'ETF', sub_category: 'Debt ETF' }
    return { category: 'ETF', sub_category: 'Equity ETF' }
  }

  if (/fund of fund|fof\b/.test(n)) {
    return /international|global|us |overseas|nasdaq/.test(n)
      ? { category: 'Fund of Funds', sub_category: 'International FoF' }
      : { category: 'Fund of Funds', sub_category: 'Domestic FoF' }
  }

  if (/index/.test(n)) {
    if (/sensex/.test(n)) return { category: 'Index', sub_category: 'Sensex Index' }
    if (/next 50/.test(n)) return { category: 'Index', sub_category: 'Nifty Next 50 Index' }
    if (/nifty 50/.test(n)) return { category: 'Index', sub_category: 'Nifty 50 Index' }
    return { category: 'Index', sub_category: 'Other Index' }
  }

  // Solution-oriented
  if (/retirement|pension/.test(n))
    return { category: 'Solution Oriented', sub_category: 'Retirement' }
  if (/children|kids|gift/.test(n))
    return { category: 'Solution Oriented', sub_category: "Children's" }

  // Hybrid
  if (/balanced advantage|baf\b|dynamic asset/.test(n))
    return { category: 'Hybrid', sub_category: 'Balanced Advantage' }
  if (/aggressive hybrid|equity hybrid|balanced/.test(n))
    return { category: 'Hybrid', sub_category: 'Aggressive Hybrid' }
  if (/conservative hybrid|debt hybrid|monthly income|mip\b/.test(n))
    return { category: 'Hybrid', sub_category: 'Conservative Hybrid' }
  if (/multi asset/.test(n))
    return { category: 'Hybrid', sub_category: 'Multi Asset Allocation' }
  if (/equity savings/.test(n))
    return { category: 'Hybrid', sub_category: 'Equity Savings' }
  if (/arbitrage/.test(n))
    return { category: 'Hybrid', sub_category: 'Arbitrage' }

  // Debt
  if (/overnight/.test(n)) return { category: 'Debt', sub_category: 'Overnight' }
  if (/liquid/.test(n)) return { category: 'Debt', sub_category: 'Liquid' }
  if (/ultra short/.test(n)) return { category: 'Debt', sub_category: 'Ultra Short Duration' }
  if (/low duration/.test(n)) return { category: 'Debt', sub_category: 'Low Duration' }
  if (/money market/.test(n)) return { category: 'Debt', sub_category: 'Money Market' }
  if (/short duration|short term/.test(n))
    return { category: 'Debt', sub_category: 'Short Duration' }
  if (/medium to long/.test(n))
    return { category: 'Debt', sub_category: 'Medium to Long Duration' }
  if (/medium duration/.test(n)) return { category: 'Debt', sub_category: 'Medium Duration' }
  if (/long duration/.test(n)) return { category: 'Debt', sub_category: 'Long Duration' }
  if (/dynamic bond/.test(n)) return { category: 'Debt', sub_category: 'Dynamic Bond' }
  if (/corporate bond/.test(n)) return { category: 'Debt', sub_category: 'Corporate Bond' }
  if (/credit risk/.test(n)) return { category: 'Debt', sub_category: 'Credit Risk' }
  if (/banking and psu|banking & psu/.test(n))
    return { category: 'Debt', sub_category: 'Banking and PSU' }
  if (/floater|floating rate/.test(n)) return { category: 'Debt', sub_category: 'Floater' }
  if (/gilt|g[- ]?sec/.test(n)) return { category: 'Debt', sub_category: 'Gilt' }

  // Equity
  if (/elss|tax saver|tax saving/.test(n))
    return { category: 'Equity', sub_category: 'ELSS' }
  if (/flexi[- ]?cap/.test(n)) return { category: 'Equity', sub_category: 'Flexi Cap' }
  if (/multi[- ]?cap/.test(n)) return { category: 'Equity', sub_category: 'Multi Cap' }
  if (/large & mid|large and mid/.test(n))
    return { category: 'Equity', sub_category: 'Large & Mid Cap' }
  if (/large[- ]?cap|bluechip|top 100/.test(n))
    return { category: 'Equity', sub_category: 'Large Cap' }
  if (/mid[- ]?cap/.test(n)) return { category: 'Equity', sub_category: 'Mid Cap' }
  if (/small[- ]?cap/.test(n)) return { category: 'Equity', sub_category: 'Small Cap' }
  if (/focused/.test(n)) return { category: 'Equity', sub_category: 'Focused' }
  if (/value\b/.test(n)) return { category: 'Equity', sub_category: 'Value' }
  if (/contra/.test(n)) return { category: 'Equity', sub_category: 'Contra' }
  if (/dividend yield/.test(n))
    return { category: 'Equity', sub_category: 'Dividend Yield' }
  if (/banking|psu bank|financial services|infrastructure|pharma|healthcare|technology|it fund|it -|consumption|fmcg|energy|natural resources|esg|manufactur|defence|pharma|metal/.test(n))
    return { category: 'Equity', sub_category: 'Sectoral' }
  if (/business cycle|opportunit|special situations|innovation|leaders|emerging|consumption/.test(n))
    return { category: 'Equity', sub_category: 'Thematic' }

  return { category: 'Other', sub_category: 'Other' }
}

// Heuristic AMC short-name extraction. Most AMFI scheme names start with
// "<AMC name> Mutual Fund - ..." but a long tail of variants exists.
const AMC_TOKENS: Array<[RegExp, string, string]> = [
  [/^hdfc\b/i, 'HDFC', 'HDFC Mutual Fund'],
  [/^icici prudential|^icici\b/i, 'ICICI Prudential', 'ICICI Prudential Mutual Fund'],
  [/^sbi\b/i, 'SBI', 'SBI Mutual Fund'],
  [/^axis\b/i, 'Axis', 'Axis Mutual Fund'],
  [/^kotak\b/i, 'Kotak', 'Kotak Mahindra Mutual Fund'],
  [/^nippon (india|nip)/i, 'Nippon India', 'Nippon India Mutual Fund'],
  [/^aditya birla|^birla sun ?life|^absl\b/i, 'Aditya Birla SL', 'Aditya Birla Sun Life Mutual Fund'],
  [/^mirae\b/i, 'Mirae Asset', 'Mirae Asset Mutual Fund'],
  [/^uti\b/i, 'UTI', 'UTI Mutual Fund'],
  [/^dsp\b/i, 'DSP', 'DSP Mutual Fund'],
  [/^tata\b/i, 'Tata', 'Tata Mutual Fund'],
  [/^franklin (india|templeton)|^franklin\b/i, 'Franklin Templeton', 'Franklin Templeton Mutual Fund'],
  [/^canara robeco/i, 'Canara Robeco', 'Canara Robeco Mutual Fund'],
  [/^edelweiss\b/i, 'Edelweiss', 'Edelweiss Mutual Fund'],
  [/^parag parikh|^ppfas\b/i, 'PPFAS', 'PPFAS Mutual Fund'],
  [/^quant\b/i, 'Quant', 'Quant Mutual Fund'],
  [/^motilal oswal/i, 'Motilal Oswal', 'Motilal Oswal Mutual Fund'],
  [/^invesco\b/i, 'Invesco', 'Invesco Mutual Fund'],
  [/^bandhan\b|^idfc\b/i, 'Bandhan', 'Bandhan Mutual Fund'],
  [/^baroda bnp paribas|^bnp paribas|^baroda\b/i, 'Baroda BNP Paribas', 'Baroda BNP Paribas Mutual Fund'],
  [/^pgim\b/i, 'PGIM India', 'PGIM India Mutual Fund'],
  [/^sundaram\b/i, 'Sundaram', 'Sundaram Mutual Fund'],
  [/^lic\b/i, 'LIC', 'LIC Mutual Fund'],
  [/^union\b/i, 'Union', 'Union Mutual Fund'],
  [/^hsbc\b/i, 'HSBC', 'HSBC Mutual Fund'],
  [/^bank of india|^boi\b/i, 'Bank of India', 'Bank of India Mutual Fund'],
  [/^mahindra\b/i, 'Mahindra Manulife', 'Mahindra Manulife Mutual Fund'],
  [/^jm financial|^jm\b/i, 'JM Financial', 'JM Financial Mutual Fund'],
  [/^iti\b/i, 'ITI', 'ITI Mutual Fund'],
  [/^white oak|^whiteoak/i, 'WhiteOak Capital', 'WhiteOak Capital Mutual Fund'],
  [/^samco\b/i, 'Samco', 'Samco Mutual Fund'],
  [/^groww\b/i, 'Groww', 'Groww Mutual Fund'],
  [/^navi\b/i, 'Navi', 'Navi Mutual Fund'],
  [/^trust\b/i, 'Trust', 'Trust Mutual Fund'],
  [/^helios\b/i, 'Helios', 'Helios Mutual Fund'],
  [/^bajaj\b/i, 'Bajaj Finserv', 'Bajaj Finserv Mutual Fund'],
  [/^old bridge\b/i, 'Old Bridge', 'Old Bridge Mutual Fund'],
  [/^zerodha\b/i, 'Zerodha', 'Zerodha Mutual Fund'],
  [/^ng\b|^nj asset/i, 'NJ', 'NJ Mutual Fund'],
  [/^shriram\b/i, 'Shriram', 'Shriram Mutual Fund'],
]

export function inferAmc(name: string): { amc: string | null; full: string | null } {
  for (const [re, short, full] of AMC_TOKENS) {
    if (re.test(name)) return { amc: short, full }
  }
  return { amc: null, full: null }
}

export function inferPlanAndOption(name: string): {
  plan_type: MfPlan
  option_type: MfOption
} {
  const n = name.toLowerCase()
  const plan_type: MfPlan = /\bdirect\b/.test(n) ? 'Direct' : 'Regular'
  const option_type: MfOption = /idcw|dividend|payout|reinvest/.test(n) ? 'IDCW' : 'Growth'
  return { plan_type, option_type }
}

// Default benchmark by sub-category. Used only if AMFI / mfapi data doesn't
// supply one. These are widely-accepted defaults.
export const DEFAULT_BENCHMARK: Record<string, string> = {
  'Large Cap': 'NIFTY 100 TRI',
  'Large & Mid Cap': 'NIFTY LargeMidcap 250 TRI',
  'Mid Cap': 'NIFTY Midcap 150 TRI',
  'Small Cap': 'NIFTY Smallcap 250 TRI',
  'Multi Cap': 'NIFTY 500 Multicap 50:25:25 TRI',
  'Flexi Cap': 'NIFTY 500 TRI',
  ELSS: 'NIFTY 500 TRI',
  Focused: 'NIFTY 500 TRI',
  Value: 'NIFTY 500 TRI',
  Contra: 'NIFTY 500 TRI',
  'Dividend Yield': 'NIFTY 500 TRI',
  Sectoral: 'NIFTY 500 TRI',
  Thematic: 'NIFTY 500 TRI',
  'Aggressive Hybrid': 'CRISIL Hybrid 35+65 - Aggressive Index',
  'Balanced Advantage': 'NIFTY 50 Hybrid Composite Debt 50:50 Index',
  'Conservative Hybrid': 'CRISIL Hybrid 75+25 - Conservative Index',
  'Multi Asset Allocation': 'NIFTY 50 + NIFTY Composite Debt + Gold',
  'Equity Savings': 'NIFTY Equity Savings Index',
  Arbitrage: 'NIFTY 50 Arbitrage Index',
  Liquid: 'CRISIL Liquid Fund Index',
  'Nifty 50 Index': 'NIFTY 50 TRI',
  'Sensex Index': 'S&P BSE Sensex TRI',
  'Nifty Next 50 Index': 'NIFTY Next 50 TRI',
}
