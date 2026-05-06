import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import crypto from 'crypto'

// Lazy init — Resend throws if the API key is missing at module evaluation time
function getResend() { return new Resend(process.env.RESEND_API_KEY) }

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { email, relationship } = await req.json() as { email: string; relationship: string }
  if (!email?.includes('@')) return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  if (email.toLowerCase() === user.email?.toLowerCase()) {
    return NextResponse.json({ error: 'cannot_invite_yourself' }, { status: 400 })
  }

  const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single()
  const inviterName = profile?.name ?? user.email ?? 'Someone'

  const token = crypto.randomBytes(32).toString('hex')
  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://clarzo.ai'

  const { error: dbErr } = await supabase.from('family_invites').insert({
    inviter_id: user.id,
    invitee_email: email,
    token,
    relationship: relationship || 'family',
    status: 'pending',
  })
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  const acceptUrl = `${origin}/family/accept/${token}`

  try {
    await getResend().emails.send({
      from: 'Clarzo <noreply@clarzo.ai>',
      to: email,
      subject: `${inviterName} invited you to their Clarzo family portfolio`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a2e;">
          <div style="margin-bottom: 24px;">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #444ce7, #6172f3); color: white; font-weight: 700; font-size: 16px;">C</span>
          </div>
          <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 8px;">You&apos;re invited to a family portfolio</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">
            <strong>${inviterName}</strong> has invited you to link your Clarzo portfolio with theirs as <em>${relationship || 'family'}</em>.
            Together you&apos;ll get a combined net worth view and shared financial insights.
          </p>
          <a href="${acceptUrl}" style="display: inline-block; background: #444ce7; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 600;">
            Accept invite →
          </a>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
            This link expires in 7 days. If you don&apos;t have a Clarzo account, you&apos;ll be prompted to create one.
          </p>
        </div>
      `,
    })
  } catch (emailErr) {
    console.error('family invite email error:', emailErr)
    // Don't fail the request — the DB record is created; user can resend later
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: invites } = await supabase
    .from('family_invites')
    .select('id, invitee_email, relationship, status, created_at')
    .eq('inviter_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ invites: invites ?? [] })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await req.json() as { id: string }
  await supabase.from('family_invites').delete().eq('id', id).eq('inviter_id', user.id)
  return NextResponse.json({ ok: true })
}
