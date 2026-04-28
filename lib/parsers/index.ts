import { brokerCsvParser } from './broker'
import { manualPasteParser } from './manual'

export type ParsedHolding = {
  isin: string | null
  scheme_name: string
  units: number
  avg_cost: number | null
  current_price: number | null
  current_value: number | null
  asset_type: 'stock' | 'mutual_fund'
  source: string
}

export type ParseResult = {
  success: boolean
  holdings: ParsedHolding[]
  errors: string[]
}

export { brokerCsvParser, manualPasteParser }
