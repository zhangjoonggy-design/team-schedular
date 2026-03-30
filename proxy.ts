import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for session token cookie (next-auth v5 uses authjs.session-token)
  const token =
    request.cookies.get('authjs.session-token')?.value ||
    request.cookies.get('__Secure-authjs.session-token')?.value

  const isLoggedIn = !!token

  if (!isLoggedIn && pathname !== '/login' && !pathname.startsWith('/api/auth') && !pathname.startsWith('/api/seed')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isLoggedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
