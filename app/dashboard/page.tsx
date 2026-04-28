import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user!.id)
    .single()

  return (
    <div className="p-10 max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
          Welcome, {profile?.name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-[#88b098]">Let&apos;s get your money in order.</p>
      </div>

      <div className="bg-[#071a10] border border-[#1a4a2e] rounded-2xl p-10 text-center">
        <div className="text-5xl mb-4">📊</div>
        <h2 className="text-2xl mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
          No portfolio yet
        </h2>
        <p className="text-[#88b098] mb-6 max-w-md mx-auto">
          Upload your Zerodha or Groww CSV to see your complete portfolio with insights.
        </p>

        <Link
          href="/dashboard/upload"
          className="inline-block bg-[#059669] hover:bg-[#0F6E56] text-white px-6 py-3 rounded-full font-medium transition"
        >
          Upload Portfolio →
        </Link>
      </div>
    </div>
  )
}
