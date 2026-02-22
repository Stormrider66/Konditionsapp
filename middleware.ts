// middleware.ts
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

type CachedAuthUser = { id: string; email: string | null } | null

// Middleware runs in the Edge runtime. `supabase.auth.getUser()` can be a major bottleneck
// under load because it may involve network I/O. Cache it briefly and dedupe in-flight
// lookups to avoid stampeding (especially for k6 which uses a single cookie across VUs).
const AUTH_USER_CACHE_TTL_MS = 60 * 1000
const authUserCache = new Map<string, { expiresAt: number; user: CachedAuthUser }>()
const authUserInFlight = new Map<string, Promise<CachedAuthUser>>()

// Custom domain → business slug cache (5-min TTL)
const DOMAIN_CACHE_TTL_MS = 5 * 60 * 1000
const domainSlugCache = new Map<string, { expiresAt: number; slug: string | null }>()

// Reserved top-level routes that are NOT business slugs
const RESERVED_ROUTES = [
  'api',
  'coach',
  'athlete',
  'physio',
  'admin',
  'login',
  'logout',
  'signup',
  'register',
  'pricing',
  'test',
  'tests',
  'clients',
  'teams',
  'programs',
  'report',
  'simple-test',
  'cycling-test',
  'pdf-demo',
  'design-preview',
  'dev',
  'for-athletes',
  'for-coaches',
  'for-gyms',
  'for-clubs',
  '_next',
]

// Coach routes that should be redirected to business-scoped routes
const COACH_REDIRECT_ROUTES = [
  '/coach/dashboard',
  '/coach/admin',
  '/coach/clients',
  '/coach/programs',
  '/coach/ai-studio',
  '/coach/hybrid-studio',
  '/coach/strength',
  '/coach/cardio',
  '/coach/ergometer-tests',
  '/coach/video-analysis',
  '/coach/monitoring',
  '/coach/live-hr',
  '/coach/analytics',
  '/coach/documents',
  '/coach/messages',
  '/coach/referrals',
  '/coach/settings',
  '/coach/injuries',
  '/coach/field-tests',
  '/coach/organizations',
]

// Athlete routes that should be redirected to business-scoped routes
const ATHLETE_REDIRECT_ROUTES = [
  '/athlete/dashboard',
  '/athlete/check-in',
  '/athlete/calendar',
  '/athlete/history',
  '/athlete/programs',
  '/athlete/wod',
  '/athlete/strength',
  '/athlete/cardio',
  '/athlete/hybrid',
  '/athlete/vbt',
  '/athlete/concept2',
  '/athlete/ergometer',
  '/athlete/video-analysis',
  '/athlete/profile',
  '/athlete/tests',
  '/athlete/lactate',
  '/athlete/messages',
  '/athlete/settings',
  '/athlete/body-composition',
  '/athlete/log-workout',
  '/athlete/workouts',
  '/athlete/injury-prevention',
  '/athlete/research',
  '/athlete/matches',
  '/athlete/subscription',
  '/athlete/onboarding',
  '/athlete/rehab',
]

// Physio routes that should be redirected to business-scoped routes
const PHYSIO_REDIRECT_ROUTES = [
  '/physio/dashboard',
  '/physio/athletes',
  '/physio/treatments',
  '/physio/rehab-programs',
  '/physio/screenings',
  '/physio/restrictions',
  '/physio/messages',
  '/physio/settings',
]

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  const isProd = process.env.NODE_ENV === 'production'

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // Enforce HTTPS in production (prefer setting this at your edge / reverse proxy too)
  if (isProd) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  // XSS protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Help prevent cross-origin shenanigans
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')

  // Restrict browser features
  response.headers.set(
    'Permissions-Policy',
    // Allow in-app audio recording (daily audio journal) while still disabling camera.
    'camera=(), microphone=(self), geolocation=(), interest-cohort=()'
  )

  // Content Security Policy (keep dev flexible; tighten in production)
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...(isProd ? [] : ["'unsafe-eval'"]),
    'https://cdn.jsdelivr.net',
  ].join(' ')

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `script-src ${scriptSrc}`, // MediaPipe from CDN; Next dev needs unsafe-eval
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Tailwind/inline styles + Google Fonts
      "img-src 'self' data: https: blob:",
      "media-src 'self' blob: https://*.supabase.co", // Allow video previews and Supabase media
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net", // MediaPipe WASM files
      "worker-src 'self' blob:", // MediaPipe web workers
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      ...(isProd ? ['upgrade-insecure-requests', 'block-all-mixed-content'] : []),
    ].join('; ')
  )

  return response
}

