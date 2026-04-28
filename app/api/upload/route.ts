import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'
import { brokerCsvParser, manualPasteParser, type ParseResult } from '@/lib/parsers'
import { fuzzyMatchISINs } from '@/lib/fuzzy-match'

const MAX_BYTES = 5 * 1024 * 1024

// One-shot upload: parse the file or pasted text, fuzzy-match missing ISINs,
// insert holdings. No preview/confirm step — upload is the confirmation.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const pastedText = (formData.get('pasted') as string | null)?.trim() || null

  let parseResult: ParseResult
  let filename = 'pasted'
  let rawForAudit = ''

  if (file) {
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'file_too_large', message: 'File must be under 5MB.' },
        { status: 400 },
      )
    }
    filename = file.name
    const csvText = await fileToCsvText(file)
    rawForAudit = csvText
    parseResult = brokerCsvParser(csvText)
  } else if (pastedText) {
    rawForAudit = pastedText
    // If pasted text has an ISIN header, treat it as a broker CSV; otherwise
    // fall back to free-form manual parsing.
    parseResult = /\bISIN\b/i.test(pastedText)
      ? brokerCsvParser(pastedText)
      : manualPasteParser(pastedText)
  } else {
    return NextResponse.json({ error: 'no_input' }, { status: 400 })
  }

  await supabase.from('raw_uploads').insert({
    user_id: user.id,
    filename,
    raw_content: rawForAudit.slice(0, 50000),
    status: 'parsing',
  })

  if (!parseResult.success || parseResult.holdings.length === 0) {
    return NextResponse.json(
      {
        success: false,
        errors: parseResult.errors,
        message: "We couldn't read any holdings from that file. Try pasting them manually.",
      },
      { status: 400 },
    )
  }

  const namesNeedingISIN = parseResult.holdings.filter((h) => !h.isin).map((h) => h.scheme_name)
  const isinMap = await fuzzyMatchISINs(supabase, namesNeedingISIN)

  const toInsert = parseResult.holdings.map((h) => ({
    user_id: user.id,
    isin: h.isin ?? isinMap.get(h.scheme_name) ?? null,
    scheme_name: h.scheme_name,
    units: h.units,
    avg_cost: h.avg_cost,
    asset_type: h.asset_type,
    source: h.source,
    current_price: h.current_price ?? null,
    current_value_at_import: h.current_value ?? null,
  }))

  const { error } = await supabase.from('holdings').insert(toInsert)
  if (error) {
    console.error('Holdings insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const matched = toInsert.filter((h) => h.isin).length
  return NextResponse.json({
    success: true,
    inserted: toInsert.length,
    matched,
    unmatched: toInsert.length - matched,
  })
}

async function fileToCsvText(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  const isXlsx = name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsm')

  if (!isXlsx) return file.text()

  const buf = await file.arrayBuffer()
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' })
  const firstSheet = wb.SheetNames[0]
  if (!firstSheet) return ''
  return XLSX.utils.sheet_to_csv(wb.Sheets[firstSheet])
}
