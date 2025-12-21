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
          "/activate",
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

        // For protected routes (like /dashboard/*), check if user is logged in
        if (pathname.startsWith("/dashboard")) {
          if (!session) {
            router.push("/login");
            return;
          }

          // Check license for dashboard access
          const { data: license } = await supabase
            .from("licenses")
            .select("status")
            .eq("user_id", session.user.id)
            .eq("status", "active")
            .single();

          if (!license) {
            router.push("/activate");
            return;
          }
        }
        
        // If on activate page with valid license, redirect to dashboard
        if (pathname === "/activate" && session) {
          const { data: license } = await supabase
            .from("licenses")
            .select("status")
            .eq("user_id", session.user.id)
            .eq("status", "active")
            .single();

          if (license) {
            router.push("/dashboard");
            return;
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Auth check error:", error);
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes - but DON'T auto-redirect
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        // Only redirect to home if user was on a protected route
        if (pathname.startsWith("/dashboard")) {
          router.push("/");
        }
      }
      // REMOVED: Auto-redirect to dashboard on sign in
      // Users should stay where they are or be manually redirected
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