function buildAuthCacheKeyFromRequest(request: NextRequest): string {
  const cookieHeader = request.headers.get('cookie') || ''
  const supabaseSessionCookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('sb-') && part.includes('auth-token='))

  if (supabaseSessionCookie) {
    return `cookie:${supabaseSessionCookie}`
  }

  // Avoid unbounded keys; edge instances may handle many anonymous requests.
  return `cookie:${cookieHeader.slice(0, 256)}`
}

async function getSupabaseUserCached(
  request: NextRequest,
  supabase: ReturnType<typeof createServerClient>
): Promise<CachedAuthUser> {
  const cacheKey = buildAuthCacheKeyFromRequest(request)
  const nowMs = Date.now()
  const cached = authUserCache.get(cacheKey)
  if (cached && cached.expiresAt > nowMs) {
    return cached.user
  }

  const inFlight = authUserInFlight.get(cacheKey)
  if (inFlight) {
    return inFlight
  }

  const lookupPromise = (async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null
    return { id: user.id, email: user.email ?? null }
  })()

  authUserInFlight.set(cacheKey, lookupPromise)
  try {
    const resolved = await lookupPromise
    authUserCache.set(cacheKey, {
      expiresAt: nowMs + AUTH_USER_CACHE_TTL_MS,
      user: resolved,
    })
    return resolved
  } finally {
    authUserInFlight.delete(cacheKey)
  }
}

