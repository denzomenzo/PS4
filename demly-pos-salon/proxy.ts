// proxy.ts (in project root)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// CHANGE THIS LINE: Replace "middleware" with "proxy"
export function proxy(request: NextRequest) {  // ✅ Changed from "middleware"
  // CRITICAL: Never modify API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // For all other routes, continue normally
  return NextResponse.next();
}

// Apply proxy to all routes
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
