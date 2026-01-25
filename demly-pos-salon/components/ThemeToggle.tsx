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

  // Ensure component is mounted (client-side only)
  useEffect(() => {
    setMounted(true);
    
    // Check localStorage first
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      applyTheme(saved);
    }
    
    // Then load from database
    if (userId) loadTheme();
  }, [userId]);

  const loadTheme = async () => {
    const { data } = await supabase
      .from("settings")
      .select("theme_mode")
      .eq("user_id", userId)
      .single();
    
    if (data?.theme_mode) {
      setTheme(data.theme_mode);
      applyTheme(data.theme_mode);
    }
  };

  const applyTheme = (mode: "dark" | "light") => {
    const html = document.documentElement;
    
    if (mode === "light") {
      html.classList.remove("dark");
      html.classList.add("light");
    } else {
      html.classList.remove("light");
      html.classList.add("dark");
    }
    
    localStorage.setItem("theme", mode);
    
    // Update CSS custom properties
    document.documentElement.style.colorScheme = mode;
  };

  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    applyTheme(newTheme);
    
    // Save to database
    if (userId) {
      await supabase
        .from("settings")
        .upsert({
          user_id: userId,
          theme_mode: newTheme,
          updated_at: new Date().toISOString(),
        });
    }
  };

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-lg bg-muted animate-pulse"></div>
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