export async function middleware(request: NextRequest) {
  const perfT0 = Date.now()
  const pathname = request.nextUrl.pathname

  // Generate a correlation ID for end-to-end request tracing.
  // Propagate via request headers (for API routes / logger) and response headers (for clients).
  const correlationId = crypto.randomUUID()
  request.headers.set('x-correlation-id', correlationId)

  function finalizeResponse(res: NextResponse): NextResponse {
    res.headers.set('x-correlation-id', correlationId)
    return addSecurityHeaders(res)
  }

  // =========================
  // Custom domain resolution (WHITE_LABEL)
  // =========================
  // If the request comes from a custom domain, resolve it to a business slug
  // and rewrite the URL to inject the slug as the first path segment.
  const requestHost = request.headers.get('host')?.split(':')[0] // strip port
  const defaultHost = request.nextUrl.hostname
  const isCustomDomain = requestHost && requestHost !== defaultHost
    && requestHost !== 'localhost'
    && requestHost !== '127.0.0.1'
    && !requestHost.endsWith('.trainomics.app')
    && !requestHost.endsWith('.vercel.app')

  let customDomainSlug: string | null = null
  if (isCustomDomain && requestHost) {
    // Check domain cache
    const cached = domainSlugCache.get(requestHost)
    const nowMs = Date.now()
    if (cached && cached.expiresAt > nowMs) {
      customDomainSlug = cached.slug
    } else {
      // Look up domain via Supabase (Edge-compatible, no Prisma)
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const lookupRes = await fetch(
          `${supabaseUrl}/rest/v1/Business?customDomain=eq.${encodeURIComponent(requestHost)}&domainVerified=eq.true&isActive=eq.true&select=slug`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        )
        if (lookupRes.ok) {
          const rows = await lookupRes.json()
          customDomainSlug = rows?.[0]?.slug || null
        }
      } catch {
        // Domain lookup failed - continue without custom domain
      }
      domainSlugCache.set(requestHost, {
        expiresAt: Date.now() + DOMAIN_CACHE_TTL_MS,
        slug: customDomainSlug,
      })
    }

    // If we found a matching business, rewrite the URL to inject the slug
    if (customDomainSlug && !pathname.startsWith(`/${customDomainSlug}`)) {
      const newUrl = new URL(`/${customDomainSlug}${pathname}`, request.url)
      newUrl.search = request.nextUrl.search
      return NextResponse.rewrite(newUrl, {
        request: { headers: request.headers },
      })
    }
  }

  // =========================
  // API CSRF (same-origin) guard
  // =========================
  const isApiRoute = pathname.startsWith('/api')
  const isMutatingMethod =
    request.method === 'POST' ||
    request.method === 'PUT' ||
    request.method === 'PATCH' ||
    request.method === 'DELETE'

  // Exclude third-party webhooks from CSRF checks (they are authenticated via provider mechanisms)
  const isWebhookRoute =
    pathname === '/api/payments/webhook' ||
    pathname === '/api/integrations/strava/webhook' ||
    pathname === '/api/integrations/garmin/webhook' ||
    pathname === '/api/integrations/concept2/webhook'

  if (isApiRoute && isMutatingMethod && !isWebhookRoute) {
    const requestOrigin = request.nextUrl.origin
    const originHeader = request.headers.get('origin')
    const refererHeader = request.headers.get('referer')

    // Allow custom domain origins for CSRF check
    const isAllowedOrigin = originHeader === requestOrigin
      || (isCustomDomain && requestHost && originHeader === `https://${requestHost}`)

    // If Origin is present, enforce match (including custom domain)
    if (originHeader && !isAllowedOrigin) {
      return finalizeResponse(
        NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
      )
    }

    // If Origin is absent but Referer is present, enforce match
    if (!originHeader && refererHeader) {
      try {
        const refererOrigin = new URL(refererHeader).origin
        const isAllowedReferer = refererOrigin === requestOrigin
          || (isCustomDomain && requestHost && refererOrigin === `https://${requestHost}`)
        if (!isAllowedReferer) {
          return finalizeResponse(
            NextResponse.json({ error: 'Invalid referer' }, { status: 403 })
          )
        }
      } catch {
        // If referer is malformed, fail closed for browser-like requests (referer present)
        return finalizeResponse(
          NextResponse.json({ error: 'Invalid referer' }, { status: 403 })
        )
      }
    }
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Load-test auth bypass (local-only opt-in):
  // Allows k6 to avoid Supabase auth round-trips in middleware when explicitly enabled.
  const rawHost =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.host
  const hostnameFromHeaders = (() => {
    if (!rawHost) return request.nextUrl.hostname
    // Handle IPv6 host header format: "[::1]:3000"
    const ipv6 = rawHost.match(/^\[(.+)\](?::\d+)?$/)
    if (ipv6) return ipv6[1]
    return rawHost.split(':')[0]
  })()
  const loadTestBypassEnabled =
    hostnameFromHeaders === 'localhost' ||
    hostnameFromHeaders === '127.0.0.1' ||
    // k6 on Windows often targets IPv6 loopback to avoid connection-refused issues.
    hostnameFromHeaders === '::1'
  const loadTestSecret = process.env.LOAD_TEST_BYPASS_SECRET || 'local-k6-bypass-secret'
  const loadTestBypassEmail = process.env.LOAD_TEST_BYPASS_USER_EMAIL
  const incomingLoadTestSecret = request.headers.get('x-load-test-secret')
  if (
    isApiRoute &&
    loadTestBypassEnabled &&
    loadTestSecret &&
    incomingLoadTestSecret === loadTestSecret
  ) {
    const forwardedEmail = request.headers.get('x-auth-user-email') || loadTestBypassEmail
    if (!forwardedEmail) {
      return finalizeResponse(response)
    }
    const forwardedHeaders = new Headers(request.headers)
    forwardedHeaders.set('x-auth-user-email', forwardedEmail)
    const bypassResponse = NextResponse.next({
      request: {
        headers: forwardedHeaders,
      },
    })
    // Helps k6 verify bypass is active (only for local load tests).
    bypassResponse.headers.set('x-mw-bypass', '1')
    bypassResponse.headers.set('x-mw-ms', String(Math.max(0, Date.now() - perfT0)))
    return finalizeResponse(bypassResponse)
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired (cached to reduce edge->supabase calls under load).
  const supabaseUser = await getSupabaseUserCached(request, supabase)

  // For API routes, don't do page redirects/auth routing in middleware.
  // API handlers should return JSON 401/403 as appropriate.
  // Session refresh above ensures tokens are refreshed before API calls.
  if (isApiRoute) {
    return finalizeResponse(response)
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/signup', '/', '/pricing', '/privacy', '/for-athletes', '/for-coaches', '/for-gyms', '/for-clubs']
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/')) || pathname.startsWith('/coaches')

  // If not authenticated and trying to access protected route
  if (!supabaseUser && !isPublicRoute) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If authenticated, check role-based access
  if (supabaseUser) {
    // Query user role from Supabase (edge-compatible, no Prisma)
    const { data: userData, error } = await supabase
      .from('User')
      .select('role, adminRole')
      .eq('email', supabaseUser.email!)
      .single()

    if (!error && userData) {
      const role = userData.role

      // Check if this is a business-scoped route (e.g., /star-by-thomson/coach/dashboard or /star-by-thomson/athlete/dashboard or /star-by-thomson/physio/dashboard)
      const pathSegments = pathname.split('/').filter(Boolean)
      const firstSegment = pathSegments[0]
      const secondSegment = pathSegments[1]
      const isBusinessRoute =
        firstSegment &&
        !RESERVED_ROUTES.includes(firstSegment) &&
        (secondSegment === 'coach' || secondSegment === 'athlete' || secondSegment === 'physio')

      if (isBusinessRoute) {
        const businessSlug = firstSegment

        // Verify user is a member of this business
        const { data: membership, error: membershipError } = await supabase
          .from('BusinessMember')
          .select('id, Business!inner(slug, isActive)')
          .eq('userId', supabaseUser.id)
          .eq('isActive', true)
          .eq('Business.slug', businessSlug)
          .eq('Business.isActive', true)
          .limit(1)
          .single()

        if (membershipError || !membership) {
          // User is not a member of this business - redirect to their own business or login
          const { data: userMembership } = await supabase
            .from('BusinessMember')
            .select('Business!inner(slug)')
            .eq('userId', supabaseUser.id)
            .eq('isActive', true)
            .order('createdAt', { ascending: true })
            .limit(1)
            .single()

          if (userMembership && userMembership.Business) {
            const userBusinessSlug = Array.isArray(userMembership.Business)
              ? userMembership.Business[0]?.slug
              : (userMembership.Business as { slug: string }).slug

            if (userBusinessSlug) {
              // Redirect to user's own business
              const newPath = pathname.replace(`/${businessSlug}/`, `/${userBusinessSlug}/`)
              return NextResponse.redirect(new URL(newPath, request.url))
            }
          }

          // No business membership - redirect to login or home
          return NextResponse.redirect(new URL('/', request.url))
        }

        // User has access to this business route - continue
        return finalizeResponse(response)
      }

      // Role-based route protection
      if (pathname.startsWith('/coach')) {
        if (role !== 'COACH' && role !== 'ADMIN') {
          if (role === 'ATHLETE') {
            return NextResponse.redirect(new URL('/athlete/dashboard', request.url))
          }
          return NextResponse.redirect(new URL('/', request.url))
        }

        // Check if this coach route should redirect to business-scoped route
        const shouldRedirect = COACH_REDIRECT_ROUTES.some(
          (route) => pathname === route || pathname.startsWith(route + '/')
        )

        if (shouldRedirect) {
          // Get user's primary business membership
          const { data: membership } = await supabase
            .from('BusinessMember')
            .select('businessId, Business!inner(slug)')
            .eq('userId', supabaseUser.id)
            .eq('isActive', true)
            .order('createdAt', { ascending: true })
            .limit(1)
            .single()

          if (membership && membership.Business) {
            // Extract business slug - handle both object and array response formats
            const businessSlug = Array.isArray(membership.Business)
              ? membership.Business[0]?.slug
              : (membership.Business as { slug: string }).slug

            if (businessSlug) {
              // Build the new business-scoped path
              const newPath = pathname.replace('/coach/', `/${businessSlug}/coach/`)
              return NextResponse.redirect(new URL(newPath, request.url))
            }
          }
          // If no business membership, allow access to legacy routes
        }
      }

      if (pathname.startsWith('/athlete')) {
        // Check if coach/admin is in athlete mode
        const athleteModeCookie = request.cookies.get('athleteMode')?.value === 'true'

        if (role === 'ATHLETE') {
          // Standard athlete - existing logic for business redirect
          const shouldRedirectAthlete = ATHLETE_REDIRECT_ROUTES.some(
            (route) => pathname === route || pathname.startsWith(route + '/')
          )

          if (shouldRedirectAthlete) {
            // Get user's primary business membership
            const { data: athleteMembership } = await supabase
              .from('BusinessMember')
              .select('businessId, Business!inner(slug)')
              .eq('userId', supabaseUser.id)
              .eq('isActive', true)
              .order('createdAt', { ascending: true })
              .limit(1)
              .single()

            if (athleteMembership && athleteMembership.Business) {
              // Extract business slug - handle both object and array response formats
              const athleteBusinessSlug = Array.isArray(athleteMembership.Business)
                ? athleteMembership.Business[0]?.slug
                : (athleteMembership.Business as { slug: string }).slug

              if (athleteBusinessSlug) {
                // Build the new business-scoped path
                const newAthletePath = pathname.replace('/athlete/', `/${athleteBusinessSlug}/athlete/`)
                return NextResponse.redirect(new URL(newAthletePath, request.url))
              }
            }
            // If no business membership, allow access to legacy routes
          }
        } else if ((role === 'COACH' || role === 'ADMIN') && athleteModeCookie) {
          // Coach/Admin in athlete mode - verify they have a self-athlete profile
          const { data: userWithSelfAthlete } = await supabase
            .from('User')
            .select('selfAthleteClientId')
            .eq('id', supabaseUser.id)
            .single()

          if (!userWithSelfAthlete?.selfAthleteClientId) {
            // No athlete profile set up - redirect to setup page
            return NextResponse.redirect(new URL('/coach/settings/athlete-profile', request.url))
          }
          // Has athlete profile - allow access to athlete routes
        } else if (role === 'COACH' || role === 'ADMIN') {
          // Coach/Admin NOT in athlete mode - redirect to coach dashboard
          return NextResponse.redirect(new URL('/coach/dashboard', request.url))
        } else {
          // Unknown role - redirect to home
          return NextResponse.redirect(new URL('/', request.url))
        }
      }

      if (pathname.startsWith('/admin')) {
        const adminRole = userData.adminRole
        if (role !== 'ADMIN' && !adminRole) {
          if (role === 'COACH') {
            return NextResponse.redirect(new URL('/coach/dashboard', request.url))
          }
          if (role === 'ATHLETE') {
            return NextResponse.redirect(new URL('/athlete/dashboard', request.url))
          }
          if (role === 'PHYSIO') {
            return NextResponse.redirect(new URL('/physio/dashboard', request.url))
          }
          return NextResponse.redirect(new URL('/', request.url))
        }
      }

      // Physio route protection
      if (pathname.startsWith('/physio')) {
        if (role !== 'PHYSIO' && role !== 'ADMIN') {
          if (role === 'COACH') {
            return NextResponse.redirect(new URL('/coach/dashboard', request.url))
          }
          if (role === 'ATHLETE') {
            return NextResponse.redirect(new URL('/athlete/dashboard', request.url))
          }
          return NextResponse.redirect(new URL('/', request.url))
        }

        // Check if this physio route should redirect to business-scoped route
        const shouldRedirectPhysio = PHYSIO_REDIRECT_ROUTES.some(
          (route) => pathname === route || pathname.startsWith(route + '/')
        )

        if (shouldRedirectPhysio) {
          // Get user's primary business membership (or physio assignment business)
          const { data: physioMembership } = await supabase
            .from('BusinessMember')
            .select('businessId, Business!inner(slug)')
            .eq('userId', supabaseUser.id)
            .eq('isActive', true)
            .order('createdAt', { ascending: true })
            .limit(1)
            .single()

          if (physioMembership && physioMembership.Business) {
            // Extract business slug - handle both object and array response formats
            const physioBusinessSlug = Array.isArray(physioMembership.Business)
              ? physioMembership.Business[0]?.slug
              : (physioMembership.Business as { slug: string }).slug

            if (physioBusinessSlug) {
              // Build the new business-scoped path
              const newPhysioPath = pathname.replace('/physio/', `/${physioBusinessSlug}/physio/`)
              return NextResponse.redirect(new URL(newPhysioPath, request.url))
            }
          }
          // If no business membership, allow access to legacy routes
        }
      }

      // Redirect from login/register pages if authenticated (but allow access to /)
      if (pathname === '/login' || pathname === '/register') {
        if (role === 'ATHLETE') {
          // Try to redirect to business athlete dashboard
          const { data: athleteLoginMembership } = await supabase
            .from('BusinessMember')
            .select('Business!inner(slug)')
            .eq('userId', supabaseUser.id)
            .eq('isActive', true)
            .order('createdAt', { ascending: true })
            .limit(1)
            .single()

          if (athleteLoginMembership && athleteLoginMembership.Business) {
            const athleteLoginSlug = Array.isArray(athleteLoginMembership.Business)
              ? athleteLoginMembership.Business[0]?.slug
              : (athleteLoginMembership.Business as { slug: string }).slug

            if (athleteLoginSlug) {
              return NextResponse.redirect(new URL(`/${athleteLoginSlug}/athlete/dashboard`, request.url))
            }
          }
          // Fallback to legacy athlete dashboard if no business
          return NextResponse.redirect(new URL('/athlete/dashboard', request.url))
        }
        if (role === 'COACH' || role === 'ADMIN') {
          // Try to redirect to business dashboard
          const { data: membership } = await supabase
            .from('BusinessMember')
            .select('Business!inner(slug)')
            .eq('userId', supabaseUser.id)
            .eq('isActive', true)
            .order('createdAt', { ascending: true })
            .limit(1)
            .single()

          if (membership && membership.Business) {
            const businessSlug = Array.isArray(membership.Business)
              ? membership.Business[0]?.slug
              : (membership.Business as { slug: string }).slug

            if (businessSlug) {
              return NextResponse.redirect(new URL(`/${businessSlug}/coach/dashboard`, request.url))
            }
          }
          // Fallback to homepage if no business membership
          return NextResponse.redirect(new URL('/', request.url))
        }
        if (role === 'PHYSIO') {
          // Try to redirect to business physio dashboard
          const { data: physioLoginMembership } = await supabase
            .from('BusinessMember')
            .select('Business!inner(slug)')
            .eq('userId', supabaseUser.id)
            .eq('isActive', true)
            .order('createdAt', { ascending: true })
            .limit(1)
            .single()

          if (physioLoginMembership && physioLoginMembership.Business) {
            const physioLoginSlug = Array.isArray(physioLoginMembership.Business)
              ? physioLoginMembership.Business[0]?.slug
              : (physioLoginMembership.Business as { slug: string }).slug

            if (physioLoginSlug) {
              return NextResponse.redirect(new URL(`/${physioLoginSlug}/physio/dashboard`, request.url))
            }
          }
          // Fallback to legacy physio dashboard if no business
          return NextResponse.redirect(new URL('/physio/dashboard', request.url))
        }
      }
      // Allow authenticated users to access / - the page will show appropriate content
    }
  }

  // Add security headers to all responses
  return finalizeResponse(response)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
