import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PARSERS, type ParserSource } from '@/lib/parsers'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const pastedText = formData.get('pasted') as string | null
  const source = formData.get('source') as ParserSource

  if (!source || !PARSERS[source]) {
    return NextResponse.json({ error: 'invalid_source' }, { status: 400 })
  }

  let text: string
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'file_too_large', message: 'File must be under 5MB.' }, { status: 400 })
    }
    text = await file.text()
  } else if (pastedText) {
    text = pastedText
  } else {
    return NextResponse.json({ error: 'no_input' }, { status: 400 })
  }

  await supabase.from('raw_uploads').insert({
    user_id: user.id,
    filename: file?.name || 'pasted',
    raw_content: text.slice(0, 50000),
    status: 'parsing',
  })

  const parser = PARSERS[source]
  const result = parser(text)

  if (!result.success || result.holdings.length === 0) {
    return NextResponse.json(
      {
        success: false,
        errors: result.errors,
        message: 'Could not parse any holdings. Try pasting manually.',
      },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    holdings: result.holdings,
    count: result.holdings.length,
    errors: result.errors,
  })
}
