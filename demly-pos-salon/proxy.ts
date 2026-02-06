// proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes and required permissions - UPDATED to match new permission system
const protectedRoutes = {
  '/dashboard': 'access_pos',
  '/dashboard/customers': 'manage_customers',
  '/dashboard/display': 'access_display',
  '/dashboard/inventory': 'manage_inventory',
  '/dashboard/transactions': 'manage_transactions',  // FIXED: Changed from process_transactions
  '/dashboard/reports': 'view_reports',
  '/dashboard/settings': 'manage_settings',
  '/dashboard/hardware': 'manage_hardware',
  '/dashboard/card-terminal': 'manage_card_terminal',
  '/dashboard/appointments': 'access_pos', // Appointments uses POS access
  '/dashboard/apps': 'view_reports', // Apps uses reports permission
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
    if (pathname === route || (route !== '/dashboard' && pathname.startsWith(route))) {
      // Get staff session from cookies
      const staffCookie = request.cookies.get('current_staff')?.value;
      
      // No staff session = redirect to dashboard
      if (!staffCookie) {
        console.log(`🚫 No staff session for ${pathname}, redirecting to dashboard`);
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      try {
        const staff = JSON.parse(staffCookie);
        
        // Debug logging
        console.log(`🔐 Proxy checking ${pathname}`, {
          requiredPermission,
          staffRole: staff.role,
          hasPermission: staff.permissions?.[requiredPermission],
          allPermissions: staff.permissions
        });
        
        // Owners can access everything
        if (staff.role === 'owner') {
          console.log(`✅ Owner access granted to ${pathname}`);
          return NextResponse.next();
        }

        // Check permissions
        if (requiredPermission) {
          const hasPerm = staff.permissions?.[requiredPermission];
          if (!hasPerm) {
            console.log(`❌ Permission denied for ${pathname}: missing ${requiredPermission}`);
            return NextResponse.redirect(new URL('/dashboard', request.url));
          }
          
          console.log(`✅ Permission granted for ${pathname}: has ${requiredPermission}`);
          return NextResponse.next();
        }

      } catch (error) {
        console.error(`❌ Invalid session for ${pathname}:`, error);
        // Invalid session
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  // For dashboard root, just check if staff is logged in
  if (pathname === '/dashboard') {
    const staffCookie = request.cookies.get('current_staff')?.value;
    if (!staffCookie) {
      console.log('🚫 No staff session for dashboard root');
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // For all other routes, continue normally
  console.log(`➡️ No specific protection for ${pathname}, allowing access`);
  return NextResponse.next();
}

// Apply proxy to all routes
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
