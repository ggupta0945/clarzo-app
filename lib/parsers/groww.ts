import Papa from 'papaparse'
import type { ParseResult, ParsedHolding } from './index'

// Groww exports vary by section:
// - Stocks: "Stock Name,ISIN,Quantity,Average Price,Current Price,Invested,Current Value"
// - Mutual funds: "Scheme Name,ISIN,Folio Number,Units,Average NAV,Current NAV,..."
// We locate the real header by finding the first line containing "ISIN".
export function growwParser(text: string): ParseResult {
  const errors: string[] = []
  const lines = text.split(/\r?\n/)

  const headerIdx = lines.findIndex((l) => /\bISIN\b/i.test(l))
  if (headerIdx === -1) {
    return {
      success: false,
      holdings: [],
      errors: ['Could not find a header row containing "ISIN". Is this a Groww export?'],
    }
  }

  const headerLine = lines[headerIdx]
  const looksLikeMF = /scheme|fund|nav/i.test(headerLine)
  const assetType: ParsedHolding['asset_type'] = looksLikeMF ? 'mutual_fund' : 'stock'

  const tableText = lines.slice(headerIdx).join('\n')
  const parsed = Papa.parse<Record<string, string>>(tableText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  if (parsed.errors.length > 0) {
    errors.push(...parsed.errors.map((e) => e.message))
  }

  const holdings: ParsedHolding[] = []

  for (const row of parsed.data) {
    const name = pick(row, ['Stock Name', 'Scheme Name', 'Fund Name', 'Name'])
    const isin = pick(row, ['ISIN'])
    const units = num(pick(row, ['Quantity', 'Units']))
    const avgCost = num(pick(row, ['Average Price', 'Average Buy Price', 'Avg Price', 'Average NAV', 'Avg NAV']))
    const currentPrice = num(pick(row, ['Current Price', 'Closing Price', 'Current NAV', 'NAV']))

    if (!name || units <= 0) continue

    holdings.push({
      isin: isin?.trim() || null,
      scheme_name: name.trim(),
      units,
      avg_cost: avgCost > 0 ? avgCost : null,
      current_price: currentPrice > 0 ? currentPrice : null,
      asset_type: assetType,
      source: 'groww',
    })
  }

  if (holdings.length === 0) {
    errors.push('Found a header row but no holdings rows could be parsed.')
  }

  return { success: holdings.length > 0, holdings, errors }
}

function pick(row: Record<string, string>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return undefined
}

function num(v: string | undefined): number {
  if (!v) return 0
  const cleaned = v.replace(/[,₹\s]/g, '')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}
