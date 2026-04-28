import { zerodhaParser } from './zerodha'
import { growwParser } from './groww'
import { manualPasteParser } from './manual'

export type ParsedHolding = {
  isin: string | null
  scheme_name: string
  units: number
  avg_cost: number | null
  current_price: number | null
  asset_type: 'stock' | 'mutual_fund'
  source: string
}

export type ParseResult = {
  success: boolean
  holdings: ParsedHolding[]
  errors: string[]
}

export const PARSERS = {
  zerodha: zerodhaParser,
  groww: growwParser,
  manual: manualPasteParser,
} as const

export type ParserSource = keyof typeof PARSERS
