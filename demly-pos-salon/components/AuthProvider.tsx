// components/AuthProvider.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Public paths that anyone can access (logged in or not)
        const publicPaths = [
          "/", 
          "/login", 
          "/register", 
          "/forgot-password", 
          "/reset-password", 
          "/pay", 
          "/success"
        ];
        
        // API routes should NEVER be redirected
        if (pathname.startsWith("/api/")) {
          setLoading(false);
          return;
        }
        
        const isPublicPath = publicPaths.includes(pathname);

        // Allow access to public paths regardless of auth status
        if (isPublicPath) {
          setLoading(false);
          return;
        }

        // For all dashboard routes (protected)
        if (pathname.startsWith("/dashboard")) {
          if (!session) {
            router.push("/login");
            return;
          }

          // Use RPC to check license (bypasses RLS)
          const { data: hasLicense, error } = await supabase
            .rpc('check_user_license', { p_user_id: session.user.id });

          console.log('🔍 License check result:', { hasLicense, error, pathname });

          if (error) {
            console.error('License check error:', error);
            // On error, assume no license
            router.push("/activate");
            return;
          }

          if (!hasLicense) {
            router.push("/activate");
            return;
          }

          // Has license, allow access
          setLoading(false);
          return;
        }

        // For /activate page
        if (pathname === "/activate") {
          if (!session) {
            router.push("/login");
            return;
          }

          // Use RPC to check if user already has license
          const { data: hasLicense } = await supabase
            .rpc('check_user_license', { p_user_id: session.user.id });

          console.log('🔍 Activate page - license check:', { hasLicense });

          if (hasLicense) {
            // Already has license, go to dashboard
            router.push("/dashboard");
            return;
          }

          // No license, stay on activate page
          setLoading(false);
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error("Auth check error:", error);
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed:', event);
      
      if (event === "SIGNED_OUT") {
        // Only redirect to home if user was on a protected route
        if (pathname.startsWith("/dashboard") || pathname === "/activate") {
          router.push("/");
        }
      }
      
      if (event === "SIGNED_IN") {
        // Don't auto-redirect, let the user flow naturally
        checkSession();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
