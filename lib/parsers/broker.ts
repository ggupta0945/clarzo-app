import Papa from 'papaparse'
import type { ParseResult, ParsedHolding } from './index'

// Single parser for broker exports (Zerodha Console, Groww Stocks, Coin MF, etc).
// All of them follow the same shape:
//   - some preamble of metadata rows (Name, dates, summary block)
//   - a header row containing "ISIN" plus columns for name/units/price
//   - data rows
// We locate the header dynamically and extract via a flexible column picker
// so a single parser handles every broker.
export function brokerCsvParser(text: string): ParseResult {
  const errors: string[] = []
  const lines = text.split(/\r?\n/)

  const headerIdx = lines.findIndex((l) => /\bISIN\b/i.test(l))
  if (headerIdx === -1) {
    return {
      success: false,
      holdings: [],
      errors: ['Could not find a header row with "ISIN". Is this a broker holdings export?'],
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
    const name = pick(row, ['Stock Name', 'Scheme Name', 'Fund Name', 'Instrument', 'Tradingsymbol', 'Symbol', 'Name'])
    const isin = pick(row, ['ISIN'])
    const units = num(pick(row, ['Quantity', 'Qty', 'Units']))
    const avgCost = num(pick(row, [
      'Average buy price', 'Average Buy Price', 'Avg buy price',
      'Average Price', 'Avg Price', 'Avg cost', 'Avg. cost',
      'Average NAV', 'Avg NAV',
    ]))
    const currentPrice = num(pick(row, [
      'Closing price', 'Closing Price',
      'Current Price', 'LTP', 'Last traded price',
      'Current NAV', 'NAV',
    ]))
    const currentValue = num(pick(row, ['Closing value', 'Closing Value', 'Current Value', 'Market Value']))

    if (!name || units <= 0) continue
    if (name.toLowerCase().includes('total')) continue

    holdings.push({
      isin: isin?.trim() || null,
      scheme_name: name.trim(),
      units,
      avg_cost: avgCost > 0 ? avgCost : null,
      current_price: currentPrice > 0 ? currentPrice : null,
      current_value: currentValue > 0 ? currentValue : null,
      asset_type: assetType,
      source: 'broker',
    })
  }

  if (holdings.length === 0) {
    errors.push('Found a header but no rows could be read.')
  }

  return { success: holdings.length > 0, holdings, errors }
}

function pick(row: Record<string, string>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k]
    if (v !== undefined && v !== null && v !== '') return v
  }
  // case-insensitive fallback
  const lowerMap = new Map(Object.keys(row).map((k) => [k.toLowerCase(), k]))
  for (const k of keys) {
    const original = lowerMap.get(k.toLowerCase())
    if (original) {
      const v = row[original]
      if (v !== undefined && v !== null && v !== '') return v
    }
  }
  return undefined
}

function num(v: string | undefined): number {
  if (!v) return 0
  const cleaned = v.replace(/[,₹\s]/g, '')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}
