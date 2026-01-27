// components/ThemeToggle.tsx - UPDATED
"use client";

import { Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";

export default function ThemeToggle() {
  const userId = useUserId();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadTheme();
  }, []);

  const loadTheme = async () => {
    // First check localStorage for instant load
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }
    
    // Then load from database if user is logged in
    if (userId) {
      try {
        const { data } = await supabase
          .from("settings")
          .select("theme_mode")
          .eq("user_id", userId)
          .single();
        
        if (data?.theme_mode) {
          setTheme(data.theme_mode);
          applyTheme(data.theme_mode);
        }
      } catch (error) {
        console.error("Error loading theme:", error);
      }
    }
  };

  const applyTheme = (mode: "dark" | "light") => {
    const html = document.documentElement;
    
    // Remove both classes first
    html.classList.remove("dark", "light");
    // Add the correct class
    html.classList.add(mode);
    
    // Update localStorage
    localStorage.setItem("theme", mode);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        "content", 
        mode === "dark" ? "#0f172a" : "#ffffff"
      );
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    applyTheme(newTheme);
    
    // Save to database
    if (userId) {
      try {
        await supabase
          .from("settings")
          .upsert({
            user_id: userId,
            theme_mode: newTheme,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });
      } catch (error) {
        console.error("Error saving theme:", error);
      }
    }
  };

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-accent transition-colors border border-border"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5 text-amber-500" />
      ) : (
        <Moon className="w-5 h-5 text-slate-600" />
      )}
    </button>
  );
}
