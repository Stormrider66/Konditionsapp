// middleware.ts
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
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

  const pathname = request.nextUrl.pathname

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/']
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

      // Redirect to appropriate dashboard from root if authenticated
      if (pathname === '/' || pathname === '/login' || pathname === '/register') {
        if (role === 'ATHLETE') {
          return NextResponse.redirect(new URL('/athlete/dashboard', request.url))
        }
        if (role === 'COACH' || role === 'ADMIN') {
          return NextResponse.redirect(new URL('/clients', request.url))
        }
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
