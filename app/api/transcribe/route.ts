import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })

  const form = await req.formData()
  const audio = form.get('audio') as File | null
  if (!audio) return NextResponse.json({ error: 'audio field required' }, { status: 400 })

  // Forward to Whisper
  const whisperForm = new FormData()
  whisperForm.append('file', audio, 'audio.webm')
  whisperForm.append('model', 'whisper-1')
  whisperForm.append('language', 'en')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: whisperForm,
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[transcribe] whisper error:', err)
    return NextResponse.json({ error: 'transcription failed' }, { status: 502 })
  }

  const data = await res.json() as { text: string }
  return NextResponse.json({ transcript: data.text })
}
