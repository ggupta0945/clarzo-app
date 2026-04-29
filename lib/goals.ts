import { createClient } from '@/lib/supabase/server'

export type Goal = {
  id: string
  title: string
  target_amount: number
  target_year: number
  created_at: string
}

export async function getUserGoals(userId: string): Promise<Goal[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('goals')
    .select('id, title, target_amount, target_year, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return data ?? []
}
