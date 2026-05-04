import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// `/` is no longer a marketing landing — visitors go straight to login,
// signed-in users continue to the dashboard.
export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  redirect(user ? '/dashboard' : '/login')
}
