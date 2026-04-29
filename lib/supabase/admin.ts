import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Service-role Supabase client. Bypasses RLS — only use from server-side
// trusted contexts like the Razorpay webhook handler, where the request is
// authenticated by HMAC signature, not a user session.
//
// Never import this into a client component or any code path that runs in
// the browser.
//
// We type the client with `any` for the Database generic on purpose: we
// don't generate Supabase types in this project, and without a Database
// generic supabase-js v2 narrows row types to `never`, breaking inserts.

let cached: SupabaseClient | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAdminClient(): SupabaseClient<any, 'public', any> {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY missing — set it in env vars.')
  }
  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cached
}
