import { createClient } from '@/lib/supabase/server'
import { parseZerodha, parseGroww, parseManual, type ParsedHolding } from '@/lib/parsers'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ success: false, message: 'Invalid form data' }, { status: 400 })
  }

  const source = formData.get('source') as string

  let holdings: ParsedHolding[] = []

  try {
    if (source === 'manual') {
      const pasted = formData.get('pasted') as string
      if (!pasted?.trim()) {
        return Response.json({ success: false, message: 'No text provided' }, { status: 400 })
      }
      holdings = parseManual(pasted)
    } else {
      const file = formData.get('file') as File | null
      if (!file) {
        return Response.json({ success: false, message: 'No file provided' }, { status: 400 })
      }

      const MAX = 5 * 1024 * 1024
      if (file.size > MAX) {
        return Response.json({ success: false, message: 'File exceeds 5MB limit' }, { status: 400 })
      }

      const text = await file.text()
      holdings = source === 'zerodha' ? parseZerodha(text) : parseGroww(text)
    }
  } catch {
    return Response.json(
      { success: false, message: 'Failed to parse file. Check the format and try again.' },
      { status: 422 }
    )
  }

  // Fuzzy ISIN lookup for holdings that don't already have one
  const unmatched = holdings.filter((h) => !h.isin)
  if (unmatched.length > 0) {
    const { data: navRows } = await supabase
      .from('nav_latest')
      .select('isin, scheme_name')

    if (navRows && navRows.length > 0) {
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

      for (const holding of unmatched) {
        const needle = normalize(holding.scheme_name)
        let bestScore = 0
        let bestIsin: string | null = null

        for (const nav of navRows) {
          const haystack = normalize(nav.scheme_name ?? '')
          if (!haystack) continue

          // Sliding window overlap score
          const shorter = needle.length < haystack.length ? needle : haystack
          const longer  = needle.length < haystack.length ? haystack : needle
          let matches = 0
          for (let i = 0; i < shorter.length - 2; i++) {
            if (longer.includes(shorter.slice(i, i + 3))) matches++
          }
          const score = shorter.length > 2 ? matches / (shorter.length - 2) : 0

          if (score > bestScore) {
            bestScore = score
            bestIsin = nav.isin
          }
        }

        // Only accept matches above 60% overlap
        if (bestScore >= 0.6 && bestIsin) {
          holding.isin = bestIsin
        }
      }
    }
  }

  return Response.json({ success: true, holdings })
}
