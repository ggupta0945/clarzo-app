import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/dashboard/Nav'

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
    .select('name')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-[#040f0a] text-[#e4f0e8] lg:flex">
      <DashboardNav profile={{ name: profile?.name ?? null, email: user.email ?? null }} />
      <main className="flex-1 lg:overflow-y-auto">{children}</main>
    </div>
  )
}
