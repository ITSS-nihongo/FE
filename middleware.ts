import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')
  const { pathname } = request.nextUrl

  // Debug log
  console.log('🔥 MIDDLEWARE RUNNING:', {
    pathname,
    hasToken: !!token,
    timestamp: new Date().toISOString()
  })

  // Public routes (không cần auth)
  const publicRoutes = ['/login', '/register', '/forgot-password', '/dashboard', '/search', '/places']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Auth routes (đã login thì không cho vào)
  const authRoutes = ['/login', '/register']
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // Protected routes (cần auth) - profile, favorites, và recommendations
  const protectedRoutes = ['/profile', '/favorites', '/recommendations', '/admin']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Nếu đã có token và đang ở auth routes -> redirect về dashboard
  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Nếu không có token và đang ở protected routes -> redirect về login
  if (!token && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Root path: redirect dựa vào token và role
  if (pathname === '/') {
    if (token) {
      // Decode token to check user role
      try {
        const tokenValue = token.value
        const payload = JSON.parse(atob(tokenValue.split('.')[1]))
        const userRole = payload.role
        
        // Admin goes to admin page, others to dashboard
        if (userRole === 'ADMIN') {
          return NextResponse.redirect(new URL('/admin/users', request.url))
        } else {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      } catch (error) {
        console.error('Error decoding token in middleware:', error)
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}
