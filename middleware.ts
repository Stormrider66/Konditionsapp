// middleware.ts
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { readJwtClaims, type AppClaims } from '@/lib/auth/jwt-claims'

type CachedAuthUser = { id: string; email: string | null; appMetadata: Record<string, unknown> | null } | null

/**
 * Resolve the Supabase service role key for edge-side tenant lookups.
 *
 * This key bypasses RLS and is used by middleware to resolve custom domains
 * and business membership. Silent fallback to the anon key used to be the
 * default — that was a footgun because it made the policy gates appear to
 * work locally while failing open in production. Fail fast instead.
 *
 * In local dev (`NODE_ENV !== 'production'`) we still tolerate a missing key
 * and fall back to anon so that contributors without a service key in their
 * `.env.local` can run the app; a loud warning is emitted once.
 */
let warnedMissingServiceKey = false
function resolveSupabaseServiceKey(): string {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceKey) return serviceKey

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required in production. Middleware ' +
        'cannot resolve tenants without it. Configure it in the Vercel ' +
        'environment and redeploy.'
    )
  }

  if (!warnedMissingServiceKey) {
    warnedMissingServiceKey = true
    console.warn(
      '[middleware] SUPABASE_SERVICE_ROLE_KEY missing — falling back to anon key for dev only.'
    )
  }

  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!anon) {
    throw new Error(
      'Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY is set.'
    )
  }
  return anon
}

// Middleware runs in the Edge runtime. `supabase.auth.getUser()` can be a major bottleneck
// under load because it may involve network I/O. Cache it briefly and dedupe in-flight
// lookups to avoid stampeding (especially for k6 which uses a single cookie across VUs).
const AUTH_USER_CACHE_TTL_MS = 60 * 1000
const authUserCache = new Map<string, { expiresAt: number; user: CachedAuthUser }>()
const authUserInFlight = new Map<string, Promise<CachedAuthUser>>()

// Custom domain → business slug cache (5-min TTL)
const DOMAIN_CACHE_TTL_MS = 5 * 60 * 1000
const domainSlugCache = new Map<string, { expiresAt: number; slug: string | null }>()

// BusinessMember → slug cache (1-min TTL, keyed by dbUserId)
const MEMBER_SLUG_CACHE_TTL_MS = 60 * 1000
const memberSlugCache = new Map<string, { expiresAt: number; slug: string | null }>()

/**
 * Get a user's primary business slug using the service role key (bypasses RLS).
 * This is necessary because the anon-key query fails when User.id ≠ auth.uid().
 */
async function getBusinessSlugForUser(dbUserId: string): Promise<string | null> {
  const nowMs = Date.now()
  const cached = memberSlugCache.get(dbUserId)
  if (cached && cached.expiresAt > nowMs) {
    return cached.slug
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = resolveSupabaseServiceKey()

    const res = await fetch(
      `${supabaseUrl}/rest/v1/BusinessMember?userId=eq.${encodeURIComponent(dbUserId)}&isActive=eq.true&select=Business!inner(slug,isActive)&order=createdAt.asc&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    )

    if (res.ok) {
      const rows = await res.json()
      if (rows?.length > 0) {
        const biz = rows[0].Business
        // Handle both object and array response formats
        const bizObj = Array.isArray(biz) ? biz[0] : biz
        if (bizObj?.isActive && bizObj?.slug) {
          memberSlugCache.set(dbUserId, {
            expiresAt: nowMs + MEMBER_SLUG_CACHE_TTL_MS,
            slug: bizObj.slug,
          })
          return bizObj.slug
        }
      }
    }
  } catch {
    // Lookup failed - fall through to return null
  }

  memberSlugCache.set(dbUserId, {
    expiresAt: nowMs + MEMBER_SLUG_CACHE_TTL_MS,
    slug: null,
  })
  return null
}

/**
 * Check if a user is an active member of a specific business (by slug).
 * Uses service role key to bypass RLS.
 */
async function isUserMemberOfBusiness(dbUserId: string, businessSlug: string): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = resolveSupabaseServiceKey()

    const res = await fetch(
      `${supabaseUrl}/rest/v1/BusinessMember?userId=eq.${encodeURIComponent(dbUserId)}&isActive=eq.true&select=id,Business!inner(slug,isActive)&Business.slug=eq.${encodeURIComponent(businessSlug)}&Business.isActive=eq.true&limit=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    )

    if (res.ok) {
      const rows = await res.json()
      return rows?.length > 0
    }
  } catch {
    // Lookup failed
  }
  return false
}

