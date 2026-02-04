// proxy.ts (in project root) - Updated with permission protection
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next-server';

// Define protected routes and required permissions
const protectedRoutes = {
  '/dashboard/transactions': 'transactions',
  '/dashboard/customers': 'customers',
  '/dashboard/display': 'display',
  '/dashboard/inventory': 'inventory',
  '/dashboard/reports': 'reports',
  '/dashboard/settings': 'settings',
  '/dashboard/hardware': 'hardware',
  '/dashboard/card-terminal': 'card_terminal',
};

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // CRITICAL: Never modify API routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Skip authentication for login page and display page
  const exemptPaths = [
    '/dashboard/display',
    '/dashboard/first-time-setup',
  ];
  
  if (exemptPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check if current path is protected
  for (const [route, requiredPermission] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(route)) {
      // Get staff session from cookies
      const staffCookie = request.cookies.get('current_staff')?.value;
      
      // No staff session = redirect to dashboard
      if (!staffCookie) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      try {
        const staff = JSON.parse(staffCookie);
        
        // Owners can access everything
        if (staff.role === 'owner') {
          return NextResponse.next();
        }

        // Check permissions
        if (requiredPermission) {
          const hasPerm = staff.permissions?.[requiredPermission];
          if (!hasPerm) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
          }
        }

      } catch (error) {
        // Invalid session
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
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
