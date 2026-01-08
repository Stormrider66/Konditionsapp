// middleware.ts
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

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
      "style-src 'self' 'unsafe-inline'", // Tailwind/inline styles
      "img-src 'self' data: https: blob:",
      "media-src 'self' blob: https://*.supabase.co", // Allow video previews and Supabase media
      "font-src 'self' data:",
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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

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

    // If Origin is present, enforce exact match (block 'null' too)
    if (originHeader && originHeader !== requestOrigin) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
      )
    }

    // If Origin is absent but Referer is present, enforce match
    if (!originHeader && refererHeader) {
      try {
        const refererOrigin = new URL(refererHeader).origin
        if (refererOrigin !== requestOrigin) {
          return addSecurityHeaders(
            NextResponse.json({ error: 'Invalid referer' }, { status: 403 })
          )
        }
      } catch {
        // If referer is malformed, fail closed for browser-like requests (referer present)
        return addSecurityHeaders(
          NextResponse.json({ error: 'Invalid referer' }, { status: 403 })
        )
      }
    }
  }

  // For API routes, don't do page redirects/auth routing in middleware.
  // API handlers should return JSON 401/403 as appropriate.
  if (isApiRoute) {
    return addSecurityHeaders(NextResponse.next())
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

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

  // Refresh session if expired
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser()

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/signup', '/']
  const isPublicRoute = publicRoutes.some((route) => pathname === route)

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
      .select('role')
      .eq('email', supabaseUser.email!)
      .single()

    if (!error && userData) {
      const role = userData.role

      // Role-based route protection
      if (pathname.startsWith('/coach')) {
        if (role !== 'COACH' && role !== 'ADMIN') {
          if (role === 'ATHLETE') {
            return NextResponse.redirect(new URL('/athlete/dashboard', request.url))
          }
          return NextResponse.redirect(new URL('/', request.url))
        }
      }

      if (pathname.startsWith('/athlete')) {
        if (role !== 'ATHLETE') {
          if (role === 'COACH' || role === 'ADMIN') {
            return NextResponse.redirect(new URL('/coach/dashboard', request.url))
          }
          return NextResponse.redirect(new URL('/', request.url))
        }
      }

      if (pathname.startsWith('/admin')) {
        if (role !== 'ADMIN') {
          if (role === 'COACH') {
            return NextResponse.redirect(new URL('/coach/dashboard', request.url))
          }
          if (role === 'ATHLETE') {
            return NextResponse.redirect(new URL('/athlete/dashboard', request.url))
          }
          return NextResponse.redirect(new URL('/', request.url))
        }
      }

      // Redirect from login/register pages if authenticated (but allow access to /)
      if (pathname === '/login' || pathname === '/register') {
        if (role === 'ATHLETE') {
          return NextResponse.redirect(new URL('/athlete/dashboard', request.url))
        }
        if (role === 'COACH' || role === 'ADMIN') {
          return NextResponse.redirect(new URL('/clients', request.url))
        }
      }
      // Allow authenticated users to access / - the page will show appropriate content
    }
  }

  // Add security headers to all responses
  return addSecurityHeaders(response)
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