function safeGetOrigin(urlValue: string | null): string | null {
  if (!urlValue) return null

  try {
    return new URL(urlValue).origin
  } catch {
    return null
  }
}

function logApiCsrfDenial(
  reason: 'invalid_origin' | 'invalid_referer',
  request: NextRequest,
  context: {
    isCustomDomain: boolean
    originHeader: string | null
    refererHeader: string | null
    requestHost: string | null
    requestOrigin: string
  }
) {
  console.warn(
    JSON.stringify({
      host: context.requestHost,
      isCustomDomain: context.isCustomDomain,
      message: 'API CSRF check failed',
      method: request.method,
      originHeader: context.originHeader,
      pathname: request.nextUrl.pathname,
      reason,
      refererOrigin: safeGetOrigin(context.refererHeader),
      requestOrigin: context.requestOrigin,
      timestamp: new Date().toISOString(),
    })
  )
}

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
  'forgot-password',
  'reset-password',
  'for-athletes',
  'for-coaches',
  'for-gyms',
  'for-clubs',
  '_next',
  'my',
]

// Athlete routes that redirect to the business-scoped equivalent when
// the user has a primarySlug, and fall through to the legacy `/athlete/**`
// page when they don't (solo / direct-to-consumer tier).
//
// Coach and physio accounts always have a business (auto-provisioned at
// signup — see lib/personal-business.ts), so those routes redirect
// unconditionally and no allowlist is needed.
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
  '/athlete/predictions',
]

