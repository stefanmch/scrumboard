import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email']

// Routes that should redirect to home if user is already authenticated
const authRoutes = ['/login', '/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get authentication status from cookies
  const accessToken = request.cookies.get('accessToken')
  const user = request.cookies.get('user')
  const isAuthenticated = !!(accessToken && user)

  // Check if the current route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // If user is authenticated and tries to access auth pages (login/register),
  // redirect to home page
  if (isAuthenticated && authRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If user is not authenticated and tries to access protected route,
  // redirect to login page
  if (!isAuthenticated && !isPublicRoute && pathname !== '/') {
    const loginUrl = new URL('/login', request.url)
    // Store the original URL to redirect back after login
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
  ],
}
