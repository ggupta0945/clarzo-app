import { generateObject } from 'ai'
import { z } from 'zod'
import { geminiModel } from '@/lib/ai'
import type { ParseResult, ParsedHolding } from '@/lib/parsers'

// Vision-based extraction for PDFs and images. The CSV/xlsx parser handles
// structured exports; this fallback handles broker statement PDFs, screenshots
// of holdings pages, WhatsApp-forwarded images, etc.

const HoldingSchema = z.object({
  scheme_name: z.string().describe('Stock ticker, mutual fund scheme name, or instrument name as shown'),
  isin: z.string().nullable().describe('ISIN code if visible (12 chars, alphanumeric), else null'),
  units: z.number().describe('Quantity of shares or mutual fund units held'),
  avg_cost: z.number().nullable().describe('Average buy price per unit, else null'),
  current_price: z.number().nullable().describe('Current/closing price per unit, else null'),
  current_value: z.number().nullable().describe('Total current market value of this holding, else null'),
  asset_type: z.enum(['stock', 'mutual_fund']).describe('"stock" for equity/ETFs, "mutual_fund" for MFs'),
})

const ResponseSchema = z.object({
  holdings: z.array(HoldingSchema),
  notes: z.string().optional().describe('Anything ambiguous or skipped'),
})

const PROMPT = `You are reading an Indian investor's portfolio statement. Extract every holding row.

Rules:
- Only include actual holdings rows. Skip summary/total rows.
- Numbers are in INR. Strip commas and currency symbols before returning.
- If a column isn't visible for a row, return null — do not guess.
- ISIN is a 12-character alphanumeric code (e.g. INE0CW301015). If it isn't shown, return null.
- "asset_type" must be "stock" for equities/ETFs and "mutual_fund" for mutual fund schemes.
- Return numbers as numbers, not strings.

If you can't read any holdings, return an empty array.`

export async function extractHoldingsFromFile(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  const mediaType = file.type || guessMediaType(file.name)

  try {
    const { object } = await generateObject({
      model: geminiModel,
      schema: ResponseSchema,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'file', data: bytes, mediaType },
          ],
        },
      ],
      temperature: 0,
    })

    const holdings: ParsedHolding[] = object.holdings
      .filter((h) => h.scheme_name && h.units > 0)
      .map((h) => ({
        isin: normalizeIsin(h.isin),
        scheme_name: h.scheme_name.trim(),
        units: h.units,
        avg_cost: h.avg_cost,
        current_price: h.current_price,
        current_value: h.current_value,
        asset_type: h.asset_type,
        source: 'ai',
      }))

    return {
      success: holdings.length > 0,
      holdings,
      errors: holdings.length === 0 ? ['AI could not read any holdings from this file.'] : [],
    }
  } catch (e) {
    console.error('AI extract error:', e)
    return {
      success: false,
      holdings: [],
      errors: [`AI extraction failed: ${e instanceof Error ? e.message : 'unknown error'}`],
    }
  }
}

function normalizeIsin(v: string | null): string | null {
  if (!v) return null
  const cleaned = v.trim().toUpperCase()
  return /^[A-Z0-9]{12}$/.test(cleaned) ? cleaned : null
}

function guessMediaType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() ?? ''
  switch (ext) {
    case 'pdf': return 'application/pdf'
    case 'png': return 'image/png'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'webp': return 'image/webp'
    case 'heic': return 'image/heic'
    default: return 'application/octet-stream'
  }
}