function allowsInAppCamera(pathname: string): boolean {
  return pathname === '/athlete/nutrition/scan' || pathname.endsWith('/athlete/nutrition/scan')
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(
  response: NextResponse,
  pathname: string,
  nonce: string,
): NextResponse {
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
    `${allowsInAppCamera(pathname) ? 'camera=(self)' : 'camera=()'}, microphone=(self), geolocation=(), interest-cohort=()`
  )

  // Content Security Policy.
  //
  // Production: per-request nonce + strict-dynamic. No 'unsafe-inline' in
  // script-src — Next.js picks up the x-nonce request header and stamps it
  // on the inline scripts it generates. Any new inline script must opt in
  // via the nonce helper in lib/csp.ts.
  //
  // Development: keep 'unsafe-inline' + 'unsafe-eval' so the Next dev
  // runtime / React refresh works without babysitting every HMR payload.
  const scriptSrc = isProd
    ? [
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        "'wasm-unsafe-eval'", // MediaPipe WASM (pose analysis)
        'https://cdn.jsdelivr.net',
      ].join(' ')
    : [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "'wasm-unsafe-eval'",
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
    return {
      id: user.id,
      email: user.email ?? null,
      appMetadata: (user.app_metadata ?? null) as Record<string, unknown> | null,
    }
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

  // Per-request CSP nonce. Thread it through the request headers so Server
  // Components (and Next's internal inline scripts) can read it via
  // `headers().get('x-nonce')`, and through the CSP response header so the
  // browser knows which inline scripts to trust.
  const cspNonce = crypto.randomUUID().replace(/-/g, '')
  request.headers.set('x-nonce', cspNonce)

  function finalizeResponse(res: NextResponse): NextResponse {
    res.headers.set('x-correlation-id', correlationId)
    res.headers.set('x-nonce', cspNonce)
    return addSecurityHeaders(res, pathname, cspNonce)
  }

  // =========================
  // Custom domain resolution (WHITE_LABEL)
  // =========================
  // If the request comes from a custom domain, resolve it to a business slug
  // and rewrite the URL to inject the slug as the first path segment.
  const requestHost = request.headers.get('host')?.split(':')[0] ?? null // strip port
  const defaultHost = request.nextUrl.hostname
  const isCustomDomain = Boolean(
    requestHost
    && requestHost !== defaultHost
    && requestHost !== 'localhost'
    && requestHost !== '127.0.0.1'
    && !requestHost.endsWith('.trainomics.app')
    && !requestHost.endsWith('.vercel.app')
  )

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
        const supabaseKey = resolveSupabaseServiceKey()
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
      logApiCsrfDenial('invalid_origin', request, {
        isCustomDomain,
        originHeader,
        refererHeader,
        requestHost,
        requestOrigin,
      })
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
          logApiCsrfDenial('invalid_referer', request, {
            isCustomDomain,
            originHeader,
            refererHeader,
            requestHost,
            requestOrigin,
          })
          return finalizeResponse(
            NextResponse.json({ error: 'Invalid referer' }, { status: 403 })
          )
        }
      } catch {
        // If referer is malformed, fail closed for browser-like requests (referer present)
        logApiCsrfDenial('invalid_referer', request, {
          isCustomDomain,
          originHeader,
          refererHeader,
          requestHost,
          requestOrigin,
        })
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
  const publicRoutes = ['/login', '/register', '/signup', '/', '/pricing', '/privacy', '/for-athletes', '/for-coaches', '/for-gyms', '/for-clubs', '/forgot-password', '/reset-password']
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/')) || pathname.startsWith('/coaches')

  // If not authenticated and trying to access protected route
  if (!supabaseUser && !isPublicRoute) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If authenticated, check role-based access
  if (supabaseUser) {
    // Prefer JWT-claim source when the custom_access_token_hook is wired up
    // (Phase 4). Falls back to the legacy email-based DB lookup otherwise so
    // we can roll the flag independently of the Supabase dashboard change.
    const useJwtClaims = process.env.USE_JWT_CLAIMS === 'true'
    let claims: AppClaims | null = useJwtClaims ? readJwtClaims(supabaseUser.appMetadata) : null

    if (!claims) {
      const { data: userData, error } = await supabase
        .from('User')
        .select('id, role, adminRole, selfAthleteClientId')
        .eq('email', supabaseUser.email!)
        .single()
      if (!error && userData) {
        claims = {
          dbUserId: userData.id,
          role: userData.role ?? null,
          adminRole: userData.adminRole ?? null,
          primarySlug: null,
          memberBusinessSlugs: [],
          selfAthleteClientId: userData.selfAthleteClientId ?? null,
        }
      }
    }

    if (claims) {
      const role = claims.role
      const dbUserId = claims.dbUserId
      // Prefer cheap claim lookup; fall back to DB helpers when the claim is
      // missing (e.g. flag off, hook disabled, or stale token).
      const lookupPrimarySlug = async () =>
        claims!.primarySlug ?? (await getBusinessSlugForUser(dbUserId))
      const lookupIsMember = async (slug: string) =>
        claims!.memberBusinessSlugs.includes(slug)
          ? true
          : await isUserMemberOfBusiness(dbUserId, slug)

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

        // Verify user is a member of this business (service role key bypasses RLS)
        const isMember = await lookupIsMember(businessSlug)

        if (!isMember) {
          // User is not a member of this business - redirect to their own business or home
          const userBusinessSlug = await lookupPrimarySlug()

          if (userBusinessSlug) {
            const newPath = pathname.replace(`/${businessSlug}/`, `/${userBusinessSlug}/`)
            return NextResponse.redirect(new URL(newPath, request.url))
          }

          // No business membership - redirect to home
          return NextResponse.redirect(new URL('/', request.url))
        }

        // User has access to this business route - continue
        return finalizeResponse(response)
      }

      // Cross-org routes (/my/*) — require COACH or ADMIN role
      if (pathname.startsWith('/my/')) {
        if (role !== 'COACH' && role !== 'ADMIN') {
          return NextResponse.redirect(new URL('/', request.url))
        }
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

        // Every coach has a business (auto-provisioned at signup).
        // Redirect every /coach/** hit to /{slug}/coach/**.
        const businessSlug = await lookupPrimarySlug()
        if (businessSlug) {
          const newPath = pathname.replace('/coach/', `/${businessSlug}/coach/`)
          return NextResponse.redirect(new URL(newPath, request.url))
        }
        // No slug — shouldn't happen post Phase 8. Send to marketing.
        return NextResponse.redirect(new URL('/', request.url))
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
            const athleteBusinessSlug = await lookupPrimarySlug()
            if (athleteBusinessSlug) {
              const newAthletePath = pathname.replace('/athlete/', `/${athleteBusinessSlug}/athlete/`)
              return NextResponse.redirect(new URL(newAthletePath, request.url))
            }
            // If no business membership, allow access to legacy routes
          }
        } else if ((role === 'COACH' || role === 'ADMIN') && athleteModeCookie) {
          // Coach/Admin in athlete mode - verify they have a self-athlete profile
          let selfAthleteClientId = claims.selfAthleteClientId
          if (!selfAthleteClientId) {
            const { data: userWithSelfAthlete } = await supabase
              .from('User')
              .select('selfAthleteClientId')
              .eq('id', dbUserId)
              .single()
            selfAthleteClientId = userWithSelfAthlete?.selfAthleteClientId ?? null
          }

          if (!selfAthleteClientId) {
            // No athlete profile set up - redirect to setup page under the coach's slug
            const slug = await lookupPrimarySlug()
            const target = slug ? `/${slug}/coach/settings/athlete-profile` : '/'
            return NextResponse.redirect(new URL(target, request.url))
          }

          // Redirect coach in athlete mode to business-scoped athlete routes
          const shouldRedirectCoachAthlete = ATHLETE_REDIRECT_ROUTES.some(
            (route) => pathname === route || pathname.startsWith(route + '/')
          )

          if (shouldRedirectCoachAthlete) {
            const coachBizSlug = await lookupPrimarySlug()
            if (coachBizSlug) {
              const newCoachAthletePath = pathname.replace('/athlete/', `/${coachBizSlug}/athlete/`)
              return NextResponse.redirect(new URL(newCoachAthletePath, request.url))
            }
          }
          // If no business membership, allow access to legacy routes
        } else if (role === 'COACH' || role === 'ADMIN') {
          // Coach/Admin NOT in athlete mode - redirect to coach dashboard under slug.
          const slug = await lookupPrimarySlug()
          return NextResponse.redirect(new URL(slug ? `/${slug}/coach/dashboard` : '/', request.url))
        } else {
          // Unknown role - redirect to home
          return NextResponse.redirect(new URL('/', request.url))
        }
      }

      if (pathname.startsWith('/admin')) {
        const adminRole = claims.adminRole
        if (role !== 'ADMIN' && !adminRole) {
          if (role === 'COACH') {
            const slug = await lookupPrimarySlug()
            return NextResponse.redirect(new URL(slug ? `/${slug}/coach/dashboard` : '/', request.url))
          }
          if (role === 'ATHLETE') {
            return NextResponse.redirect(new URL('/athlete/dashboard', request.url))
          }
          if (role === 'PHYSIO') {
            const slug = await lookupPrimarySlug()
            return NextResponse.redirect(new URL(slug ? `/${slug}/physio/dashboard` : '/', request.url))
          }
          return NextResponse.redirect(new URL('/', request.url))
        }
      }

      // Physio route protection
      if (pathname.startsWith('/physio')) {
        if (role !== 'PHYSIO' && role !== 'ADMIN') {
          if (role === 'COACH') {
            const slug = await lookupPrimarySlug()
            return NextResponse.redirect(new URL(slug ? `/${slug}/coach/dashboard` : '/', request.url))
          }
          if (role === 'ATHLETE') {
            return NextResponse.redirect(new URL('/athlete/dashboard', request.url))
          }
          return NextResponse.redirect(new URL('/', request.url))
        }

        // Every physio has a business (auto-provisioned at signup).
        const physioBusinessSlug = await lookupPrimarySlug()
        if (physioBusinessSlug) {
          const newPhysioPath = pathname.replace('/physio/', `/${physioBusinessSlug}/physio/`)
          return NextResponse.redirect(new URL(newPhysioPath, request.url))
        }
        return NextResponse.redirect(new URL('/', request.url))
      }

      // Redirect from login/register pages if authenticated (but allow access to /)
      if (pathname === '/login' || pathname === '/register') {
        if (role === 'ATHLETE') {
          const athleteLoginSlug = await lookupPrimarySlug()
          if (athleteLoginSlug) {
            return NextResponse.redirect(new URL(`/${athleteLoginSlug}/athlete/dashboard`, request.url))
          }
          return NextResponse.redirect(new URL('/athlete/dashboard', request.url))
        }
        if (role === 'COACH' || role === 'ADMIN') {
          const coachLoginSlug = await lookupPrimarySlug()
          if (coachLoginSlug) {
            return NextResponse.redirect(new URL(`/${coachLoginSlug}/coach/dashboard`, request.url))
          }
          return NextResponse.redirect(new URL('/', request.url))
        }
        if (role === 'PHYSIO') {
          const physioLoginSlug = await lookupPrimarySlug()
          if (physioLoginSlug) {
            return NextResponse.redirect(new URL(`/${physioLoginSlug}/physio/dashboard`, request.url))
          }
          // Physio with no slug — shouldn't happen post Phase 8.
          return NextResponse.redirect(new URL('/', request.url))
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
