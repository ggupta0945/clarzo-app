import Papa from 'papaparse'

export type ParsedHolding = {
  isin: string | null
  scheme_name: string
  units: number
  avg_cost: number | null
  asset_type: string
  source: string
}

type Row = Record<string, string>

function clean(v: string | undefined): string {
  return (v ?? '').trim().replace(/^["']|["']$/g, '')
}

function toNum(v: string | undefined): number | null {
  if (!v) return null
  const n = parseFloat(clean(v).replace(/[₹,\s]/g, ''))
  return isNaN(n) ? null : n
}

function findCol(row: Row, candidates: string[]): string | undefined {
  const keys = Object.keys(row)
  for (const c of candidates) {
    const match = keys.find((k) => k.trim().toLowerCase() === c.toLowerCase())
    if (match && clean(row[match])) return clean(row[match])
  }
  return undefined
}

function detectAssetType(name: string): string {
  const lower = name.toLowerCase()
  if (
    lower.includes('fund') ||
    lower.includes('scheme') ||
    lower.includes('etf') ||
    lower.includes('direct') ||
    lower.includes('growth') ||
    lower.includes('idcw')
  ) return 'mutual_fund'
  return 'stock'
}

// ── Zerodha ─────────────────────────────────────────────────────────────────
// Console holdings export columns:
//   Instrument / Tradingsymbol | ISIN | Qty / Quantity | Avg cost / Average Price
// Coin MF export columns:
//   Scheme Name / Fund Name | ISIN | Units | Avg NAV / Average NAV
export function parseZerodha(csv: string): ParsedHolding[] {
  const { data } = Papa.parse<Row>(csv, { header: true, skipEmptyLines: true })
  const results: ParsedHolding[] = []

  for (const row of data) {
    const name =
      findCol(row, ['Scheme Name', 'Fund Name', 'Instrument', 'Tradingsymbol', 'Name']) ?? ''
    if (!name) continue

    const units = toNum(findCol(row, ['Units', 'Qty', 'Quantity']))
    if (!units || units <= 0) continue

    const avg_cost = toNum(
      findCol(row, ['Avg NAV', 'Average NAV', 'Avg cost', 'Average Price', 'Avg Price'])
    )
    const isin = clean(findCol(row, ['ISIN']) ?? '') || null

    results.push({
      isin,
      scheme_name: name,
      units,
      avg_cost,
      asset_type: detectAssetType(name),
      source: 'zerodha',
    })
  }

  return results
}

// ── Groww ────────────────────────────────────────────────────────────────────
// MF export: Scheme Name | ISIN | Units | Average NAV
// Stocks:    Symbol / Stock Name | ISIN | Quantity | Average Price
export function parseGroww(csv: string): ParsedHolding[] {
  const { data } = Papa.parse<Row>(csv, { header: true, skipEmptyLines: true })
  const results: ParsedHolding[] = []

  for (const row of data) {
    const name =
      findCol(row, ['Scheme Name', 'Fund Name', 'Stock Name', 'Symbol', 'Name', 'Instrument']) ?? ''
    if (!name) continue

    const units = toNum(findCol(row, ['Units', 'Quantity', 'Qty']))
    if (!units || units <= 0) continue

    const avg_cost = toNum(
      findCol(row, ['Average NAV', 'Avg NAV', 'Average Price', 'Avg Price', 'Avg cost'])
    )
    const isin = clean(findCol(row, ['ISIN']) ?? '') || null

    results.push({
      isin,
      scheme_name: name,
      units,
      avg_cost,
      asset_type: detectAssetType(name),
      source: 'groww',
    })
  }

  return results
}

// ── Manual paste ─────────────────────────────────────────────────────────────
// Accepted formats (one per line):
//   HDFC Top 100 - 120 units @ ₹650
//   HDFC Top 100 | 120 | 650
//   HDFC Top 100, 120, 650
export function parseManual(text: string): ParsedHolding[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const results: ParsedHolding[] = []

  // Attempt CSV-style (comma or pipe separated) with ≥2 numeric-ish columns
  const csvAttempt = Papa.parse<string[]>(text, { skipEmptyLines: true })
  if (csvAttempt.data.length > 0 && csvAttempt.data[0].length >= 2) {
    const rows = csvAttempt.data as string[][]
    // Skip header row if first row has no numeric columns
    const start = toNum(rows[0][1]) === null ? 1 : 0
    for (const row of rows.slice(start)) {
      const name = clean(row[0])
      if (!name) continue
      const units = toNum(row[1])
      if (!units || units <= 0) continue
      const avg_cost = row[2] ? toNum(row[2]) : null
      results.push({ isin: null, scheme_name: name, units, avg_cost, asset_type: detectAssetType(name), source: 'manual' })
    }
    if (results.length > 0) return results
  }

  // Natural language: "Fund Name - X units @ ₹Y"
  for (const line of lines) {
    // Pattern: <name> - <units> units @ ₹<cost>
    const match = line.match(/^(.+?)\s*[-–|]\s*([\d.]+)\s*(?:units?)?\s*[@at]*\s*[₹]?\s*([\d.]+)?/i)
    if (match) {
      const name = clean(match[1])
      const units = toNum(match[2])
      const avg_cost = match[3] ? toNum(match[3]) : null
      if (name && units && units > 0) {
        results.push({ isin: null, scheme_name: name, units, avg_cost, asset_type: detectAssetType(name), source: 'manual' })
      }
    }
  }

  return results
}
