import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/dashboard/Nav'
import { AnalyticsIdentity } from '@/components/analytics/AnalyticsIdentity'
import { FloatingAskClarzo } from '@/components/dashboard/FloatingAskClarzo'

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
    <div className="min-h-screen bg-canvas text-fg lg:flex">
      <AnalyticsIdentity user={{ id: user.id, email: user.email, name: profile?.name ?? null }} />
      <DashboardNav profile={{ name: profile?.name ?? null, email: user.email ?? null }} />
      <main className="flex-1 lg:overflow-y-auto">{children}</main>
      <FloatingAskClarzo />
    </div>
  )
}
