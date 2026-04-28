import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOut } from './actions'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-[#040f0a] text-[#e4f0e8] flex">
      <aside className="w-64 bg-[#071a10] border-r border-[#1a4a2e] p-6 flex flex-col">
        <div className="mb-10">
          <h1 className="text-2xl text-[#34d399]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Clarzo
          </h1>
        </div>

        <nav className="flex-1 space-y-1">
          <Link href="/dashboard" className="block px-4 py-2 rounded-lg hover:bg-[#0c2418] text-[#e4f0e8] transition">
            Dashboard
          </Link>
          <Link href="/dashboard/upload" className="block px-4 py-2 rounded-lg hover:bg-[#0c2418] text-[#88b098] transition">
            Upload Portfolio
          </Link>
          <Link href="/dashboard/ask" className="block px-4 py-2 rounded-lg hover:bg-[#0c2418] text-[#88b098] transition">
            Ask Clarzo
          </Link>
          <Link href="/dashboard/goals" className="block px-4 py-2 rounded-lg hover:bg-[#0c2418] text-[#88b098] transition">
            Goals
          </Link>
        </nav>

        <div className="border-t border-[#1a4a2e] pt-4">
          <div className="px-4 py-2 mb-2">
            <p className="text-sm text-[#e4f0e8] truncate">{profile?.name}</p>
            <p className="text-xs text-[#4a7a5a] truncate">{user.email}</p>
          </div>
          <form action={signOut}>
            <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-[#0c2418] text-[#88b098] text-sm transition">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
