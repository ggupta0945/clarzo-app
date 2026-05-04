'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  // Clear the holdings cache so a different account signing in next runs
  // through the upload gate fresh.
  const cookieStore = await cookies()
  cookieStore.delete('clz_has_holdings')
  redirect('/login')
}
