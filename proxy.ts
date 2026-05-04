import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that a logged-in but holdings-less user should still be allowed to
// hit. Everything else under /dashboard/** redirects to /dashboard/upload
// until they ingest a portfolio. The /upload route itself is in here so the
// redirect doesn't loop, plus a couple of API endpoints the upload page
// depends on. Auth callback stays open so the OAuth round-trip can land.
const HOLDINGS_FREE_ROUTES = new Set<string>([
  '/dashboard/upload',
])
const HOLDINGS_FREE_PREFIXES = [
  '/api/upload',
  '/api/ask/clear',
  '/api/goals',
  '/auth/callback',
]

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // First-time gate: until the user ingests their portfolio, every dashboard
  // page is meaningless. Send them to /upload instead. We cache "has
  // holdings" in a cookie set by the upload route so we don't pay a DB
  // round-trip on every navigation after the first upload.
  if (
    user &&
    pathname.startsWith('/dashboard') &&
    !HOLDINGS_FREE_ROUTES.has(pathname) &&
    !HOLDINGS_FREE_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    const holdingsCookie = request.cookies.get('clz_has_holdings')?.value
    let hasHoldings = holdingsCookie === '1'

    if (!hasHoldings) {
      const { count } = await supabase
        .from('holdings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
      hasHoldings = (count ?? 0) > 0
      // Persist the result so subsequent navigations skip the lookup.
      response.cookies.set('clz_has_holdings', hasHoldings ? '1' : '0', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: hasHoldings ? 60 * 60 * 24 * 30 : 60, // 30d if true, 60s if false (so retries pick up after upload)
      })
    }

    if (!hasHoldings) {
      return NextResponse.redirect(new URL('/dashboard/upload', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg)$).*)'],
}
