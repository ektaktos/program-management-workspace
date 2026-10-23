import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    pages: { signIn: '/login' },
    callbacks: {
      authorized({ req, token }) {
        if (token) return true;
        // API calls get a 401 from the route itself instead of a login redirect.
        return req.nextUrl.pathname.startsWith('/api/');
      },
    },
  },
);

export const config = {
  matcher: ['/((?!login|signup|api/auth|_next|icons|manifest.json|sw.js|icon.svg|favicon.ico).*)'],
};
