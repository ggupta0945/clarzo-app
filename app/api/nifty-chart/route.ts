import { NextRequest, NextResponse } from 'next/server'
import { fetchNifty, type NiftyRange } from '@/lib/nifty-data'

const VALID: NiftyRange[] = ['1mo', '3mo', '6mo', '1y']

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get('range') as NiftyRange | null
  const r: NiftyRange = range && VALID.includes(range) ? range : '6mo'
  const data = await fetchNifty(r)
  if (!data) {
    return NextResponse.json({ error: 'unavailable' }, { status: 502 })
  }
  return NextResponse.json(data)
}
