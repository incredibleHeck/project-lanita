import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Log the incoming request (Server-side logging)
  console.log(`[Proxy] ${request.method} ${request.nextUrl.pathname}`);

  // Example 1: Redirect /old-dashboard to /dashboard
  if (request.nextUrl.pathname === '/old-dashboard') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Example 2: Header manipulation
  // Add a custom header to all requests for debugging or tracking
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nextjs-proxy-version', '16.1.6');

  // Example 3: Conditional Logic based on cookies or other criteria
  // const token = request.cookies.get('token');
  // if (!token && request.nextUrl.pathname.startsWith('/protected')) {
  //   return NextResponse.redirect(new URL('/login', request.url));
  // }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
