import type { ParseResult, ParsedHolding } from './index'

// Parses free-form pasted lines like:
//   "HDFC Top 100 - 120 units @ 650"
//   "Nippon Small Cap Fund 50 89.5"
//   "ADANI ENERGY 75 @ 975"
export function manualPasteParser(text: string): ParseResult {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const holdings: ParsedHolding[] = []
  const errors: string[] = []

  for (const line of lines) {
    const match = line.match(
      /^(.+?)\s*[-,@]?\s*(\d+(?:\.\d+)?)\s*(?:units?|qty|shares?)?\s*[@x]?\s*₹?\s*(\d+(?:\.\d+)?)?$/i
    )

    if (!match) {
      errors.push(`Couldn't parse: "${line}"`)
      continue
    }

    const [, name, unitsStr, priceStr] = match
    const units = parseFloat(unitsStr)
    const avgCost = priceStr ? parseFloat(priceStr) : null

    if (!Number.isFinite(units) || units <= 0) {
      errors.push(`Invalid units in: "${line}"`)
      continue
    }

    holdings.push({
      isin: null,
      scheme_name: name.trim(),
      units,
      avg_cost: avgCost,
      current_price: null,
      current_value: null,
      asset_type: 'mutual_fund',
      source: 'manual',
    })
  }

  return { success: holdings.length > 0, holdings, errors }
}
