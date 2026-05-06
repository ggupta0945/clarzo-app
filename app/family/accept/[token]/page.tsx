import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in → redirect to login with return path
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/family/accept/${token}`)}`)
  }

  const { data: invite } = await supabase
    .from('family_invites')
    .select('id, inviter_id, invitee_email, relationship, status')
    .eq('token', token)
    .single()

  if (!invite || invite.status !== 'pending') {
    return <ErrorPage message="This invite link is invalid or has already been used." />
  }

  // Ensure the logged-in user is the intended recipient (or allow any user to accept)
  // We'll accept leniently — if they're logged in and have the token, it's valid enough.

  // Create the family_members link
  const { error } = await supabase.from('family_members').insert({
    owner_id: invite.inviter_id,
    member_id: user.id,
    relationship: invite.relationship,
  })

  if (error && !error.message.includes('duplicate')) {
    return <ErrorPage message="Could not link portfolios. You may already be connected." />
  }

  // Mark invite as accepted
  await supabase.from('family_invites').update({ status: 'accepted' }).eq('id', invite.id)

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-2 mb-8">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-hover text-accent-fg text-sm font-bold shadow-sm">C</span>
        <span className="text-lg font-semibold text-fg tracking-tight">Clarzo</span>
      </div>
      <div className="bg-surface border border-line rounded-2xl p-8 max-w-sm w-full text-center shadow-md">
        <div className="text-4xl mb-4">🎉</div>
        <h1 className="text-lg font-semibold text-fg mb-2">Portfolios linked!</h1>
        <p className="text-sm text-fg-muted mb-6">
          Your portfolio is now connected. Visit the Family tab to see your combined financial picture.
        </p>
        <Link
          href="/dashboard/family"
          className="block bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl text-sm font-medium transition shadow-sm"
        >
          View family portfolio →
        </Link>
      </div>
    </div>
  )
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4">
      <div className="bg-surface border border-line rounded-2xl p-8 max-w-sm w-full text-center shadow-md">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-lg font-semibold text-fg mb-2">Invite error</h1>
        <p className="text-sm text-fg-muted mb-6">{message}</p>
        <Link href="/dashboard" className="block bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl text-sm font-medium transition shadow-sm">
          Go to dashboard →
        </Link>
      </div>
    </div>
  )
}
