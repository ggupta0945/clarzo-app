import { NextRequest, NextResponse } from 'next/server'
import * as pdfParse from 'pdf-parse'
// pdf-parse ships both ESM (no default) and CJS; grab whichever the bundler resolves
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdf: (buf: Buffer) => Promise<{ text: string; numpages: number }> = (pdfParse as any).default ?? pdfParse
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
const MAX_BYTES = 20 * 1024 * 1024 // 20MB

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'no_file' }, { status: 400 })
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'file_too_large', message: 'PDF must be under 20MB.' }, { status: 400 })
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer())
    const data = await pdf(buf)
    const text = data.text?.trim() ?? ''
    if (!text) {
      return NextResponse.json({ error: 'no_text', message: 'No readable text found in this PDF. It may be scanned/image-based.' }, { status: 422 })
    }
    return NextResponse.json({ text: text.slice(0, 20000), pages: data.numpages })
  } catch {
    return NextResponse.json({ error: 'parse_failed', message: 'Could not read this PDF.' }, { status: 422 })
  }
}
