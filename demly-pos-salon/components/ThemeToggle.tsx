// components/ThemeToggle.tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";

export default function ThemeToggle() {
  const userId = useUserId();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // Load theme from localStorage first for instant feedback
    const savedTheme = localStorage.getItem("theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
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
  };

  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    applyTheme(newTheme);
    
    // Save to database if user is logged in
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

  return (
    <button
      onClick={toggleTheme}
      className="p-2 hover:bg-slate-800/50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5 text-amber-400" />
      ) : (
        <Moon className="w-5 h-5 text-slate-600" />
      )}
    </button>
  );
}