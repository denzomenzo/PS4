// proxy.ts - FIXED VERSION
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes and required permissions - UPDATED to match new permission system
const protectedRoutes: Record<string, string> = {
  '/dashboard/customers': 'manage_customers',
  '/dashboard/display': 'access_display',
  '/dashboard/inventory': 'manage_inventory',
  '/dashboard/transactions': 'manage_transactions',
  '/dashboard/reports': 'view_reports',
  '/dashboard/settings': 'manage_settings',
  '/dashboard/hardware': 'manage_hardware',
  '/dashboard/card-terminal': 'manage_card_terminal',
  '/dashboard/appointments': 'access_pos', // Appointments uses POS access
  '/dashboard/apps': 'view_reports', // Apps uses reports permission
};

// Routes that should be accessible without any staff session
const publicRoutes = [
  '/dashboard/display',
  '/dashboard/first-time-setup',
  '/api/', // All API routes
  '/_next/', // Next.js internal routes
  '/favicon.ico',
];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const url = request.nextUrl.clone();
  
  console.log(`🔍 Proxy checking: ${pathname}`);
  
  // Skip public routes
  for (const publicRoute of publicRoutes) {
    if (pathname.startsWith(publicRoute)) {
      console.log(`✅ Public route: ${pathname}`);
      return NextResponse.next();
    }
  }
  
  // Skip static files
  if (pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|css|js)$/)) {
    return NextResponse.next();
  }
  
  // Get staff session from cookies
  const staffCookie = request.cookies.get('current_staff')?.value;
  
  // If no staff cookie, check if we're trying to access a protected route
  if (!staffCookie) {
    console.log(`🚫 No staff session for ${pathname}`);
    
    // Check if this is a protected route (excluding dashboard root)
    const isProtectedRoute = Object.keys(protectedRoutes).some(route => 
      pathname.startsWith(route)
    );
    
    if (isProtectedRoute) {
      console.log(`❌ Protected route without session: ${pathname}`);
      // Redirect to dashboard (which will show PIN modal)
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // For non-protected routes, allow access (dashboard will handle PIN)
    console.log(`➡️ Allowing ${pathname} without session`);
    return NextResponse.next();
  }
  
  // We have a staff cookie, parse it
  let staff;
  try {
    staff = JSON.parse(staffCookie);
    console.log(`👤 Staff session found: ${staff.name} (${staff.role})`);
  } catch (error) {
    console.error('❌ Invalid staff cookie:', error);
    // Clear invalid cookie and redirect to dashboard
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.delete('current_staff');
    return response;
  }
  
  // Check if current path is protected
  for (const [route, requiredPermission] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(route)) {
      console.log(`🔐 Checking ${pathname} against ${route} (requires ${requiredPermission})`);
      
      // Owners can access everything
      if (staff.role === 'owner') {
        console.log(`✅ Owner access granted to ${pathname}`);
        return NextResponse.next();
      }
      
      // Check specific permission
      const hasPerm = staff.permissions?.[requiredPermission];
      if (!hasPerm) {
        console.log(`❌ Permission denied: ${staff.name} lacks ${requiredPermission} for ${pathname}`);
        
        // Instead of redirecting to dashboard (which could cause loop),
        // redirect to a safe page or show error
        // For now, redirect to dashboard but with a flag to prevent PIN modal
        url.pathname = '/dashboard';
        url.searchParams.set('error', 'no_permission');
        return NextResponse.redirect(url);
      }
      
      console.log(`✅ Permission granted for ${pathname}`);
      return NextResponse.next();
    }
  }
  
  // For dashboard root, always allow if we have staff session
  if (pathname === '/dashboard') {
    console.log(`✅ Dashboard access granted for ${staff.name}`);
    return NextResponse.next();
  }
  
  // For all other routes, allow access if staff is logged in
  console.log(`➡️ Allowing ${pathname} for authenticated staff`);
  return NextResponse.next();
}

// Apply proxy to all routes
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
