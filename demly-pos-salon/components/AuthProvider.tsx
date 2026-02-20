// components/AuthProvider.tsx - FIXED VERSION
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
          "/privacy"
          "/terms"
          "/contact"  
          "/industries"
        
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

        // If no session, redirect to login (except for public paths)
        if (!session) {
          router.push("/login");
          return;
        }

        // For dashboard routes
        if (pathname.startsWith("/dashboard")) {
          // Allow first-time setup page without further checks
          if (pathname === "/dashboard/first-time-setup") {
            setLoading(false);
            return;
          }

          // Check license
          const { data: hasLicense, error } = await supabase
            .rpc('check_user_license', { p_user_id: session.user.id });

          if (error || !hasLicense) {
            router.push("/activate");
            return;
          }

          // Check if staff exists - with retry logic
          const { data: staffData } = await supabase
            .from("staff")
            .select("id")
            .eq("user_id", session.user.id)
            .limit(1);

          // If no staff exists, redirect to first-time setup
          if (!staffData || staffData.length === 0) {
            // Check if we just completed setup
            const justCompleted = sessionStorage.getItem('justCompletedSetup');
            if (justCompleted === 'true') {
              // Clear the flag and allow access
              sessionStorage.removeItem('justCompletedSetup');
              setLoading(false);
              return;
            }
            
            router.push("/dashboard/first-time-setup");
            return;
          }

          // All checks passed
          setLoading(false);
          return;
        }

        // For /activate page
        if (pathname === "/activate") {
          // Check if user already has license
          const { data: hasLicense } = await supabase
            .rpc('check_user_license', { p_user_id: session.user.id });

          if (hasLicense) {
            // Check if staff exists
            const { data: staffData } = await supabase
              .from("staff")
              .select("id")
              .eq("user_id", session.user.id)
              .limit(1);

            if (!staffData || staffData.length === 0) {
              router.push("/dashboard/first-time-setup");
            } else {
              router.push("/dashboard");
            }
            return;
          }

          // No license, stay on activate page
          setLoading(false);
          return;
        }

        // Default fallback
        setLoading(false);
      } catch (error) {
        console.error("Auth check error:", error);
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        if (pathname.startsWith("/dashboard") || pathname === "/activate") {
          router.push("/");
        }
      }
      
      if (event === "SIGNED_IN") {
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

