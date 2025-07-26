import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit, handleAPIError, UnauthorizedError, ForbiddenError } from '@/lib/api-error-handler'

export async function middleware(req: NextRequest) {
  try {
    // Rate limiting for API routes
    if (req.nextUrl.pathname.startsWith('/api/')) {
      const identifier = req.ip || req.headers.get('x-forwarded-for') || 'anonymous';
      try {
        checkRateLimit(identifier, 100, 15 * 60 * 1000); // 100 requests per 15 minutes
      } catch (error) {
        return handleAPIError(error, req);
      }
    }

    let supabaseResponse = NextResponse.next({
      request: req,
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request: req,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Refresh session if expired - required for Server Components
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const { pathname } = req.nextUrl

    // Define protected routes that require authentication
    const protectedRoutes = ['/dashboard']
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

    // If user is signed in and trying to access public auth routes, redirect to dashboard
    if (session && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // If user is signed in and on home page, redirect to dashboard
    if (session && pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // If user is not signed in and trying to access protected routes, redirect to login
    if (!session && isProtectedRoute) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // For authenticated users accessing protected routes, validate tenant access
    if (session && isProtectedRoute) {
      try {
        // Get user profile to check tenant association
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('tenant_id, role')
          .eq('id', session.user.id)
          .single()

        if (error || !profile) {
          // User doesn't have a profile, redirect to login
          console.error('User profile not found:', error)
          return NextResponse.redirect(new URL('/login', req.url))
        }

        if (!profile.tenant_id) {
          console.error('User profile missing tenant_id')
          return NextResponse.redirect(new URL('/login', req.url))
        }

        // Add tenant context to the request headers for API routes and server components
        const requestHeaders = new Headers(req.headers)
        requestHeaders.set('x-tenant-id', profile.tenant_id)
        requestHeaders.set('x-user-role', profile.role)
        requestHeaders.set('x-user-id', session.user.id)

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
      } catch (error) {
        console.error('Middleware error:', error)
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    // For API routes, add tenant context if user is authenticated
    if (session && pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('tenant_id, role')
          .eq('id', session.user.id)
          .single()

        if (error) {
          throw new UnauthorizedError('User profile not found');
        }

        if (!profile) {
          throw new UnauthorizedError('User profile not found');
        }

        if (!profile.tenant_id) {
          throw new UnauthorizedError('User tenant information is missing');
        }

        const requestHeaders = new Headers(req.headers)
        requestHeaders.set('x-tenant-id', profile.tenant_id)
        requestHeaders.set('x-user-role', profile.role)
        requestHeaders.set('x-user-id', session.user.id)

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
      } catch (error) {
        console.error('API middleware error:', error)
        if (pathname.startsWith('/api/')) {
          return handleAPIError(error, req);
        }
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    return supabaseResponse
  } catch (error) {
    console.error('Middleware error:', error)
    
    // For API routes, return JSON error response
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return handleAPIError(error, req);
    }
    
    // For page routes, redirect to login
    return NextResponse.redirect(new URL('/login', req.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}