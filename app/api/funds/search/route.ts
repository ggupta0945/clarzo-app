// Backing endpoint for the FundsSearchBar autocomplete. Public; reads
// only mf_schemes (world-readable). Limits to 12 rows so the dropdown
// stays compact.

import { NextRequest, NextResponse } from 'next/server'
import { searchSchemes } from '@/lib/mutual-funds/queries'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ results: [] })
  const results = await searchSchemes(q, 12)
  return NextResponse.json(
    { results },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    }
  )
}
